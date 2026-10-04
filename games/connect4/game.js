(() => {
  'use strict';
  const Rules = window.Connect4Rules;
  const { ROWS, COLS, DISC_RED: RED, DISC_YELLOW: YELLOW, getOpponent, getLowestEmptyRowForState, checkWinForState, connect4Game } = Rules;
  const STORAGE_KEY = 'dyson-connect4-v1';
  const boardElement = document.querySelector('#board');
  const statusElement = document.querySelector('#game-status');
  const turnDisc = document.querySelector('#turn-disc');
  const difficultySelect = document.querySelector('#difficulty');
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  const activate = window.DysonSite?.onActivate || ((button, callback) => button.addEventListener('click', callback));
  const emptyRecord = () => ({ version: 1, mode: 'ai', difficulty: 'medium', wins: { ai: 0, red: 0, yellow: 0 }, draws: 0 });
  let record = emptyRecord();
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 1) {
      if (['ai', 'pvp'].includes(saved.mode)) record.mode = saved.mode;
      if (['easy', 'medium', 'hard'].includes(saved.difficulty)) record.difficulty = saved.difficulty;
      for (const side of ['ai', 'red', 'yellow']) if (Number.isSafeInteger(saved.wins?.[side]) && saved.wins[side] >= 0) record.wins[side] = saved.wins[side];
      if (Number.isSafeInteger(saved.draws) && saved.draws >= 0) record.draws = saved.draws;
    }
  } catch { storageAvailable = false; }

  let state, winner = null, winningCells = [], lastMove = null;
  let selectedColumn = 3, busy = false, generation = 0, aiTimer = null, aiController = null, away = false;
  let returnKeyboardFocus = false;
  const columns = [];
  for (let col = 0; col < COLS; col++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'column-button';
    button.dataset.column = col;
    const label = document.createElement('span');
    label.className = 'column-label';
    label.textContent = col + 1;
    label.setAttribute('aria-hidden', 'true');
    button.append(label);
    const cells = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      const cell = document.createElement('span');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.setAttribute('aria-hidden', 'true');
      button.append(cell);
      cells[row] = cell;
    }
    activate(button, () => { selectedColumn = col; drop(col); });
    button.addEventListener('focus', () => { selectedColumn = col; renderSelection(); });
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && !busy && !state.gameOver) { selectedColumn = col; renderSelection(); }
    });
    boardElement.append(button);
    columns.push({ button, cells });
  }

  function saveRecord() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); storageAvailable = true; }
    catch { storageAvailable = false; }
    updateRecord();
  }
  function updateRecord() {
    document.querySelector('#ai-wins').textContent = record.wins.ai;
    document.querySelector('#red-wins').textContent = record.wins.red;
    document.querySelector('#yellow-wins').textContent = record.wins.yellow;
    document.querySelector('#storage-note').textContent = storageAvailable
      ? '赢局数保存在这个浏览器里。切换对手或电脑水平，会开始新的一局。'
      : '这次的赢局数暂时无法保存在浏览器里。你仍然可以正常下棋。';
  }
  function cancelAI() {
    generation++;
    clearTimeout(aiTimer);
    aiTimer = null;
    aiController?.abort();
    aiController = null;
    busy = false;
    returnKeyboardFocus = false;
  }
  function newGame() {
    cancelAI();
    state = { board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)), currentPlayer: RED, gameOver: false };
    winner = null;
    winningCells = [];
    lastMove = null;
    selectedColumn = 3;
    modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === record.mode)));
    difficultySelect.value = record.difficulty;
    difficultySelect.disabled = record.mode === 'pvp';
    render();
  }
  function renderSelection() {
    columns.forEach(({ button }, col) => {
      button.classList.toggle('selected', col === selectedColumn);
      button.tabIndex = !button.disabled && col === selectedColumn ? 0 : -1;
    });
  }
  function render(message) {
    const humanTurn = record.mode === 'pvp' || state.currentPlayer === RED;
    columns.forEach(({ button, cells }, col) => {
      const row = getLowestEmptyRowForState(state.board, col);
      button.disabled = state.gameOver || busy || away || !humanTurn || row < 0;
      const color = state.currentPlayer === RED ? '红' : '黄';
      button.setAttribute('aria-label', `第${col + 1}列，已有${row < 0 ? ROWS : row}枚棋子${row < 0 ? '，这一列满了' : `，落下${color}棋`}`);
      cells.forEach((cell, rowIndex) => {
        const disc = state.board[rowIndex][col];
        cell.className = 'cell' + (disc === RED ? ' red' : disc === YELLOW ? ' yellow' : '');
        cell.textContent = disc === RED ? '红' : disc === YELLOW ? '黄' : '';
        if (lastMove?.row === rowIndex && lastMove.col === col) cell.classList.add('last');
        if (winningCells.some(position => position.row === rowIndex && position.col === col)) cell.classList.add('winning');
      });
    });
    if (!columns[selectedColumn].button.disabled && !busy) renderSelection();
    else {
      const firstPlayable = columns.findIndex(({ button }) => !button.disabled);
      if (firstPlayable >= 0) selectedColumn = firstPlayable;
      renderSelection();
    }
    let text = message;
    if (!text) {
      if (state.gameOver) text = winner === null ? '棋盘满了，这一局平局！再来一局吧。'
        : record.mode === 'ai' ? winner === RED ? '你连成四枚了，你赢了！' : '电脑连成四枚了，下局再试试！'
          : `${winner === RED ? '红' : '黄'}棋连成四枚，赢了！`;
      else if (away) text = '对局已停下，回来后接着下。';
      else if (busy) text = '电脑正在想下一步，稍等一下…';
      else text = record.mode === 'ai' ? '轮到你了，落下一枚红棋。' : `轮到${state.currentPlayer === RED ? '红' : '黄'}棋了。`;
    }
    statusElement.textContent = text;
    turnDisc.className = 'turn-disc ' + (state.gameOver && winner === null ? 'draw' : (winner || state.currentPlayer) === RED ? 'red' : 'yellow');
  }
  function applyMove(col) {
    const row = getLowestEmptyRowForState(state.board, col);
    if (row < 0) return false;
    const player = state.currentPlayer;
    state = connect4Game.applyMove(state, { col }, player);
    lastMove = { row, col };
    winningCells = checkWinForState(state.board, row, col, player) || [];
    winner = winningCells.length ? player : null;
    if (state.gameOver) {
      if (winner === null) record.draws++;
      else if (record.mode === 'ai' && winner === RED) record.wins.ai++;
      else if (record.mode === 'pvp') record.wins[winner === RED ? 'red' : 'yellow']++;
      saveRecord();
    }
    render();
    return true;
  }
  function drop(col) {
    if (!Number.isInteger(col) || col < 0 || col >= COLS || busy || away || state.gameOver || (record.mode === 'ai' && state.currentPlayer !== RED)) return false;
    if (!applyMove(col)) { render('这一列已经满了，换一列试试。'); return false; }
    if (!state.gameOver && record.mode === 'ai') scheduleAI();
    return true;
  }
  function focusNextMove() {
    const active = document.activeElement;
    if (active !== document.body && active !== document.documentElement && !boardElement.contains(active)) return;
    if (state.gameOver) document.querySelector('#new-game').focus({ preventScroll: true });
    else if (!columns[selectedColumn].button.disabled) columns[selectedColumn].button.focus({ preventScroll: true });
  }
  function scheduleAI() {
    if (away || state.gameOver || record.mode !== 'ai' || state.currentPlayer !== YELLOW) return;
    busy = true;
    const ticket = generation;
    const controller = new AbortController();
    aiController = controller;
    render();
    aiTimer = setTimeout(async () => {
      aiTimer = null;
      let move;
      try {
        move = record.difficulty === 'easy' ? randomAI(connect4Game, state)
          : await alphaBetaAI(connect4Game, state, record.difficulty === 'hard' ? 11 : 5, {
            signal: controller.signal, maxTimeMs: record.difficulty === 'hard' ? 1000 : 650, yieldEveryMs: 12
          });
      } catch (error) {
        if (error.name === 'AbortError') return;
        move = connect4Game.getLegalMoves(state)[0];
      }
      if (ticket !== generation || controller.signal.aborted || away) return;
      aiController = null;
      busy = false;
      if (!move) move = connect4Game.getLegalMoves(state)[0];
      if (move) applyMove(move.col);
      else render();
      if (returnKeyboardFocus) { returnKeyboardFocus = false; focusNextMove(); }
    }, 280);
  }
  boardElement.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (busy || state.gameOver || away) return;
      const legal = columns.map(({ button }, index) => button.disabled ? -1 : index).filter(index => index >= 0);
      if (!legal.length) return;
      const position = Math.max(0, legal.indexOf(selectedColumn));
      selectedColumn = event.key === 'Home' ? legal[0] : event.key === 'End' ? legal.at(-1)
        : legal[(position + (event.key === 'ArrowRight' ? 1 : legal.length - 1)) % legal.length];
      renderSelection();
      columns[selectedColumn].button.focus({ preventScroll: true });
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat && drop(selectedColumn)) {
        if (busy) returnKeyboardFocus = true;
        else focusNextMove();
      }
    }
  });
  modeButtons.forEach(button => activate(button, () => {
    record.mode = button.dataset.mode;
    saveRecord();
    newGame();
  }));
  activate(document.querySelector('#new-game'), newGame);
  difficultySelect.addEventListener('change', () => {
    if (!['easy', 'medium', 'hard'].includes(difficultySelect.value)) return;
    record.difficulty = difficultySelect.value;
    saveRecord();
    newGame();
  });
  function leave() { away = true; cancelAI(); render(); }
  function resume() {
    if (document.hidden) return;
    away = false;
    render();
    if (state.currentPlayer === YELLOW && record.mode === 'ai' && !state.gameOver) scheduleAI();
  }
  window.addEventListener('pagehide', leave);
  window.addEventListener('pageshow', resume);
  document.addEventListener('visibilitychange', () => document.hidden ? leave() : resume());
  window.Connect4Game = Object.freeze({
    newGame, drop,
    snapshot: () => ({ board: state.board.map(row => [...row]), currentPlayer: state.currentPlayer, gameOver: state.gameOver, winner,
      winningCells: winningCells.map(cell => ({ ...cell })), busy, mode: record.mode, difficulty: record.difficulty, generation })
  });
  updateRecord();
  newGame();
})();
