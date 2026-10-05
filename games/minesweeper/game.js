/*!
 * Minesweeper rules adapted from Frank Force's LittleJS Arcade.
 * Copyright (c) 2026 Frank Force. MIT License; full notice in ./LICENSE.
 * Fixed upstream commit: ea73cf7357854c913798390603045fdcb1f472e7.
 * Modified for Dyson's website, 2026-10-05: DOM garden board, smaller sizes,
 * explicit touch modes, keyboard access, win-count storage, guarded flood fill.
 * LittleJS rendering, menus, timers, sounds and saved rounds are omitted.
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'dyson-minesweeper-v1';
  const choices = { easy: { size: 6, mines: 5, name: '入门' }, hard: { size: 8, mines: 10, name: '挑战' } };
  const board = document.getElementById('mine-board');
  const status = document.getElementById('garden-status');
  const storageNote = document.getElementById('storage-note');
  const activate = window.DysonSite && window.DysonSite.onActivate
    ? window.DysonSite.onActivate : (button, action) => button.addEventListener('click', action);
  const validRecord = value => value && value.version === 1 && Object.prototype.hasOwnProperty.call(choices, value.difficulty) &&
    Number.isSafeInteger(value.wins) && value.wins >= 0 && value.wins < Number.MAX_SAFE_INTEGER;
  let record = { version: 1, difficulty: 'easy', wins: 0 };
  let readFailed = false;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (validRecord(saved)) record = { version: 1, difficulty: saved.difficulty, wins: saved.wins };
  } catch (_) { readFailed = true; /* A new garden works even when records cannot be read. */ }

  let boardW, boardH, mineCount, mines, nums, revealed, flagged;
  let firstClick, gameOver, gameWon, revealedCount, hitCell;
  let difficulty = record.difficulty, mode = 'reveal', focusIndex = 0;
  let generation = 0;
  let cells = [];
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < boardW && y < boardH;
  const idx = (x, y) => x + y * boardW;
  const randInt = limit => Math.floor(Math.random() * limit);
  const phase = () => gameWon ? 'won' : gameOver ? 'lost' : firstClick ? 'ready' : 'playing';
  const tell = (message, result = '') => { status.textContent = message; status.dataset.result = result; };
  function persist() {
    let persisted = true;
    record.difficulty = difficulty;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); }
    catch (_) { persisted = false; }
    storageNote.textContent = persisted
      ? '完成次数只记在这台设备的浏览器里。刷新会准备新的一局。'
      : '浏览器暂时不能记住完成次数，这一页仍然可以玩。';
    window.dispatchEvent(new CustomEvent('dyson-site-change', { detail: { game: 'minesweeper', persisted } }));
    return persisted;
  }

  // Adapted reset, safe placement and number calculation from the pinned source.
  function resetGame() {
    mines = new Uint8Array(boardW * boardH);
    nums = new Uint8Array(boardW * boardH);
    revealed = new Uint8Array(boardW * boardH);
    flagged = new Uint8Array(boardW * boardH);
    firstClick = true; gameOver = false; gameWon = false; revealedCount = 0; hitCell = -1;
  }
  function placeMines(safeX, safeY) {
    const banned = new Uint8Array(boardW * boardH);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const x = safeX + ox, y = safeY + oy;
      if (inBounds(x, y)) banned[idx(x, y)] = 1;
    }
    let placed = 0;
    while (placed < mineCount) {
      const x = randInt(boardW), y = randInt(boardH), i = idx(x, y);
      if (mines[i] || banned[i]) continue;
      mines[i] = 1; placed++;
    }
    for (let y = 0; y < boardH; y++) for (let x = 0; x < boardW; x++) {
      const i = idx(x, y);
      if (mines[i]) continue;
      let n = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = x + ox, ny = y + oy;
        if (inBounds(nx, ny) && mines[idx(nx, ny)]) n++;
      }
      nums[i] = n;
    }
  }
  function checkWin() {
    if (gameOver || gameWon) return;
    if (revealedCount >= boardW * boardH - mineCount) {
      gameWon = true;
      for (let i = 0; i < mines.length; i++) if (mines[i]) flagged[i] = 1;
      // Another tab may have finished a garden since this one was opened.
      try {
        const latest = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (validRecord(latest)) record.wins = Math.max(record.wins, latest.wins);
      } catch (_) { /* In-memory records still work. */ }
      record.wins = Math.min(Number.MAX_SAFE_INTEGER - 1, record.wins + 1);
      const persisted = persist();
      tell('花园整理好啦！所有安全格都找到了。再开一局，试试新的花园吧。', 'won');
      window.dispatchEvent(new CustomEvent('dyson-minesweeper-complete', { detail: { difficulty, wins: record.wins, persisted } }));
      if (window.DysonCelebrate) window.DysonCelebrate();
    }
  }
  function revealCell(x, y) {
    if (!inBounds(x, y) || gameOver || gameWon) return;
    const i = idx(x, y);
    if (revealed[i] || flagged[i]) return;
    revealed[i] = 1; revealedCount++;
    if (mines[i]) {
      gameOver = true; hitCell = i;
      tell('碰到一块小石头啦，花园没关系！看看石头的位置，重新开始再试一试。', 'lost');
      return;
    }
    // Adapted stack flood fill. Mark when queued so each safe cell is visited once.
    if (nums[i] === 0) {
      const stack = [x, y];
      while (stack.length) {
        const cy = stack.pop(), cx = stack.pop();
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const nx = cx + ox, ny = cy + oy;
          if (!inBounds(nx, ny)) continue;
          const ni = idx(nx, ny);
          if (revealed[ni] || flagged[ni] || mines[ni]) continue;
          revealed[ni] = 1; revealedCount++;
          if (nums[ni] === 0) stack.push(nx, ny);
        }
      }
    }
    checkWin();
  }
  function toggleFlag(x, y) {
    if (!inBounds(x, y) || gameOver || gameWon) return;
    const i = idx(x, y);
    if (revealed[i]) { tell('这一格已经安全翻开了。小旗放在还没翻开的格子上。'); return; }
    flagged[i] = flagged[i] ? 0 : 1;
    tell(flagged[i] ? '小旗放好了。标记是你的猜想，数字还能帮助你继续检查。' : '小旗收起来了，切到“翻开”就能查看这一格。');
  }
  function setMode(next) {
    mode = next;
    document.querySelectorAll('[data-mode]').forEach(button => {
      const selected = button.dataset.mode === mode;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('primary', selected);
    });
    document.getElementById('mode-hint').textContent = mode === 'flag' ? '点格子放小旗，再点一次收起' : '点格子，看看下面是什么';
  }
  function cellLabel(i) {
    const coordinate = `第 ${Math.floor(i / boardW) + 1} 行第 ${i % boardW + 1} 列`;
    if (gameOver && mines[i]) return `${coordinate}，这里有小石头`;
    if (flagged[i]) return `${coordinate}，已放小旗`;
    if (revealed[i]) return `${coordinate}，${nums[i] ? `周围有 ${nums[i]} 块石头` : '没有相邻石头的安全空地'}`;
    return `${coordinate}，还没翻开`;
  }
  function render() {
    board.dataset.phase = phase();
    cells.forEach((button, i) => {
      button.className = 'garden-cell'; button.textContent = ''; delete button.dataset.number;
      button.setAttribute('aria-label', cellLabel(i));
      button.setAttribute('aria-disabled', String(gameOver || gameWon));
      button.tabIndex = i === focusIndex ? 0 : -1;
      if (gameOver && mines[i]) {
        button.classList.add('is-rock'); if (i === hitCell) button.classList.add('is-hit');
        const stone = document.createElement('span'); stone.className = 'stone-shape'; stone.setAttribute('aria-hidden', 'true'); button.append(stone);
      } else if (flagged[i]) {
        button.classList.add('is-flagged');
        if (gameOver && !mines[i]) { button.classList.add('is-wrong'); button.textContent = '×'; button.setAttribute('aria-label', `${cellLabel(i)}，这面小旗猜错了，这里没有石头`); }
        else { const flag = document.createElement('span'); flag.className = 'flag-icon'; flag.setAttribute('aria-hidden', 'true'); button.append(flag); }
      } else if (revealed[i]) {
        button.classList.add('is-revealed');
        if (nums[i]) { button.textContent = String(nums[i]); button.dataset.number = String(nums[i]); }
        else button.classList.add('is-empty');
      }
    });
    document.getElementById('rock-count').textContent = String(mineCount);
    document.getElementById('flag-count').textContent = String(flagged.reduce((sum, value) => sum + value, 0));
    document.getElementById('safe-count').textContent = `${revealedCount - (gameOver ? 1 : 0)} / ${boardW * boardH - mineCount}`;
    document.getElementById('garden-wins').textContent = String(record.wins);
  }
  function chooseCell(i, event) {
    if (gameOver || gameWon) return;
    focusIndex = i;
    const x = i % boardW, y = Math.floor(i / boardW);
    if (mode === 'flag' || (event && event.shiftKey)) toggleFlag(x, y);
    else if (flagged[i]) tell('这一格有小旗保护。先切到“标记”收起小旗，再翻开它吧。');
    else if (revealed[i]) tell(`这一格已经翻开啦。${nums[i] ? `数字 ${nums[i]} 提醒你：周围有 ${nums[i]} 块石头。` : '它的周围没有石头。'}`);
    else {
      const before = revealedCount;
      if (firstClick) { placeMines(x, y); firstClick = false; }
      revealCell(x, y);
      if (!gameOver && !gameWon) tell(revealedCount - before > 1 ? '一片安全空地展开了！看看边缘的数字，再想想下一格。' : '这一格安全。看看它的数字，继续寻找安全格吧。');
    }
    render();
  }
  function newGame(nextDifficulty = difficulty, save = true) {
    const round = ++generation;
    difficulty = nextDifficulty;
    boardW = boardH = choices[difficulty].size; mineCount = choices[difficulty].mines;
    resetGame(); focusIndex = 0; cells = []; setMode('reveal');
    board.replaceChildren(); board.style.setProperty('--columns', String(boardW));
    board.setAttribute('aria-rowcount', String(boardH)); board.setAttribute('aria-colcount', String(boardW));
    board.setAttribute('aria-label', `${choices[difficulty].name}花园，${boardH} 行 ${boardW} 列，${mineCount} 块小石头`);
    for (let y = 0; y < boardH; y++) {
      const row = document.createElement('div'); row.className = 'mine-row'; row.setAttribute('role', 'row'); row.setAttribute('aria-rowindex', String(y + 1));
      for (let x = 0; x < boardW; x++) {
        const i = idx(x, y), button = document.createElement('button');
        button.type = 'button'; button.dataset.cell = String(i); button.setAttribute('role', 'gridcell'); button.setAttribute('aria-colindex', String(x + 1));
        activate(button, event => { if (round === generation) chooseCell(i, event); });
        button.addEventListener('focus', () => { if (round !== generation) return; cells[focusIndex].tabIndex = -1; focusIndex = i; button.tabIndex = 0; });
        button.addEventListener('contextmenu', event => { event.preventDefault(); if (round !== generation) return; focusIndex = i; toggleFlag(x, y); render(); });
        row.append(button); cells.push(button);
      }
      board.append(row);
    }
    document.querySelectorAll('[data-difficulty]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.difficulty === difficulty)));
    document.getElementById('board-scroll-tip').hidden = difficulty !== 'hard' || innerWidth > 600;
    document.getElementById('board-window').scrollLeft = 0;
    tell('挑一格翻开吧，第一格和它周围都安全。');
    if (save) persist();
    render();
  }
  document.querySelectorAll('[data-mode]').forEach(button => activate(button, () => setMode(button.dataset.mode)));
  document.querySelectorAll('[data-difficulty]').forEach(button => activate(button, () => { if (button.dataset.difficulty !== difficulty) newGame(button.dataset.difficulty); }));
  activate(document.getElementById('new-garden'), () => newGame());
  board.addEventListener('keydown', event => {
    const button = event.target.closest('[data-cell]'); if (!button) return;
    const i = Number(button.dataset.cell), x = i % boardW, y = Math.floor(i / boardW);
    let next = i;
    if (event.key === 'ArrowRight') next = y * boardW + Math.min(boardW - 1, x + 1);
    else if (event.key === 'ArrowLeft') next = y * boardW + Math.max(0, x - 1);
    else if (event.key === 'ArrowDown') next = Math.min(boardH - 1, y + 1) * boardW + x;
    else if (event.key === 'ArrowUp') next = Math.max(0, y - 1) * boardW + x;
    else if (event.key === 'Home') next = event.ctrlKey ? 0 : y * boardW;
    else if (event.key === 'End') next = event.ctrlKey ? cells.length - 1 : y * boardW + boardW - 1;
    else if (event.key.toLowerCase() === 'f') {
      event.preventDefault(); if (!event.repeat) { toggleFlag(x, y); render(); } return;
    } else return;
    event.preventDefault(); cells[next].focus({ preventScroll: true }); cells[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  window.addEventListener('resize', () => { document.getElementById('board-scroll-tip').hidden = difficulty !== 'hard' || innerWidth > 600; });
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); record.wins = validRecord(saved) ? saved.wins : 0; render(); } catch (_) { /* Keep this page's count if access was blocked. */ }
  });
  window.DysonMinesweeper = Object.freeze({ getState: () => ({ version: 1, difficulty, mode, phase: phase(), firstClick,
    boardW, boardH, mineCount, revealedCount, wins: record.wins, mines: Array.from(mines), nums: Array.from(nums), revealed: Array.from(revealed), flagged: Array.from(flagged) }) });
  newGame(difficulty, false);
  if (readFailed) storageNote.textContent = '这次没能读出本机记录，仍然可以玩。完成后会再试着保存次数。';
})();
