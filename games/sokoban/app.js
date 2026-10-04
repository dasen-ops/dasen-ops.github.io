/* Derived from LittleJS Sokoban, Copyright (c) 2026 Frank Force, MIT.
 * Exact upstream snapshot and attribution: SOURCE.md, source-sokoban.txt, LICENSE.
 * The original maps and grid / push / undo rules are reused below; UI is local DOM.
 */
(() => {
  'use strict';
  const EMPTY = 0, WALL = 1, FLOOR = 2, TARGET = 3, BOX = 4, BOX_ON_TARGET = 5;
  // A tiny replacement for the upstream engine's position helper.
  const vec2 = (x, y) => ({ x, y, copy() { return vec2(this.x, this.y); } });
  const max = Math.max;
  const SOURCE_LEVELS = [
    // Level 1 - Simple intro
    [
        "  #####",
        "###   #",
        "#.@$  #",
        "### $.#",
        "#.##$ #",
        "# # . ##",
        "#$ *$$.#",
        "#   .  #",
        "########"
    ],
    // Level 2
    [
        "######",
        "#    #",
        "# #@ #",
        "# $* #",
        "# .* #",
        "#    #",
        "######"
    ],
    // Level 3
    [
        "  ####",
        "###  ####",
        "#     $ #",
        "# #  #$ #",
        "# . .#@ #",
        "#########"
    ],
    // Level 4
    [
        "########",
        "#      #",
        "# .**$ #",
        "# .#   #",
        "# $  @##",
        "#  ####",
        "####"
    ],
    // Level 5
    [
        "  ######",
        "  #    #",
        "  # ##.#",
        "### # .#",
        "#  $  .#",
        "#   $# #",
        "## $   #",
        " #@  ###",
        " #####"
    ],
    // Level 6
    [
        "#######",
        "#     #",
        "# .$. #",
        "# $.$ #",
        "# .$. #",
        "# $.$ #",
        "#  @  #",
        "#######"
    ],
    // Level 7
    [
        "    #####",
        "    #   #",
        "    #$  #",
        "  ###  $##",
        "  #  $ $ #",
        "### # ## #   ######",
        "#   # ## #####  ..#",
        "# $  $          ..#",
        "##### ### #@##  ..#",
        "    #     #########",
        "    #######"
    ],
];
  const SOURCE_LEVEL_ORDER = [1, 2, 3, 4, 5, 0, 6];
  const LEVELS = SOURCE_LEVEL_ORDER.map(index => SOURCE_LEVELS[index]);
  const STORAGE_KEY = 'dyson-sokoban-v1';
  let currentLevel = 0, moves = 0, pushes = 0;
  let playerPos = vec2(0, 0), grid = [], gridWidth = 0, gridHeight = 0;
  let undoStack = [], levelComplete = false, gesture = null;
  let message = '', lastKeyboardMove = -Infinity;
  const board = document.getElementById('board');
  const levelSelect = document.getElementById('level-select');
  const undoButton = document.getElementById('undo-button');
  const restartButton = document.getElementById('restart-button');
  const nextButton = document.getElementById('next-button');
  const status = document.getElementById('game-status');
  const freshProgress = () => ({ version: 1, selectedLevel: 0, completed: {} });
  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 1) return freshProgress();
      const result = freshProgress();
      if (Number.isInteger(saved.selectedLevel) && saved.selectedLevel >= 0 && saved.selectedLevel < LEVELS.length) result.selectedLevel = saved.selectedLevel;
      if (saved.completed && typeof saved.completed === 'object') {
        for (let level = 1; level <= LEVELS.length; level++) {
          const entry = saved.completed[level];
          if (entry && Number.isInteger(entry.moves) && Number.isInteger(entry.pushes) && entry.moves > 0 && entry.pushes >= 0 && entry.pushes <= entry.moves) {
            result.completed[level] = { moves: entry.moves, pushes: entry.pushes };
          }
        }
      }
      return result;
    } catch (_) { return freshProgress(); }
  }
  let progress = readProgress();
  function saveProgress() {
    let persisted = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
    catch (_) {
      persisted = false;
      const note = document.getElementById('save-note');
      note.hidden = false;
      note.textContent = '这次可以正常玩；浏览器未允许保存，完成记录暂时留在这一页。';
    }
    window.dispatchEvent(new CustomEvent('dyson-site-change', { detail: { persisted } }));
    return persisted;
  }
  function recordCompletion() {
    const level = currentLevel + 1;
    const previous = progress.completed[level];
    if (!previous || pushes < previous.pushes || (pushes === previous.pushes && moves < previous.moves)) {
      progress.completed[level] = { moves, pushes };
    }
    const persisted = saveProgress();
    window.dispatchEvent(new CustomEvent('dyson-sokoban-complete', {
      detail: { level, moves, pushes, completed: Object.keys(progress.completed).length, total: LEVELS.length, persisted }
    }));
    if (typeof window.DysonCelebrate === 'function') window.DysonCelebrate();
  }

  // Upstream parsing, collision, move counting and undo logic, with engine audio removed.
