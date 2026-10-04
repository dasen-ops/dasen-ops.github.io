(() => {
  'use strict';
  const script = document.currentScript;
  const rootURL = new URL('../', script.src);
  const currentGame = script.dataset.game || null;
  const games = [
    { id: 'snake', name: '水果贪吃蛇', icon: '🐍', href: 'https://dyson-snake-rank-d7emszy6bdd3b85-1488624432.tcloudbaseapp.com/', keywords: '贪吃蛇 水果 花园 冒险 snake' },
    { id: '2048', name: '数字合合乐', icon: '🔢', href: 'games/2048/index.html', keywords: '2048 数字 合成 益智' },
    { id: 'memory', name: '记忆方格', icon: '🟦', href: 'games/memory/index.html', keywords: '记忆 方格 眼力 益智 memory' },
    { id: 'breakout', name: '打砖块', icon: '🧱', href: 'games/breakout/index.html', keywords: '打砖块 弹球 反应 breakout' },
    { id: 'sokoban', name: '推箱子', icon: '📦', href: 'games/sokoban/index.html', keywords: '推箱子 箱子 解谜 关卡 sokoban' },
    { id: 'connect4', name: '四子棋', icon: '🔴', href: 'games/connect4/index.html', keywords: '四子棋 棋盘 双人 电脑 连线 connect4' }
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
  const gameRecord = id => {
    if (id === 'snake') return '在线花园 · 含排行榜';
    if (id === 'sokoban') {
      try {
        const saved = JSON.parse(localStorage.getItem('dyson-sokoban-v1'));
        const completed = saved?.version === 1 && saved.completed && typeof saved.completed === 'object' ? saved.completed : {};
        const count = Object.keys(completed).filter(level => /^[1-7]$/.test(level) && Number.isInteger(completed[level]?.moves) && completed[level].moves >= 0).length;
        return count ? '已完成：' + count + ' / 7 关' : '';
      } catch { return ''; }
    }
    if (id === 'connect4') {
      try {
        const saved = JSON.parse(localStorage.getItem('dyson-connect4-v1'));
        const wins = saved && saved.version === 1 ? Number(saved.wins?.ai) : 0;
        return Number.isSafeInteger(wins) && wins > 0 ? '已战胜电脑：' + wins + ' 局' : '';
      } catch { return ''; }
    }
    const score = bestScore(id);
    return score > 0 ? '本机最高分：' + score : '';
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
    isFavorite, toggleFavorite, visit, bestScore, gameRecord, onActivate,
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
