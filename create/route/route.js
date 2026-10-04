(() => {
  'use strict';
  const status = document.getElementById('route-status');
  if (!window.Blockly) { status.textContent = '积木暂时没有打开，请刷新再试一次。'; return; }
  const key = 'dyson-route-v1';
  const board = document.getElementById('route-board');
  const runButton = document.getElementById('run-route');
  const stopButton = document.getElementById('stop-route');
  const resetButton = document.getElementById('reset-route');
  const nextButton = document.getElementById('next-route');
  const draftLabel = document.getElementById('route-draft');
  const quickButtons = [...document.querySelectorAll('[data-add]')];
  const levelButtons = [...document.querySelectorAll('[data-level]')];
  const activate = (button, callback) => window.DysonSite.onActivate(button, callback);
  const stair = ['0,4', '1,4', '1,3', '2,3', '2,2', '3,2', '3,1', '4,1', '4,0'];
  const levels = [
    { name: '直直走', tip: '苹果在右边。试试向右走 4 步，也可以用“重复”。', start: [0, 4], goal: [4, 4], walls: [] },
    { name: '转个弯', tip: '先走到右边，再往上找苹果。灰色石头不能走。', start: [0, 4], goal: [4, 0], walls: ['1,3', '2,3', '3,3', '0,1', '1,1', '2,1'] },
    { name: '小楼梯', tip: '一格右、一格上，一小阶一小阶。重复积木能帮上忙！', start: [0, 4], goal: [4, 0], walls: Array.from({ length: 25 }, (_, i) => `${i % 5},${Math.floor(i / 5)}`).filter(cell => !stair.includes(cell)) }
  ];
  let saved = { version: 1, level: 0, completed: [], drafts: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    if (raw && raw.version === 1) {
      saved.level = Number.isInteger(raw.level) && raw.level >= 0 && raw.level < 3 ? raw.level : 0;
      saved.completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(value => [0, 1, 2].includes(value)))] : [];
      saved.drafts = raw.drafts && typeof raw.drafts === 'object' && !Array.isArray(raw.drafts) ? raw.drafts : {};
    }
  } catch { /* An empty workspace still works when storage is unavailable. */ }
  let levelIndex = saved.level, actor = [0, 4], trail = [], running = false, token = 0, loading = false;

  Blockly.common.defineBlocksWithJsonArray([
    { type: 'garden_start', message0: '开始', nextStatement: null, colour: '#39734d', tooltip: '把方向积木接在这里。', helpUrl: '' },
    { type: 'garden_step', message0: '向 %1 走一步', args0: [{ type: 'field_dropdown', name: 'DIR', options: [['→ 右边', 'E'], ['↑ 上面', 'N'], ['↓ 下面', 'S'], ['← 左边', 'W']] }], previousStatement: null, nextStatement: null, colour: '#5b8aaf', tooltip: '点击方向可以换一边。', helpUrl: '' },
    { type: 'garden_repeat', message0: '重复 %1 次', args0: [{ type: 'field_number', name: 'TIMES', value: 4, min: 1, max: 8, precision: 1 }], message1: '%1', args1: [{ type: 'input_statement', name: 'BODY' }], previousStatement: null, nextStatement: null, colour: '#b28838', tooltip: '把方向积木放进肚子里，就会重复走。', helpUrl: '' }
  ]);
  const workspace = Blockly.inject('block-workspace', {
    toolbox: { kind: 'flyoutToolbox', contents: [{ kind: 'block', type: 'garden_step' }, { kind: 'block', type: 'garden_repeat' }] },
    horizontalLayout: true, toolboxPosition: 'start', renderer: 'zelos',
    media: new URL('../../assets/vendor/blockly/media/', document.baseURI).href,
    grid: { spacing: 20, length: 2, colour: '#e0e6d8', snap: false },
    zoom: { controls: true, wheel: false, startScale: window.innerWidth < 600 ? .75 : .9, minScale: .5, maxScale: 1.4 },
    move: { scrollbars: true, drag: true, wheel: true },
    sounds: false, trashcan: true, maxBlocks: 32, collapse: false, comments: false, disable: false
  });

  const tell = (message, result = '') => { status.textContent = message; status.dataset.result = result; };
  function store() {
    if (loading) return;
    saved.level = levelIndex;
    saved.drafts[levelIndex] = Blockly.serialization.workspaces.save(workspace);
    try {
      localStorage.setItem(key, JSON.stringify(saved));
      draftLabel.textContent = '积木和完成的路线已保存在这台设备的浏览器里。';
    } catch { draftLabel.textContent = '浏览器暂时不能保存，关闭页面后积木可能会消失。'; }
  }
  function drawBoard() {
    const level = levels[levelIndex];
    board.replaceChildren();
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const cell = document.createElement('div');
      cell.className = 'route-cell';
      if (level.walls.includes(`${x},${y}`)) { cell.classList.add('wall'); cell.textContent = '🪨'; }
      else if (trail.includes(`${x},${y}`)) cell.classList.add('trail');
      if (x === level.goal[0] && y === level.goal[1]) { cell.classList.add('goal'); cell.textContent = '🍎'; }
      if (x === actor[0] && y === actor[1]) { cell.classList.add('actor'); cell.textContent = '🐍'; }
      cell.setAttribute('aria-hidden', 'true');
      board.append(cell);
    }
    board.setAttribute('aria-label', `${level.name}，小蛇在第 ${actor[1] + 1} 行第 ${actor[0] + 1} 列，苹果在第 ${level.goal[1] + 1} 行第 ${level.goal[0] + 1} 列。灰色石头不能走。`);
    document.getElementById('route-stars').textContent = [0, 1, 2].map(index => saved.completed.includes(index) ? '★' : '☆').join('');
  }
  function starter() { return workspace.getAllBlocks(false).find(block => block.type === 'garden_start'); }
  function newStarter() {
    const block = workspace.newBlock('garden_start');
    block.initSvg(); block.render(); block.moveBy(25, 25);
    block.setDeletable(false); block.setMovable(false);
    return block;
  }
  function finishRun() {
    running = false;
    runButton.disabled = false; stopButton.disabled = true;
    workspace.highlightBlock(null);
  }
  function stop(message) { token++; finishRun(); if (message) tell(message); }
  function loadLevel(index, fresh = false) {
    stop();
    if (!loading && !fresh) store();
    levelIndex = index;
    loading = true;
    workspace.clear();
    try {
      if (!fresh && saved.drafts[index]) Blockly.serialization.workspaces.load(saved.drafts[index], workspace);
      const starts = workspace.getAllBlocks(false).filter(block => block.type === 'garden_start');
      if (starts.length > 1 || workspace.getAllBlocks(false).length > 32 || workspace.getAllBlocks(false).some(block => !['garden_start', 'garden_step', 'garden_repeat'].includes(block.type))) throw new Error('invalid draft');
      if (!starts.length) newStarter();
      else { starts[0].setDeletable(false); starts[0].setMovable(false); }
    } catch { workspace.clear(); newStarter(); }
    loading = false;
    actor = [...levels[index].start]; trail = [];
    document.getElementById('level-title').textContent = levels[index].name;
    document.getElementById('level-tip').textContent = levels[index].tip;
    levelButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.level) === index)));
    nextButton.hidden = true;
    drawBoard();
    tell('把积木接好，然后点“跑一跑”。');
    Blockly.svgResize(workspace);
    workspace.scrollCenter();
    store();
  }
  function compile() {
    const start = starter();
    if (!start || !start.getNextBlock()) throw new Error('还没有方向积木。点上面的方向按钮，或把蓝色积木接在“开始”下面。');
    const disconnected = workspace.getTopBlocks(false).find(block => block !== start);
    if (disconnected) { workspace.highlightBlock(disconnected.id); throw new Error('有积木还没接上。把它接在“开始”下面或放进“重复”里面，再跑一跑。'); }
    const moves = [];
    function walk(first, depth) {
      if (depth > 5) throw new Error('重复积木套得太多啦，先试试 5 层以内。');
      for (let block = first; block; block = block.getNextBlock()) {
        if (block.type === 'garden_step') {
          const direction = block.getFieldValue('DIR');
          if (!['N', 'E', 'S', 'W'].includes(direction)) throw new Error('这个方向还没选好，请换一块方向积木。');
          moves.push({ direction, id: block.id });
          if (moves.length > 80) throw new Error('这条路线超过 80 步啦，先缩短一点再试。');
        } else if (block.type === 'garden_repeat') {
          const count = Number(block.getFieldValue('TIMES'));
          const body = block.getInputTargetBlock('BODY');
          if (!body) { workspace.highlightBlock(block.id); throw new Error('“重复”里面还空着呢，放一块方向积木进去吧。'); }
          if (!Number.isInteger(count) || count < 1 || count > 8) throw new Error('重复次数选 1 到 8 次就好。');
          for (let i = 0; i < count; i++) walk(body, depth + 1);
        } else throw new Error('这块积木不能走路，请换成方向积木。');
      }
    }
    walk(start.getNextBlock(), 0);
    return moves;
  }
  async function run() {
    if (running) return;
    workspace.highlightBlock(null);
    let moves;
    try { moves = compile(); } catch (error) { tell(error.message); return; }
    store();
    const id = ++token;
    running = true; runButton.disabled = true; stopButton.disabled = false; nextButton.hidden = true;
    actor = [...levels[levelIndex].start]; trail = []; drawBoard();
    const directionOffsets = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
    for (let i = 0; i < moves.length; i++) {
      workspace.highlightBlock(moves[i].id);
      tell(`正在走第 ${i + 1} / ${moves.length} 步……`);
      await new Promise(resolve => setTimeout(resolve, 350));
      if (id !== token || document.hidden) return;
      const offset = directionOffsets[moves[i].direction];
      const next = [actor[0] + offset[0], actor[1] + offset[1]];
      if (next.some(value => value < 0 || value > 4) || levels[levelIndex].walls.includes(next.join(','))) {
        finishRun(); tell(`第 ${i + 1} 步碰到了石头或花园边缘。小蛇没事！换个方向再试一次。`, 'blocked'); return;
      }
      trail.push(actor.join(',')); actor = next; drawBoard();
      if (actor.join(',') === levels[levelIndex].goal.join(',')) {
        finishRun();
        if (!saved.completed.includes(levelIndex)) saved.completed.push(levelIndex);
        store(); drawBoard();
        tell(`找到苹果啦！用了 ${i + 1} 步，你拼的路线成功了。`, 'win');
        nextButton.hidden = levelIndex === 2;
        if (window.DysonCelebrate) window.DysonCelebrate();
        return;
      }
    }
    finishRun(); tell('积木走完了，还没到苹果。再接几步，或者换换方向吧。', 'short');
  }
  function addDirection(direction) {
    if (running) stop('积木改变啦，点“跑一跑”从起点再试。');
    if (workspace.getAllBlocks(false).length >= 32) { tell('积木已经很多啦。先删掉几块，或用“重复”把路线变短。'); return; }
    let end = starter();
    while (end.getNextBlock()) end = end.getNextBlock();
    const block = workspace.newBlock('garden_step');
    block.setFieldValue(direction, 'DIR'); block.initSvg(); block.render();
    end.nextConnection.connect(block.previousConnection);
    workspace.scrollCenter();
    tell('方向积木接好啦！也可以点击积木里的方向来修改。'); store();
  }
  workspace.addChangeListener(event => {
    if (loading || event.isUiEvent) return;
    if (running) stop('积木改变啦，点“跑一跑”从起点再试。');
    store();
  });
  activate(runButton, run);
  activate(stopButton, () => stop('停下来啦。点“跑一跑”，会从起点再走一次。'));
  activate(resetButton, () => {
    if (workspace.getAllBlocks(false).length > 1 && !window.confirm('要把这条路线的积木重新拼吗？其他路线和已经完成的星星会保留。')) return;
    loadLevel(levelIndex, true);
  });
  quickButtons.forEach(button => activate(button, () => addDirection(button.dataset.add)));
  levelButtons.forEach(button => activate(button, () => { if (Number(button.dataset.level) !== levelIndex) loadLevel(Number(button.dataset.level)); }));
  activate(nextButton, () => loadLevel(Math.min(2, levelIndex + 1)));
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) stop('刚才离开了页面，路线已停下。回来后点“跑一跑”就能重新出发。'); });
  window.addEventListener('pagehide', () => { stop(); store(); });
  new ResizeObserver(() => Blockly.svgResize(workspace)).observe(document.getElementById('block-workspace'));
  // Read-only access to the actual workspace is useful when verifying connected blocks.
  window.DysonRoute = Object.freeze({ workspace, compile });
  loading = true;
  loadLevel(levelIndex);
})();
