(() => {
  'use strict';
  const KEY = 'dyson-sudoku-v1', LEVELS = ['easy', 'normal', 'hard'];
  const bank = window.DysonSudokuBank;
  const puzzles = new Map(bank.puzzles.map(puzzle => [puzzle.id, puzzle]));
  const board = document.querySelector('#sudoku-board'), status = document.querySelector('#game-status');
  const pad = [...document.querySelectorAll('[data-digit]')];
  const levelButtons = [...document.querySelectorAll('[data-level]')];
  const activate = window.DysonSite?.onActivate || ((button, action) => button.addEventListener('click', action));
  const emptyRecord = () => ({ version: 1, difficulty: 'easy', wins: 0, draft: null });
  let record = emptyRecord(), initial = '', solution = '', selected = 0, history = [], storageAvailable = true, recovered = false;
  const mapDigits = (text, mapping) => [...text].map(value => value === '.' ? '.' : mapping[Number(value) - 1]).join('');
  const validEntries = (text, givens) => typeof text === 'string' && /^[1-9.]{81}$/.test(text) && [...givens].every((value, index) => value === '.' || text[index] === value);
  function restoreDraft(draft) {
    if (!draft || !puzzles.has(draft.puzzleId) || typeof draft.mapping !== 'string' || [...draft.mapping].sort().join('') !== '123456789') return false;
    const puzzle = puzzles.get(draft.puzzleId);
    if (puzzle.level !== record.difficulty) return false;
    const givens = mapDigits(puzzle.puzzle, draft.mapping), answer = mapDigits(puzzle.solution, draft.mapping);
    if (!validEntries(draft.entries, givens) || !Number.isSafeInteger(draft.hints) || draft.hints < 0 || draft.hints > 99999 || typeof draft.done !== 'boolean' || (draft.done && draft.entries !== answer) || (draft.credited !== undefined && typeof draft.credited !== 'boolean')) return false;
    initial = givens; solution = answer;
    record.draft = { puzzleId: draft.puzzleId, mapping: draft.mapping, entries: draft.entries, hints: draft.hints, done: draft.entries === answer, credited: draft.credited === true || draft.done || draft.entries === answer };
    history = Array.isArray(draft.history) ? draft.history.slice(-80).filter(item => item && validEntries(item.entries, givens) && Number.isSafeInteger(item.hints) && item.hints >= 0 && item.hints <= 99999).map(item => ({ entries: item.entries, hints: item.hints })) : [];
    selected = initial.indexOf('.');
    return true;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved?.version === 1 && LEVELS.includes(saved.difficulty) && Number.isSafeInteger(saved.wins) && saved.wins >= 0 && saved.wins <= 1e9) {
        record.difficulty = saved.difficulty; record.wins = saved.wins;
        if (!restoreDraft(saved.draft)) recovered = true;
      } else recovered = true;
    }
  } catch (error) { if (error instanceof SyntaxError) recovered = true; else storageAvailable = false; }

  const cells = [];
  for (let index = 0; index < 81; index++) {
    const cell = document.createElement('button');
    cell.type = 'button'; cell.className = 'sudoku-cell'; cell.dataset.cell = index;
    activate(cell, () => { selected = index; render(); });
    cell.addEventListener('focus', () => { if (selected !== index) { selected = index; render(); } });
    cells.push(cell); board.append(cell);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...record, draft: { ...record.draft, history } })); storageAvailable = true; }
    catch { storageAvailable = false; }
    renderSave();
    window.dispatchEvent(new Event('dyson-site-change'));
  }
  function renderSave() {
    document.querySelector('#save-status').textContent = !storageAvailable ? '浏览器暂时无法保存进度。你仍可以正常填题，关闭页面后这题可能不会保留。'
      : recovered ? '上次的草稿没有读完整，已经为你准备好一题。新的进度会继续保存。'
        : '这题的进度保存在当前浏览器里，回来还能接着填。';
  }
  function conflicts() {
    const result = new Set(), entries = record.draft.entries;
    const groups = [];
    for (let n = 0; n < 9; n++) { groups.push(Array.from({ length: 9 }, (_, i) => n * 9 + i)); groups.push(Array.from({ length: 9 }, (_, i) => i * 9 + n)); }
    for (let by = 0; by < 3; by++) for (let bx = 0; bx < 3; bx++) groups.push(Array.from({ length: 9 }, (_, i) => (by * 3 + Math.floor(i / 3)) * 9 + bx * 3 + i % 3));
    for (const group of groups) {
      const positions = new Map();
      for (const index of group) { const value = entries[index]; if (value === '.') continue; if (!positions.has(value)) positions.set(value, []); positions.get(value).push(index); }
      for (const indices of positions.values()) if (indices.length > 1) indices.forEach(index => result.add(index));
    }
    return result;
  }
  function render(message) {
    const draft = record.draft, duplicated = conflicts(), row = Math.floor(selected / 9), col = selected % 9;
    cells.forEach((cell, index) => {
      const r = Math.floor(index / 9), c = index % 9, value = draft.entries[index], given = initial[index] !== '.';
      cell.className = 'sudoku-cell';
      if (given) cell.classList.add('given');
      if (r === row || c === col || (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))) cell.classList.add('peer');
      if (value !== '.' && value === draft.entries[selected]) cell.classList.add('same');
      if (index === selected) cell.classList.add('selected');
      if (duplicated.has(index)) cell.classList.add('conflict');
      if (c === 2 || c === 5) cell.classList.add('box-right');
      if (r === 2 || r === 5) cell.classList.add('box-bottom');
      if (c === 8) cell.classList.add('last-column');
      if (r === 8) cell.classList.add('last-row');
      cell.textContent = value === '.' ? '' : value;
      cell.tabIndex = index === selected ? 0 : -1;
      cell.setAttribute('aria-label', `第${r + 1}行第${c + 1}格，${value === '.' ? '空格' : value}${given ? '，题目数字' : ''}${duplicated.has(index) ? '，数字重复' : ''}`);
      cell.setAttribute('aria-pressed', String(index === selected));
    });
    const editable = !draft.done && initial[selected] === '.';
    pad.forEach(button => { button.disabled = !editable; });
    document.querySelector('#erase').disabled = !editable || draft.entries[selected] === '.';
    document.querySelector('#hint').disabled = !editable || draft.entries[selected] === solution[selected];
    document.querySelector('#undo').disabled = draft.done || !history.length;
    document.querySelector('#selected-cell').textContent = `第 ${row + 1} 行 · 第 ${col + 1} 格${initial[selected] !== '.' ? ' · 题目数字' : draft.entries[selected] === '.' ? ' · 选一个数字' : ` · 已填 ${draft.entries[selected]}`}`;
    document.querySelector('#win-count').textContent = record.wins;
    levelButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.level === record.difficulty)));
    board.classList.toggle('complete', draft.done);
    status.textContent = message || (draft.done ? '这一题填好了！每个数字都找到了自己的位置。' : duplicated.size ? '有数字重复了，红色格子可以再看看。' : initial[selected] !== '.' ? '这是题目上的数字，选一个空格继续吧。' : '先点一个空格，再选下面的数字。');
    renderSave();
  }
  function hasChanges() { return !record.draft.done && record.draft.entries !== initial; }
  function shuffleDigits() {
    const digits = [...'123456789'];
    for (let index = 8; index > 0; index--) { const other = Math.floor(Math.random() * (index + 1)); [digits[index], digits[other]] = [digits[other], digits[index]]; }
    return digits.join('');
  }
  function choosePuzzle(level, confirmChange = true) {
    if (confirmChange && hasChanges() && !window.confirm('这题已经填过一些数字了。换新题会替换当前草稿，确定换题吗？')) return false;
    const available = bank.puzzles.filter(puzzle => puzzle.level === level && puzzle.id !== record.draft?.puzzleId);
    const puzzle = available[Math.floor(Math.random() * available.length)];
    const mapping = shuffleDigits();
    record.difficulty = level;
    initial = mapDigits(puzzle.puzzle, mapping); solution = mapDigits(puzzle.solution, mapping);
    record.draft = { puzzleId: puzzle.id, mapping, entries: initial, hints: 0, done: false, credited: false };
    history = []; selected = initial.indexOf('.');
    save(); render();
    return true;
  }
  function remember() {
    history.push({ entries: record.draft.entries, hints: record.draft.hints });
    if (history.length > 80) history.shift();
  }
  function writeDigit(value, hint = false) {
    const draft = record.draft;
    if (draft.done || initial[selected] !== '.' || !/^[1-9.]$/.test(value) || draft.entries[selected] === value) return false;
    remember();
    draft.entries = draft.entries.slice(0, selected) + value + draft.entries.slice(selected + 1);
    if (hint) draft.hints++;
    if (draft.entries === solution) {
      draft.done = true;
      if (!draft.credited) { record.wins++; draft.credited = true; }
    }
    save(); render(hint && !draft.done ? `一点提示：这一格填 ${value}。` : undefined);
    return true;
  }
  function pointerFocus(event) {
    if (event && (event.detail > 0 || ['touch', 'pen'].includes(event.pointerType))) cells[selected].focus({ preventScroll: true });
  }
  pad.forEach(button => activate(button, event => { writeDigit(button.dataset.digit); pointerFocus(event); }));
  activate(document.querySelector('#erase'), event => { writeDigit('.'); pointerFocus(event); });
  activate(document.querySelector('#undo'), event => {
    if (record.draft.done || !history.length) return;
    const previous = history.pop(); record.draft.entries = previous.entries; record.draft.hints = previous.hints;
    save(); render('刚才的一步已经撤销了。'); pointerFocus(event);
  });
  activate(document.querySelector('#hint'), event => {
    if (record.draft.done || initial[selected] !== '.') return;
    // Reuse the original library's constraint-propagation candidates on the
    // verified starting puzzle. The verified answer resolves non-singletons.
    const candidates = window.sudoku.get_candidates(initial);
    const candidate = candidates[Math.floor(selected / 9)][selected % 9];
    writeDigit(candidate.length === 1 ? candidate : solution[selected], true);
    pointerFocus(event);
  });
  activate(document.querySelector('#restart'), () => {
    record.draft.entries = initial; record.draft.hints = 0; record.draft.done = false; history = []; selected = initial.indexOf('.');
    save(); render('还是这道题，从空格重新开始吧。');
  });
  activate(document.querySelector('#new-puzzle'), () => { choosePuzzle(record.difficulty); });
  levelButtons.forEach(button => activate(button, () => { if (button.dataset.level !== record.difficulty) choosePuzzle(button.dataset.level); }));
  document.addEventListener('keydown', event => {
    if (!event.target.closest('#sudoku-board,.number-pad,.edit-actions') || event.altKey || event.metaKey) return;
    if (event.ctrlKey) {
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); document.querySelector('#undo').click(); }
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const row = Math.floor(selected / 9), col = selected % 9;
      selected = event.key === 'ArrowLeft' ? row * 9 + (col + 8) % 9 : event.key === 'ArrowRight' ? row * 9 + (col + 1) % 9
        : event.key === 'ArrowUp' ? ((row + 8) % 9) * 9 + col : ((row + 1) % 9) * 9 + col;
      render(); cells[selected].focus({ preventScroll: true });
    } else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); if (!event.repeat) writeDigit(event.key); }
    else if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); writeDigit('.'); }
  });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.DysonSudoku = Object.freeze({ getState: () => Object.freeze({ difficulty: record.difficulty, status: record.draft.done ? 'won' : 'playing',
    puzzleId: record.draft.puzzleId, initial, entries: record.draft.entries, selected, wins: record.wins, hints: record.draft.hints, credited: record.draft.credited,
    canUndo: !record.draft.done && history.length > 0, hasChanges: hasChanges(), persisted: storageAvailable }) });
  if (!record.draft) choosePuzzle(record.difficulty, false);
  else render();
})();