function parseLevel(levelData)
{
    grid = [];
    gridWidth = 0;
    gridHeight = levelData.length;

    // Find max width
    for (const row of levelData)
        gridWidth = max(gridWidth, row.length);

    // Parse grid
    for (let y = 0; y < gridHeight; y++)
    {
        const row = levelData[gridHeight - 1 - y]; // Flip Y for LittleJS coords
        const gridRow = [];

        for (let x = 0; x < gridWidth; x++)
        {
            const char = x < row.length ? row[x] : ' ';
            let tile = EMPTY;

            switch(char)
            {
                case '#': tile = WALL; break;
                case ' ': tile = FLOOR; break;
                case '.': tile = TARGET; break;
                case '$': tile = BOX; break;
                case '*': tile = BOX_ON_TARGET; break;
                case '@':
                    tile = FLOOR;
                    playerPos = vec2(x, y);
                    break;
                case '+':
                    tile = TARGET;
                    playerPos = vec2(x, y);
                    break;
            }

            gridRow.push(tile);
        }
        grid.push(gridRow);
    }
}

function loadLevel(levelIndex)
{
    currentLevel = levelIndex % LEVELS.length;
    parseLevel(LEVELS[currentLevel]);
    moves = 0;
    pushes = 0;
    undoStack = [];
    levelComplete = false;

}

function getTile(x, y)
{
    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight)
        return WALL;
    return grid[y][x];
}

function setTile(x, y, tile)
{
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight)
        grid[y][x] = tile;
}

function isWalkable(tile)
{
    return tile === FLOOR || tile === TARGET;
}

function hasBox(tile)
{
    return tile === BOX || tile === BOX_ON_TARGET;
}

function saveState()
{
    const state = {
        playerPos: playerPos.copy(),
        grid: grid.map(row => row.slice()),
        moves: moves,
        pushes: pushes
    };
    undoStack.push(state);

    // Limit undo stack size
    if (undoStack.length > 1000)
        undoStack.shift();
}

function undo()
{
    if (undoStack.length === 0 || levelComplete)
        return false;

    const state = undoStack.pop();
    playerPos = state.playerPos;
    grid = state.grid;
    moves = state.moves;
    pushes = state.pushes;

    return true;
}

function tryMove(dx, dy)
{
    if (levelComplete)
        return false;

    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    const tile = getTile(newX, newY);

    // Can't walk into walls
    if (tile === WALL || tile === EMPTY)
        return false;

    // Check if there's a box to push
    if (hasBox(tile))
    {
        const pushX = newX + dx;
        const pushY = newY + dy;
        const pushTile = getTile(pushX, pushY);

        // Can only push into empty floor or target
        if (!isWalkable(pushTile))
            return false;

        // Save state for undo
        saveState();

        // Move the box
        const wasOnTarget = tile === BOX_ON_TARGET;
        const pushingOntoTarget = pushTile === TARGET;

        // Clear old box position
        setTile(newX, newY, wasOnTarget ? TARGET : FLOOR);

        // Place box in new position
        setTile(pushX, pushY, pushingOntoTarget ? BOX_ON_TARGET : BOX);

        // Move player
        playerPos = vec2(newX, newY);
        moves++;
        pushes++;


        // Check win condition
        checkWin();
        return true;
    }

    // Walking onto empty floor or target
    if (isWalkable(tile))
    {
        saveState();
        playerPos = vec2(newX, newY);
        moves++;
        return true;
    }

    return false;
}

