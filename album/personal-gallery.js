(() => {
  'use strict';

  const gallery = document.getElementById('personal-gallery');
  const empty = document.getElementById('personal-empty');
  const status = document.getElementById('personal-status');
  if (!gallery || !empty || !status) return;
  let objectURLs = [];
  let lightbox = null;
  let generation = 0;
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });

  function cleanup() {
    if (lightbox) { lightbox.destroy(); lightbox = null; }
    objectURLs.forEach((url) => URL.revokeObjectURL(url));
    objectURLs = [];
  }

  if (!empty.querySelector('a')) {
    const prompt = document.createElement('p');
    prompt.textContent = '这里还没有你的画作。去小小画室画一张，再点“存到相册”吧！';
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = '../draw/index.html';
    link.textContent = '去小小画室';
    empty.replaceChildren(prompt, link);
  }

  function makeCard(artwork) {
    const url = URL.createObjectURL(artwork.blob);
    objectURLs.push(url);
    const card = document.createElement('figure');
    card.className = 'personal-artwork';
    const link = document.createElement('a');
    link.href = url;
    link.dataset.pswpWidth = String(artwork.width);
    link.dataset.pswpHeight = String(artwork.height);
    link.setAttribute('aria-label', `放大 ${artwork.name}`);
    const image = document.createElement('img');
    image.src = url;
    image.width = artwork.width;
    image.height = artwork.height;
    image.alt = artwork.name;
    image.loading = 'lazy';
    const caption = document.createElement('figcaption');
    const title = document.createElement('span');
    title.textContent = artwork.name;
    const date = document.createElement('small');
    date.textContent = `${dateFormatter.format(new Date(artwork.createdAt))} · 这台设备上的作品`;
    caption.append(title, date);
    link.append(image, caption);
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'artwork-delete';
    removeButton.textContent = '删除作品';
    removeButton.setAttribute('aria-label', `删除 ${artwork.name}`);
    removeButton.addEventListener('click', async () => {
      if (!window.confirm(`要从这台设备的相册中删除“${artwork.name}”吗？删除后无法找回，已下载的图片不会被删除。`)) return;
      removeButton.disabled = true;
      try {
        await window.DysonArtworks.remove(artwork.id);
        await load();
        status.textContent = '这张作品已从本机相册删除。还可以去画一张新的。';
      } catch (error) {
        removeButton.disabled = false;
        status.textContent = error.message || '这张作品暂时没能删除，请稍后再试。';
      }
    });
    const actions = document.createElement('div');
    actions.className = 'artwork-actions';
    const downloadLink = document.createElement('a');
    downloadLink.className = 'artwork-download';
    downloadLink.href = url;
    downloadLink.download = `${String(artwork.name).replace(/[\\/:*?"<>|]/g, '-')}.png`;
    downloadLink.textContent = '下载图片';
    downloadLink.setAttribute('aria-label', `下载 ${artwork.name}`);
    actions.append(downloadLink, removeButton);
    card.append(link, actions);
    return card;
  }

  function initLightbox() {
    if (!window.PhotoSwipeLightbox || !window.PhotoSwipe) return;
    lightbox = new window.PhotoSwipeLightbox({
      gallery, children: 'a[data-pswp-width]', pswpModule: window.PhotoSwipe,
      bgOpacity: .92, showHideAnimationType: 'fade',
      closeTitle: '关闭相册', zoomTitle: '放大或缩小', arrowPrevTitle: '上一张', arrowNextTitle: '下一张',
      errorMsg: '这张作品暂时打不开，先看看其他作品吧。',
      padding: { top: 50, bottom: 45, left: 15, right: 15 },
    });
    lightbox.init();
  }

  async function load() {
    const current = ++generation;
    if (!window.DysonArtworks) {
      status.textContent = '本机相册暂时没有打开，稍后刷新试试；画画和下载仍然可以继续。';
      return;
    }
    try {
      const artworks = await window.DysonArtworks.list();
      if (current !== generation) return;
      cleanup();
      gallery.replaceChildren();
      artworks.forEach((artwork) => gallery.appendChild(makeCard(artwork)));
      empty.hidden = artworks.length > 0;
      status.textContent = artworks.length
        ? `这里有 ${artworks.length} / 12 张你的作品。只保存在这台设备和当前浏览器里，不会上传。`
        : '相册只保存在这台设备和当前浏览器里，不会上传。';
      if (artworks.length) initLightbox();
    } catch (error) {
      if (current !== generation) return;
      status.textContent = error.message || '浏览器暂时打不开本机相册，请稍后再试。';
    }
  }

  window.addEventListener('pagehide', () => { generation += 1; cleanup(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) load(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  load();
})();
