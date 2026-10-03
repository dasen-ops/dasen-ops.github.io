(() => {
  'use strict';

  const canvasHost = document.getElementById('drawing-canvas');
  const feedback = document.getElementById('feedback');
  const draftStatus = document.getElementById('draft-status');
  const undoButton = document.getElementById('undo');
  const redoButton = document.getElementById('redo');
  const WIDTH = 1000;
  const HEIGHT = 640;
  const DRAFT_KEY = 'creative-garden-drawing-v1';
  const palette = ['#39734d', '#244238', '#ed795b', '#e9ba45', '#5d9dc2', '#9e79b5', '#dc7495', '#8d624b'];
  const stickerTypes = ['star', 'sun', 'flower', 'heart'];
  let tool = 'brush';
  let color = palette[0];
  let size = 10;
  let drawing = null;
  let activePointer = null;
  let state = { strokes: [], stickers: [] };
  let past = [];
  let future = [];
  let storageAvailable = true;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const say = (message) => { feedback.textContent = message; };

  if (!window.Konva) {
    say('画板暂时没有打开，请刷新页面再试一次。');
    document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    return;
  }

  const stage = new Konva.Stage({ container: canvasHost, width: WIDTH, height: HEIGHT });
  const paperLayer = new Konva.Layer({ listening: false });
  paperLayer.add(new Konva.Rect({ x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: '#ffffff' }));
  const inkLayer = new Konva.Layer({ listening: false });
  const stickerLayer = new Konva.Layer();
  stage.add(paperLayer, inkLayer, stickerLayer);

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, ...state }));
      storageAvailable = true;
      draftStatus.textContent = '草稿已保存在这台设备的浏览器里，不会上传。';
    } catch (_) {
      storageAvailable = false;
      draftStatus.textContent = '浏览器暂时存不了草稿，离开前记得点“保存图片”。';
    }
  }

  function updateHistoryButtons() {
    undoButton.disabled = past.length === 0;
    redoButton.disabled = future.length === 0;
  }

  function remember(before) {
    past.push(before);
    if (past.length > 40) past.shift();
    future = [];
    updateHistoryButtons();
    saveDraft();
  }

  function strokeNode(stroke) {
    return new Konva.Line({
      points: stroke.points,
      stroke: stroke.color,
      strokeWidth: stroke.tool === 'eraser' ? stroke.width * 2.5 : stroke.width,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: stroke.tool === 'eraser' ? 'destination-out' : 'source-over',
      listening: false,
    });
  }

  function face(group, y) {
    [-12, 12].forEach((x) => group.add(new Konva.Circle({ x, y, radius: 3, fill: '#244238' })));
    group.add(new Konva.Line({ points: [-10, y + 11, 0, y + 16, 10, y + 11], tension: .6, stroke: '#244238', strokeWidth: 3, lineCap: 'round' }));
  }

  function stickerNode(sticker) {
    const group = new Konva.Group({ x: sticker.x, y: sticker.y, draggable: tool === 'move', name: 'sticker' });
    if (sticker.type === 'star') {
      group.add(new Konva.Star({ numPoints: 5, innerRadius: 27, outerRadius: 55, fill: '#e9ba45', stroke: '#c99b2b', strokeWidth: 2 }));
      face(group, -4);
    } else if (sticker.type === 'sun') {
      for (let i = 0; i < 10; i += 1) {
        const angle = i * Math.PI / 5;
        group.add(new Konva.Line({ points: [Math.cos(angle) * 43, Math.sin(angle) * 43, Math.cos(angle) * 55, Math.sin(angle) * 55], stroke: '#e9ba45', strokeWidth: 7, lineCap: 'round' }));
      }
      group.add(new Konva.Circle({ radius: 34, fill: '#f5ce67', stroke: '#e9ba45', strokeWidth: 2 }));
      face(group, -7);
    } else if (sticker.type === 'flower') {
      group.add(new Konva.Line({ points: [0, 13, 0, 58], stroke: '#39734d', strokeWidth: 8, lineCap: 'round' }));
      group.add(new Konva.Ellipse({ x: 13, y: 42, radiusX: 19, radiusY: 8, rotation: -30, fill: '#5b9760' }));
      for (let i = 0; i < 6; i += 1) {
        const angle = i * Math.PI / 3;
        group.add(new Konva.Circle({ x: Math.cos(angle) * 26, y: Math.sin(angle) * 26 - 10, radius: 21, fill: '#b191c5', stroke: '#9e79b5', strokeWidth: 1 }));
      }
      group.add(new Konva.Circle({ y: -10, radius: 22, fill: '#f5ce67' }));
      face(group, -16);
    } else {
      group.add(new Konva.Path({ x: -50, y: -45, data: 'M50 18 C18 -12 -16 28 10 53 L50 91 L90 53 C116 28 82 -12 50 18 Z', fill: '#dc7495', stroke: '#c45d7e', strokeWidth: 2 }));
      face(group, -8);
    }
    group.on('dragstart', () => { group.setAttr('beforeDrag', copy(state)); });
    group.on('dragmove', () => {
      group.position({ x: clamp(group.x(), 58, WIDTH - 58), y: clamp(group.y(), 58, HEIGHT - 64) });
    });
    group.on('dragend', () => {
      const before = group.getAttr('beforeDrag');
      if (sticker.x !== group.x() || sticker.y !== group.y()) {
        sticker.x = group.x();
        sticker.y = group.y();
        remember(before);
        say('贴纸搬到新位置啦。');
      }
    });
    return group;
  }

  function render() {
    inkLayer.destroyChildren();
    stickerLayer.destroyChildren();
    state.strokes.forEach((stroke) => inkLayer.add(strokeNode(stroke)));
    state.stickers.forEach((sticker) => stickerLayer.add(stickerNode(sticker)));
    stickerLayer.listening(tool === 'move');
    stage.batchDraw();
    updateHistoryButtons();
  }

  function resize() {
    const displayWidth = canvasHost.clientWidth;
    if (!displayWidth) return;
    const scale = displayWidth / WIDTH;
    stage.width(displayWidth);
    stage.height(HEIGHT * scale);
    stage.scale({ x: scale, y: scale });
    stage.batchDraw();
  }

  function point() {
    const position = stage.getPointerPosition();
    if (!position) return null;
    return { x: clamp(position.x / stage.scaleX(), 0, WIDTH), y: clamp(position.y / stage.scaleY(), 0, HEIGHT) };
  }

  function finishStroke(event) {
    if (!drawing) return;
    const nativeEvent = event && (event.evt || event);
    if (nativeEvent && nativeEvent.pointerId !== undefined && activePointer !== nativeEvent.pointerId) return;
    const before = drawing.before;
    drawing = null;
    activePointer = null;
    remember(before);
    say(tool === 'eraser' ? '擦好啦！橡皮只擦笔迹，贴纸可以移动。' : '这一笔真不错，继续画吧！');
  }

  function chooseTool(nextTool) {
    finishStroke();
    tool = nextTool;
    document.querySelectorAll('[data-tool]').forEach((button) => {
      const selected = button.dataset.tool === tool;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    canvasHost.classList.toggle('moving', tool === 'move');
    stickerLayer.listening(tool === 'move');
    stickerLayer.getChildren().forEach((node) => node.draggable(tool === 'move'));
    say(tool === 'move' ? '拖动小贴纸，把它搬到喜欢的位置。' : tool === 'eraser' ? '橡皮可以擦掉笔迹，贴纸用“移动贴纸”来搬。' : '用手指或鼠标，画出你的想法。');
  }

  stage.on('pointerdown', (event) => {
    if (tool === 'move' || drawing || event.evt.isPrimary === false) return;
    if (event.evt.button !== undefined && event.evt.button !== 0) return;
    const position = point();
    if (!position) return;
    event.evt.preventDefault();
    const before = copy(state);
    const stroke = { tool, color, width: size, points: [position.x, position.y, position.x + .001, position.y] };
    state.strokes.push(stroke);
    const node = strokeNode(stroke);
    inkLayer.add(node);
    drawing = { node, stroke, before };
    activePointer = event.evt.pointerId;
    if (event.evt.target.setPointerCapture && activePointer !== undefined) {
      try { event.evt.target.setPointerCapture(activePointer); } catch (_) { /* Drawing still works without pointer capture. */ }
    }
    inkLayer.batchDraw();
  });

  stage.on('pointermove', (event) => {
    if (!drawing || (activePointer !== undefined && activePointer !== event.evt.pointerId)) return;
    const position = point();
    if (!position) return;
    event.evt.preventDefault();
    const points = drawing.stroke.points;
    const lastX = points[points.length - 2];
    const lastY = points[points.length - 1];
    if (Math.hypot(position.x - lastX, position.y - lastY) < .8) return;
    points.push(position.x, position.y);
    drawing.node.points(points);
    inkLayer.batchDraw();
  });
  stage.on('pointerup pointercancel', finishStroke);
  window.addEventListener('pointerup', finishStroke);
  window.addEventListener('pointercancel', finishStroke);
  window.addEventListener('blur', finishStroke);

  document.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => chooseTool(button.dataset.tool)));
  document.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => {
    color = button.dataset.color;
    document.querySelectorAll('[data-color]').forEach((swatch) => {
      const selected = swatch === button;
      swatch.classList.toggle('selected', selected);
      swatch.setAttribute('aria-pressed', String(selected));
    });
    chooseTool('brush');
  }));
  document.querySelectorAll('[data-size]').forEach((button) => button.addEventListener('click', () => {
    size = Number(button.dataset.size);
    document.querySelectorAll('[data-size]').forEach((sizeButton) => {
      const selected = sizeButton === button;
      sizeButton.classList.toggle('selected', selected);
      sizeButton.setAttribute('aria-pressed', String(selected));
    });
    say(`换成${button.textContent.trim()}画笔啦。`);
  }));
  document.querySelectorAll('[data-sticker]').forEach((button) => button.addEventListener('click', () => {
    finishStroke();
    if (state.stickers.length >= 40) { say('贴纸已经很多啦，先画几笔吧！'); return; }
    const before = copy(state);
    const offset = state.stickers.length % 6;
    state.stickers.push({ type: button.dataset.sticker, x: 220 + offset * 95, y: 180 + (state.stickers.length % 3) * 80 });
    chooseTool('move');
    render();
    remember(before);
    say('新贴纸来啦！用手指或鼠标拖动它。');
  }));

  undoButton.addEventListener('click', () => {
    finishStroke();
    if (!past.length) return;
    future.push(copy(state));
    state = past.pop();
    render();
    saveDraft();
    say('退回上一步了，放心再试一次。');
  });
  redoButton.addEventListener('click', () => {
    if (!future.length) return;
    past.push(copy(state));
    state = future.pop();
    render();
    saveDraft();
    say('刚刚撤销的那一步回来啦。');
  });
  document.getElementById('clear').addEventListener('click', () => {
    finishStroke();
    if (!state.strokes.length && !state.stickers.length) { say('画布已经是空白的，开始画吧！'); return; }
    if (!window.confirm('要把画布上的画和贴纸都清空吗？清空后还可以点“撤销”。')) return;
    const before = copy(state);
    state = { strokes: [], stickers: [] };
    render();
    remember(before);
    say('换一张新画纸啦！点“撤销”还可以找回刚才的画。');
  });
  document.getElementById('save-png').addEventListener('click', () => {
    finishStroke();
    try {
      // Use the logical paper size so exported quality is independent of screen width.
      const scale = stage.scaleX();
      const data = stage.toDataURL({ pixelRatio: 2 / scale });
      const link = document.createElement('a');
      link.href = data;
      const today = new Date();
      const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      link.download = `我的小小画作-${stamp}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      say('图片准备好了！在下载里找找；手机上也可以长按打开的图片保存。');
    } catch (_) {
      say('图片暂时没有存下来，请稍后再点一次“保存图片”。');
    }
  });

  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (saved && saved.version === 1 && Array.isArray(saved.strokes) && Array.isArray(saved.stickers)) {
      const validStrokes = saved.strokes.filter((stroke) =>
        stroke && ['brush', 'eraser'].includes(stroke.tool) && palette.includes(stroke.color) &&
        [4, 10, 22].includes(stroke.width) && Array.isArray(stroke.points) && stroke.points.length >= 4 &&
        stroke.points.length % 2 === 0 && stroke.points.every((value) => Number.isFinite(value) && value >= 0 && value <= WIDTH + 1));
      const validStickers = saved.stickers.filter((sticker) => sticker && stickerTypes.includes(sticker.type) && Number.isFinite(sticker.x) && Number.isFinite(sticker.y));
      state = { strokes: validStrokes, stickers: validStickers.slice(0, 40).map((sticker) => ({ type: sticker.type, x: clamp(sticker.x, 58, WIDTH - 58), y: clamp(sticker.y, 58, HEIGHT - 64) })) };
      if (state.strokes.length || state.stickers.length) {
        say('欢迎回来！这台设备上的小画作找回来啦。');
        draftStatus.textContent = '已恢复这台设备的草稿，不会上传。';
      }
    }
  } catch (_) {
    storageAvailable = false;
    draftStatus.textContent = '浏览器暂时存不了草稿，离开前记得点“保存图片”。';
  }

  render();
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvasHost);
  else window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => { finishStroke(); if (storageAvailable) saveDraft(); });
})();