function checkWin()
{
    // Check if all boxes are on targets
    for (let y = 0; y < gridHeight; y++)
    {
        for (let x = 0; x < gridWidth; x++)
        {
            if (grid[y][x] === BOX)
                return; // Found a box not on target
        }
    }

    // All boxes are on targets!
    levelComplete = true;
    recordCompletion();
}





  function render() {
    const fragment = document.createDocumentFragment();
    // Hide exterior padding visually without changing the upstream level rules.
    const exterior = new Set(), exteriorQueue = [];
    function markExterior(x, y) {
      const key = y * gridWidth + x;
      if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight || exterior.has(key) || grid[y][x] !== FLOOR) return;
      exterior.add(key); exteriorQueue.push({ x, y });
    }
    for (let x = 0; x < gridWidth; x++) { markExterior(x, 0); markExterior(x, gridHeight - 1); }
    for (let y = 0; y < gridHeight; y++) { markExterior(0, y); markExterior(gridWidth - 1, y); }
    for (let index = 0; index < exteriorQueue.length; index++) {
      const { x, y } = exteriorQueue[index];
      markExterior(x - 1, y); markExterior(x + 1, y); markExterior(x, y - 1); markExterior(x, y + 1);
    }
    let filled = 0, total = 0;
    for (let y = gridHeight - 1; y >= 0; y--) {
      for (let x = 0; x < gridWidth; x++) {
        const tile = grid[y][x], cell = document.createElement('span');
        cell.className = 'cell';
        cell.setAttribute('aria-hidden', 'true');
        if (tile === WALL) cell.classList.add('wall');
        if (exterior.has(y * gridWidth + x) || tile === EMPTY) cell.classList.add('void');
        if (tile === TARGET || tile === BOX_ON_TARGET) { cell.classList.add('target'); total++; }
        if (hasBox(tile)) {
          const box = document.createElement('span');
          box.className = 'box-piece' + (tile === BOX_ON_TARGET ? ' ready' : '');
          cell.appendChild(box);
          if (tile === BOX_ON_TARGET) filled++;
        }
        if (playerPos.x === x && playerPos.y === y) {
          const player = document.createElement('span');
          player.className = 'player-piece';
          cell.appendChild(player);
        }
        fragment.appendChild(cell);
      }
    }
    board.replaceChildren(fragment);
    board.style.setProperty('--columns', gridWidth);
    board.style.setProperty('--board-width', (gridWidth * 48 + 10) + 'px');
    board.style.setProperty('--tile-width', '32px');
    board.dataset.wide = String(gridWidth > 12);
    board.dataset.level = String(currentLevel + 1);
    board.dataset.complete = String(levelComplete);
    board.classList.toggle('is-complete', levelComplete);
    board.setAttribute('aria-label', '第' + (currentLevel + 1) + '关棋盘，走了' + moves + '步，推了' + pushes + '次，' + filled + '个箱子到位。用方向键移动。');
    document.getElementById('moves').textContent = moves;
    document.getElementById('pushes').textContent = pushes;
    document.getElementById('targets-filled').textContent = filled + ' / ' + total;
    document.getElementById('completed-count').textContent = '已完成 ' + Object.keys(progress.completed).length + ' / ' + LEVELS.length;
    const record = progress.completed[currentLevel + 1];
    document.getElementById('level-best').textContent = record ? '这关最佳记录：推了 ' + record.pushes + ' 次，走了 ' + record.moves + ' 步。' : '这关还没有完成，慢慢试就好。';
    undoButton.disabled = !undoStack.length || levelComplete;
    nextButton.disabled = !levelComplete;
    nextButton.textContent = currentLevel === LEVELS.length - 1 ? '回到第一关' : '下一关';
    document.querySelectorAll('[data-direction]').forEach(button => { button.disabled = levelComplete; });
    status.textContent = levelComplete ? (currentLevel === LEVELS.length - 1 ? '最后一关也完成啦！可以选关继续挑战。' : '太棒了！全部箱子到位，可以进入下一关啦。') : message;
    for (let index = 0; index < levelSelect.options.length; index++) {
      levelSelect.options[index].textContent = '第 ' + (index + 1) + ' 关' + (progress.completed[index + 1] ? ' ✓' : '');
    }
  }
  function setLevel(index) {
    if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) return;
    gesture = null;
    loadLevel(index);
    progress.selectedLevel = index;
    levelSelect.value = String(index);
    message = '把箱子推到圆点上。推错了，可以撤销。';
    saveProgress();
    render();
  }
  function move(dx, dy) {
    if (levelComplete) return;
    const changed = tryMove(dx, dy);
    message = changed ? '慢慢想，看看下一步往哪里走。' : '前面走不过去，换个方向试试。';
    render();
  }
  function takeBack() {
    if (undo()) { message = '退回上一步啦，换个办法试试。'; render(); }
  }
  const directions = { left: [-1, 0], up: [0, 1], down: [0, -1], right: [1, 0] };
  const activate = (button, callback) => {
    if (window.DysonSite && typeof window.DysonSite.onActivate === 'function') window.DysonSite.onActivate(button, callback);
    else button.addEventListener('click', callback);
  };
  document.querySelectorAll('[data-direction]').forEach(button => {
    activate(button, () => { move(...directions[button.dataset.direction]); board.focus({ preventScroll: true }); });
  });
  activate(undoButton, () => { takeBack(); board.focus({ preventScroll: true }); });
  activate(restartButton, () => { setLevel(currentLevel); board.focus({ preventScroll: true }); });
  activate(nextButton, () => { setLevel((currentLevel + 1) % LEVELS.length); board.focus({ preventScroll: true }); });
  LEVELS.forEach((level, index) => {
    const option = document.createElement('option'); option.value = index; levelSelect.appendChild(option);
  });
  levelSelect.addEventListener('change', () => setLevel(Number(levelSelect.value)));
  const keys = { ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down', ArrowRight: 'right', KeyA: 'left', KeyW: 'up', KeyS: 'down', KeyD: 'right' };
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('a,button,input,select,textarea,[contenteditable="true"],[role="button"]')) return;
    const direction = keys[event.code];
    if (direction) {
      event.preventDefault();
      if (event.repeat && performance.now() - lastKeyboardMove < 120) return;
      lastKeyboardMove = performance.now();
      move(...directions[direction]);
    } else if (['KeyZ', 'KeyU', 'Backspace'].includes(event.code)) {
      event.preventDefault(); takeBack();
    } else if (event.code === 'KeyR') { event.preventDefault(); setLevel(currentLevel); }
  });
  board.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    board.focus({ preventScroll: true });
    if (!['touch', 'pen'].includes(event.pointerType) || levelComplete) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    event.preventDefault();
    if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0);
    else move(0, -Math.sign(dy));
  });
  const cancelGesture = () => { gesture = null; };
  board.addEventListener('pointercancel', cancelGesture);
  board.addEventListener('lostpointercapture', cancelGesture);
  window.addEventListener('blur', cancelGesture);
  window.addEventListener('pagehide', cancelGesture);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelGesture(); });
  window.DysonSokoban = Object.freeze({
    storageKey: STORAGE_KEY,
    getState: () => ({ level: currentLevel + 1, sourceLevel: SOURCE_LEVEL_ORDER[currentLevel] + 1, moves, pushes, complete: levelComplete, player: { x: playerPos.x, y: playerPos.y }, grid: grid.map(row => row.slice()), completed: JSON.parse(JSON.stringify(progress.completed)) })
  });
  setLevel(progress.selectedLevel);
})();
