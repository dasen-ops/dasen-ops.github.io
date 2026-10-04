(() => {
  'use strict';
  let last = -Infinity;
  window.DysonCelebrate = () => {
    if (!window.confetti || document.hidden || performance.now() - last < 1200) return;
    last = performance.now();
    window.confetti({ particleCount: 65, spread: 70, startVelocity: 26, ticks: 100,
      origin: { x: .5, y: .55 }, colors: ['#39734d', '#f7d368', '#dc7495', '#5d9dc2'],
      disableForReducedMotion: true, zIndex: 500 });
  };
  window.addEventListener('pagehide', () => { if (window.confetti) window.confetti.reset(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && window.confetti) window.confetti.reset(); });
})();
