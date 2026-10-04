(() => {
  'use strict';
  const site = window.DysonSite;
  if (!site) return;
  const cards = [...document.querySelectorAll('.game-card[data-game]')];
  const search = document.querySelector('#game-search');
  const filters = [...document.querySelectorAll('[data-game-filter]')];
  const empty = document.querySelector('#game-empty');
  const count = document.querySelector('#game-count');
  const status = document.querySelector('#catalog-status');
  const recents = document.querySelector('#recent-games');
  let filter = 'all';

  for (const card of cards) {
    const id = card.dataset.game;
    const badge = document.createElement('div');
    badge.className = 'game-badge-row';
    const pill = card.querySelector('.pill');
    pill.before(badge);
    badge.append(pill);
    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = 'game-favorite';
    favorite.dataset.favorite = id;
    site.onActivate(favorite, () => {
      const result = site.toggleFavorite(id);
      const name = site.games.find(game => game.id === id).name;
      status.textContent = (result.favorite ? '已收藏' : '已取消收藏') + '「' + name + '」。' +
        (result.persisted ? '' : '浏览器暂时不能保存，关闭页面后可能会消失。');
    });
    badge.append(favorite);
    const score = document.createElement('p');
    score.className = 'game-best';
    score.dataset.score = id;
    card.querySelector('.play').after(score);
    card.querySelector('.play').addEventListener('click', () => site.visit(id));
  }

  const update = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      const id = card.dataset.game;
      const game = site.games.find(item => item.id === id);
      const favorite = site.isFavorite(id);
      const button = card.querySelector('[data-favorite]');
      button.textContent = favorite ? '★' : '☆';
      button.setAttribute('aria-pressed', String(favorite));
      button.setAttribute('aria-label', (favorite ? '取消收藏' : '收藏') + game.name);
      button.title = (favorite ? '取消收藏' : '收藏') + game.name;
      const matches = (game.name + ' ' + game.keywords + ' ' + card.querySelector('p').textContent).toLocaleLowerCase().includes(query);
      card.hidden = !matches || (filter === 'favorites' && !favorite);
      if (!card.hidden) visible++;
      const score = site.bestScore(id);
      card.querySelector('[data-score]').textContent = score === null ? '在线花园 · 含排行榜' : score > 0 ? '本机最高分：' + score : '来创造你的新纪录';
    }
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.gameFilter === filter)));
    count.textContent = visible + ' 款小游戏';
    empty.hidden = visible > 0;
    empty.querySelector('p').textContent = query ? '还没有找到这个游戏，换个名字试试吧。' : '还没有收藏。点游戏旁的 ☆，就能把它放到这里。';
    const recentList = document.querySelector('#recent-links');
    recentList.replaceChildren();
    for (const item of site.recent()) {
      const game = site.games.find(value => value.id === item.id);
      const link = document.createElement('a');
      link.href = new URL(game.href, site.rootURL).href;
      link.textContent = game.icon + ' ' + game.name;
      link.addEventListener('click', () => site.visit(game.id));
      recentList.append(link);
    }
    recents.hidden = recentList.childElementCount === 0;
  };
  search.addEventListener('input', update);
  filters.forEach(button => site.onActivate(button, () => { filter = button.dataset.gameFilter; update(); }));
  site.onActivate(document.querySelector('#reset-games'), () => {
    search.value = ''; filter = 'all'; update(); search.focus();
  });
  window.addEventListener('dyson-site-change', update);
  window.addEventListener('pageshow', update);
  document.querySelector('#catalog-tools').hidden = false;
  update();
})();
