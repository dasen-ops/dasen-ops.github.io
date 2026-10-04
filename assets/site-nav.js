/* Shared site navigation. No network requests or third-party dependencies. */
(function () {
  'use strict';

  const script = document.currentScript || Array.from(document.scripts).reverse().find(function (entry) {
    return /(?:^|\/)site-nav\.js(?:[?#]|$)/.test(entry.src || '');
  });
  let sourceURL;
  try {
    if (script && script.src) {
      sourceURL = new URL(script.src, document.baseURI);
    } else {
      // Also works when the script was loaded dynamically and currentScript is absent.
      const backLink = document.querySelector('a.back-link[href]');
      const homeURL = backLink ? new URL(backLink.getAttribute('href'), document.baseURI) : new URL('index.html', document.baseURI);
      sourceURL = new URL('assets/site-nav.js', homeURL);
    }
  } catch (_) {
    return;
  }

  function mountNavigation() {
    if (document.querySelector('nav.site-nav')) return;
    const main = document.querySelector('main');
    if (!main || !document.body) return;

    const siteRoot = new URL('../', sourceURL);
    const currentURL = new URL(window.location.href);
    const route = currentURL.pathname.indexOf(siteRoot.pathname) === 0
      ? currentURL.pathname.slice(siteRoot.pathname.length)
      : currentURL.pathname;
    const inferredSection = /(?:^|\/)games\//.test(route) ? 'games'
      : /(?:^|\/)draw\//.test(route) ? 'draw'
      : /(?:^|\/)album\//.test(route) ? 'album'
      : /(?:^|\/)articles\//.test(route) ? 'talk'
      : 'home';
    const section = document.body.dataset.siteSection || inferredSection;
    const items = [
      { key: 'home', label: '首页', path: '../index.html' },
      { key: 'games', label: '小游戏', path: '../index.html#games' },
      { key: 'draw', label: '创作角', path: '../index.html#creative' },
      { key: 'album', label: '相册', path: '../album/index.html' },
      { key: 'talk', label: '闲聊', path: '../index.html#talk' }
    ];

    const nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.dataset.siteNav = '';
    nav.setAttribute('aria-label', '小空间站内导航');
    const inner = document.createElement('div');
    inner.className = 'site-nav__inner';
    items.forEach(function (item) {
      const link = document.createElement('a');
      link.className = 'site-nav__link';
      link.href = new URL(item.path, sourceURL).href;
      link.textContent = item.label;
      link.dataset.siteSection = item.key;
      if (item.key === section) {
        link.classList.add('site-nav__link--current');
        link.setAttribute('aria-current', 'location');
      }
      inner.appendChild(link);
    });
    nav.appendChild(inner);
    main.parentNode.insertBefore(nav, main);

    const site = window.DysonSite;
    const game = site && site.currentGame;
    const backLink = main.querySelector('a.back-link');
    if (game && backLink && typeof site.isFavorite === 'function' && typeof site.toggleFavorite === 'function') {
      const favorite = document.createElement('button');
      favorite.type = 'button';
      favorite.className = 'site-nav__favorite';
      favorite.dataset.siteFavorite = game;
      let lastTouchActivation = -Infinity;
      function returnPointerFocus() {
        const board = main.querySelector('.game-container[tabindex]');
        if (board) board.focus({ preventScroll: true });
      }
      function updateFavorite() {
        const selected = site.isFavorite(game);
        favorite.textContent = selected ? '★ 已收藏' : '☆ 收藏游戏';
        favorite.setAttribute('aria-pressed', String(selected));
        favorite.title = selected ? '再点一次，取消收藏' : '收藏后可以在首页快速找到';
      }
      function activateFavorite(pointerActivation) {
        const result = site.toggleFavorite(game);
        updateFavorite();
        if (result && result.persisted === false) favorite.title = '本次可以收藏；浏览器未允许保存，关闭后可能不会保留。';
        if (pointerActivation) returnPointerFocus();
      }
      favorite.addEventListener('pointerup', function (event) {
        if (event.pointerType !== 'touch') return;
        const bounds = favorite.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
        lastTouchActivation = performance.now();
        event.preventDefault();
        activateFavorite(true);
      });
      favorite.addEventListener('click', function (event) {
        if (event.detail > 0 && performance.now() - lastTouchActivation < 700) {
          returnPointerFocus();
          return;
        }
        activateFavorite(event.detail > 0);
      });
      window.addEventListener('dyson-site-change', updateFavorite);
      updateFavorite();
      backLink.insertAdjacentElement('afterend', favorite);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNavigation, { once: true });
  } else {
    mountNavigation();
  }
})();
