(() => {
  'use strict';
  const storageKey = 'dyson-pixel-v1';
  const palette = [
    ['#315d49','深绿'],['#91b86a','草绿'],['#efcd76','金黄'],['#df9867','橙色'],['#c87989','粉红'],
    ['#729dad','蓝色'],['#9985b8','紫色'],['#685c52','棕色'],['#263f35','墨色'],['#ffffff','白色']
  ];
  const validColors = new Set(palette.map(([color]) => color));
  const presets = {
    heart: ['........','.PP..PP.','PPPPPPPP','PPPPPPPP','.PPPPPP.','..PPPP..','...PP...','........'],
    flower: ['..PPPP..','.PPYYPP.','.PYYYYP.','..PPPP..','...GG...','.G.GG...','..GGG...','...GG...']
  };
  const presetColors = { P: '#c87989', Y: '#efcd76', G: '#91b86a' };
  const $ = selector => document.querySelector(selector);
  const status = $('#pixel-status');
  const draft = $('#pixel-draft');
  const container = $('#pixel-canvas');
  let size = 8, pixels = Array(64).fill(null), color = palette[0][0], tool = 'paint', gridVisible = true;
  let undo = [], redo = [], stroke = null, savePending = false, saveTimer = null;
  let storageAllowed = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && saved.version === 1 && [8,16].includes(saved.size) && Array.isArray(saved.pixels) && saved.pixels.length === saved.size ** 2 && saved.pixels.every(value => value === null || validColors.has(value))) {
      size = saved.size; pixels = [...saved.pixels];
      if (validColors.has(saved.color)) color = saved.color;
      if (saved.tool === 'erase') tool = 'erase';
      gridVisible = saved.grid !== false;
      status.textContent = '上次的像素画还在，接着画吧。';
    }
  } catch { storageAllowed = false; }
  if (!window.Konva) { status.textContent = '画布还没准备好，请刷新页面再试一次。'; return; }
  const stage = new Konva.Stage({container, width: 512, height: 512});
  const layer = new Konva.Layer(); stage.add(layer);
  let cells = [];
  const snapshot = () => ({size, pixels: [...pixels]});
  const same = (a,b) => a.size === b.size && a.pixels.every((value,index) => value === b.pixels[index]);
  function pushUndo(before) { undo.push(before); if (undo.length > 40) undo.shift(); redo = []; }
  function persist() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(storageKey, JSON.stringify({version:1,size,pixels,color,tool,grid:gridVisible})); storageAllowed = true; }
    catch { storageAllowed = false; }
    draft.textContent = storageAllowed ? '像素草稿已记在这台设备上。重要的作品可以下载留存。' : '浏览器暂时不能记住草稿，画画和下载图片仍然可以继续。';
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persist,150); }
  function updateTools() {
    $('#pixel-undo').disabled = undo.length === 0;
    $('#pixel-redo').disabled = redo.length === 0;
    document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.color === color)));
    document.querySelectorAll('[data-tool]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.tool === tool)));
    document.querySelectorAll('[data-size]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.size) === size)));
    $('#toggle-grid').setAttribute('aria-pressed',String(gridVisible));
    $('#toggle-grid').textContent = gridVisible ? '隐藏格线' : '显示格线';
    container.setAttribute('aria-label',`${size}行${size}列的像素画布，可用鼠标或手指涂画`);
  }
  function render() {
    layer.destroyChildren(); cells = [];
    const cell = 512 / size;
    for (let index = 0; index < pixels.length; index++) {
      const shape = new Konva.Rect({x:(index % size)*cell,y:Math.floor(index/size)*cell,width:cell,height:cell,fill:pixels[index] || '#ffffff',stroke:gridVisible?'#dfe5d8':undefined,strokeWidth:1});
      cells.push(shape); layer.add(shape);
    }
    layer.draw(); updateTools();
  }
  function resize() {
    const width = Math.max(1, Math.floor(container.clientWidth));
    stage.size({width,height:width}); stage.scale({x:width/512,y:width/512}); stage.draw();
  }
  function cellAtPointer() {
    const point = stage.getPointerPosition(); if (!point) return null;
    const x = Math.floor(point.x/stage.width()*size), y = Math.floor(point.y/stage.height()*size);
    return x >= 0 && x < size && y >= 0 && y < size ? {x,y} : null;
  }
  function paintCell(x,y) {
    const index = y*size+x; const next = tool === 'erase' ? null : color;
    if (pixels[index] === next) return;
    pixels[index] = next; cells[index].fill(next || '#ffffff');
  }
  function paintTo(point) {
    if (!point || !stroke) return;
    const previous = stroke.last || point;
    let x = previous.x, y = previous.y;
    const dx = Math.abs(point.x-x), dy = -Math.abs(point.y-y), sx = x<point.x?1:-1, sy = y<point.y?1:-1;
    let error = dx+dy;
    while (true) {
      paintCell(x,y); if (x === point.x && y === point.y) break;
      const twice = 2*error;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
    stroke.last = point; layer.batchDraw();
  }
  function finishStroke() {
    if (!stroke) return;
    const before = stroke.before; stroke = null;
    if (!same(before,snapshot())) { pushUndo(before); updateTools(); scheduleSave(); }
  }
  stage.on('pointerdown',event => {
    if (event.evt.button !== 0 || event.evt.isPrimary === false) return;
    const point = cellAtPointer(); if (!point) return;
    finishStroke(); stroke = {before:snapshot(),last:null,id:event.evt.pointerId};
    try { event.evt.target.setPointerCapture(event.evt.pointerId); } catch {}
    paintTo(point); event.evt.preventDefault();
  });
  stage.on('pointermove',event => { if (stroke && event.evt.pointerId === stroke.id) { paintTo(cellAtPointer()); event.evt.preventDefault(); } });
  stage.on('pointerup pointercancel',finishStroke);
  window.addEventListener('pointerup',finishStroke);
  window.addEventListener('pointercancel',finishStroke);
  window.addEventListener('blur',finishStroke);
  function changePicture(next,message) {
    finishStroke(); const before = snapshot();
    size = next.size; pixels = [...next.pixels];
    if (!same(before,next)) pushUndo(before);
    render(); persist(); status.textContent = message;
  }
  const activate = (button,callback) => window.DysonSite.onActivate(button,callback);
  for (const [value,name] of palette) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'color-button'; button.dataset.color = value; button.style.setProperty('--swatch',value); button.setAttribute('aria-label',name); button.title = name;
    const swatch = document.createElement('span'); swatch.setAttribute('aria-hidden','true'); button.append(swatch); $('#pixel-colors').append(button);
    activate(button,()=>{finishStroke();color=value;tool='paint';updateTools();scheduleSave();});
  }
  document.querySelectorAll('[data-tool]').forEach(button=>activate(button,()=>{finishStroke();tool=button.dataset.tool;updateTools();scheduleSave();}));
  document.querySelectorAll('[data-size]').forEach(button=>activate(button,()=>{
    const nextSize = Number(button.dataset.size); if (nextSize === size) return;
    finishStroke();
    if (pixels.some(value=>value!==null) && !confirm('换格子大小会开始一张新画。要继续吗？原来的画可以按“撤销”找回来。')) return;
    changePicture({size:nextSize,pixels:Array(nextSize**2).fill(null)},'新的格子准备好啦。');
  }));
  document.querySelectorAll('[data-preset]').forEach(button=>activate(button,()=>{
    finishStroke(); if (pixels.some(value=>value!==null) && !confirm('小图案会替换当前画作。要继续吗？也可以按“撤销”找回原画。')) return;
    const nextPixels = presets[button.dataset.preset].join('').split('').map(letter=>presetColors[letter] || null);
    changePicture({size:8,pixels:nextPixels},'小图案画好了，换换颜色，让它变成自己的作品。');
  }));
  activate($('#toggle-grid'),()=>{finishStroke();gridVisible=!gridVisible;render();scheduleSave();});
  activate($('#pixel-undo'),()=>{
    finishStroke(); if (!undo.length) return; redo.push(snapshot()); const previous = undo.pop();size=previous.size;pixels=[...previous.pixels];render();persist();status.textContent='已经退回上一步。';
  });
  activate($('#pixel-redo'),()=>{
    finishStroke(); if (!redo.length) return; undo.push(snapshot());const next=redo.pop();size=next.size;pixels=[...next.pixels];render();persist();status.textContent='这一步又回来了。';
  });
  activate($('#pixel-clear'),()=>{
    finishStroke();if (!pixels.some(value=>value!==null)) {status.textContent='画布已经是空白的啦。';return;}
    if (!confirm('要清空这张像素画吗？清空后还可以按“撤销”找回来。')) return;
    changePicture({size,pixels:Array(size**2).fill(null)},'画布清空啦，新的点子可以开始了。');
  });
  async function png() {
    finishStroke();
    const canvas = document.createElement('canvas');canvas.width=1024;canvas.height=1024;
    const context = canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,1024,1024);
    const cell = 1024/size;
    pixels.forEach((value,index)=>{if(value){context.fillStyle=value;context.fillRect(index%size*cell,Math.floor(index/size)*cell,cell,cell);}});
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片还没准备好，请再试一次。')),'image/png'));
  }
  function pictureName() { return '我的像素画 '+new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()); }
  activate($('#pixel-download'),async()=>{
    try {
      const blob=await png();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='Dyson-像素画.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='图片已经准备下载啦，保存的是清楚的 1024 × 1024 PNG。';
    } catch(error){status.textContent=error.message || '暂时没能准备好图片，请再试一次。';}
  });
  activate($('#pixel-save-album'),async()=>{
    if (savePending) return;savePending=true;$('#pixel-save-album').disabled=true;status.textContent='正在收进相册……';
    try {const blob=await png();await window.DysonArtworks.save({name:pictureName(),blob,width:1024,height:1024});status.textContent='已经存到相册啦！点“去看我的画作”就能看到。';}
    catch(error){status.textContent=error.message || '浏览器暂时不能保存画作，请先下载图片。';}
    finally{savePending=false;$('#pixel-save-album').disabled=false;}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finishStroke();persist();}});
  window.addEventListener('pagehide',()=>{finishStroke();persist();});
  const mobileLayout = matchMedia('(max-width:800px)');
  function placeBrushTools() {
    finishStroke();
    const tools = $('#pixel-brush-tools');
    if (mobileLayout.matches) container.before(tools);
    else $('.pixel-tools').prepend(tools);
    resize();
  }
  mobileLayout.addEventListener('change',placeBrushTools);
  render();placeBrushTools();new ResizeObserver(resize).observe(container);
  if (!storageAllowed) draft.textContent='浏览器暂时不能记住草稿，画画和下载图片仍然可以继续。';
  window.DysonPixel=Object.freeze({getState:()=>({version:1,...snapshot(),color,tool,grid:gridVisible}),exportPNG:png});
})();
