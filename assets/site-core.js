(() => {
  'use strict';
  const script = document.currentScript;
  const rootURL = new URL('../', script.src);
  const currentGame = script.dataset.game || null;
  const games = [
    { id: 'snake', name: '水果贪吃蛇', icon: '🐍', href: 'https://dyson-snake-rank-d7emszy6bdd3b85-1488624432.tcloudbaseapp.com/', keywords: '贪吃蛇 水果 花园 冒险 snake' },
    { id: '2048', name: '数字合合乐', icon: '🔢', href: 'games/2048/index.html', keywords: '2048 数字 合成 益智' },
    { id: 'memory', name: '记忆方格', icon: '🟦', href: 'games/memory/index.html', keywords: '记忆 方格 眼力 益智 memory' },
    { id: 'breakout', name: '打砖块', icon: '🧱', href: 'games/breakout/index.html', keywords: '打砖块 弹球 反应 breakout' }
  ];
  const key = 'dyson-site-v1';
  const validId = id => games.some(game => game.id === id);
  const empty = () => ({ version: 1, favorites: [], recent: [] });
  let state = empty();
  const read = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(key));
      if (!raw || raw.version !== 1) return empty();
      return {
        version: 1,
        favorites: Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(validId))] : [],
        recent: Array.isArray(raw.recent) ? raw.recent.filter(item => item && validId(item.id) && Number.isFinite(item.at))
          .sort((a, b) => b.at - a.at).filter((item, index, all) => all.findIndex(other => other.id === item.id) === index).slice(0, 4) : []
      };
    } catch { return empty(); }
  };
  state = read();
  const emit = persisted => window.dispatchEvent(new CustomEvent('dyson-site-change', { detail: { persisted } }));
  const write = () => {
    let persisted = true;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { persisted = false; }
    emit(persisted);
    return persisted;
  };
  const isFavorite = id => state.favorites.includes(id);
  const toggleFavorite = id => {
    if (!validId(id)) return { favorite: false, persisted: false };
    state.favorites = isFavorite(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id];
    const persisted = write();
    return { favorite: isFavorite(id), persisted };
  };
  const visit = id => {
    if (!validId(id)) return false;
    state.recent = [{ id, at: Date.now() }, ...state.recent.filter(item => item.id !== id)].slice(0, 4);
    return write();
  };
  const scoreAt = storageKey => {
    try {
      const value = Number(localStorage.getItem(storageKey));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch { return 0; }
  };
  const bestScore = id => {
    if (id === '2048') return scoreAt('xingya.2048.bestScore');
    if (id === 'breakout') return scoreAt('dyson-breakout-best');
    if (id === 'memory') return Math.max(...['easy', 'normal', 'hard'].map(level => scoreAt('xingya.memory.best.' + level)));
    return null;
  };
  // Some mobile browsers suppress the next compatibility click after canvas dragging.
  const onActivate = (button, callback) => {
    let start = null, lastTouch = -Infinity;
    button.addEventListener('pointerdown', event => {
      if (!button.disabled && event.isPrimary && ['touch', 'pen'].includes(event.pointerType)) {
        start = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }
    });
    button.addEventListener('pointercancel', () => { start = null; });
    button.addEventListener('pointerup', event => {
      if (!start || event.pointerId !== start.id) return;
      const bounds = button.getBoundingClientRect();
      const tap = !button.disabled && Math.max(Math.abs(start.x - event.clientX), Math.abs(start.y - event.clientY)) < 16 &&
        event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      start = null;
      if (tap) { lastTouch = performance.now(); event.preventDefault(); callback(event); }
    });
    button.addEventListener('click', event => {
      if (button.disabled || (event.detail > 0 && performance.now() - lastTouch < 700)) return;
      callback(event);
    });
  };
  window.DysonSite = Object.freeze({
    currentGame, games: Object.freeze(games.map(game => Object.freeze(game))), rootURL,
    isFavorite, toggleFavorite, visit, bestScore, onActivate,
    recent: () => state.recent.map(item => ({ ...item }))
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { state = read(); emit(true); }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { state = read(); emit(true); }
  });
  if (validId(currentGame)) visit(currentGame);
})();
