(() => {
  if (!window.PhotoSwipeLightbox || !window.PhotoSwipe) return;
  const gallery = document.querySelector('[data-gallery], #home-gallery');
  if (!gallery) return;
  const lightbox = new PhotoSwipeLightbox({
    gallery, children: 'a[data-pswp-width]', pswpModule: PhotoSwipe,
    bgOpacity: .92, showHideAnimationType: 'fade',
    closeTitle: '关闭相册', zoomTitle: '放大或缩小', arrowPrevTitle: '上一张', arrowNextTitle: '下一张',
    errorMsg: '这张图片暂时打不开，可以先看看下一张。',
    padding: {top: 50, bottom: 45, left: 15, right: 15}
  });
  lightbox.init();
})();
