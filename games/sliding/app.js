/* Adapted from iditri08/8PuzzleGame play.html, MIT, Copyright (c) 2026 Iditri Datta.
 * Exact upstream snapshot, reuse boundaries and license: SOURCE.md / source-play.txt / LICENSE.
 */
(() => {
  'use strict';
  const GOAL = [1,2,3,4,5,6,7,8,0];
  const STORAGE_KEY = 'dyson-sliding-v1';
  const DEPTH = {easy:10,hard:50};
  const MAX_UNDO = 200;
  const board = document.getElementById('board');
  const status = document.getElementById('game-status');
  const undoButton = document.getElementById('undo-button');
  const activate = window.DysonSite?.onActivate || ((button, callback) => button.addEventListener('click', callback));
  const bindAction = (button,callback) => {
    activate(button,event=>{callback(event);board.focus({preventScroll:true});});
    // A compatibility mousedown can refocus the button after a touch release.
    // Restore board focus without running the action again on its deduplicated click.
    button.addEventListener('click',event=>{if(event.detail>0)board.focus({preventScroll:true});});
  };
  const solved = a => a.join() === GOAL.join();
  const distance = a => a.reduce((total,n,index)=>n ? total+Math.abs(Math.floor(index/3)-Math.floor((n-1)/3))+Math.abs(index%3-(n-1)%3) : total,0);

  // Upstream inversion-parity test: a 3x3 puzzle is solvable iff this count is even.
  function solvable(a){
    const f=a.filter(x=>x!==0); let c=0;
    for(let i=0;i<f.length;i++) for(let j=i+1;j<f.length;j++) if(f[i]>f[j]) c++;
    return c%2===0;
  }
  // Upstream move adjacency rule, separated from rendering and counting.
  function canMove(idx, tiles){
    const bi=tiles.indexOf(0);
    const row=i=>Math.floor(i/3);
    const ok=idx===bi-3||idx===bi+3||(idx===bi-1&&row(idx)===row(bi))||(idx===bi+1&&row(idx)===row(bi));
    return idx>=0&&idx<9&&ok;
  }
  const validTiles = a => Array.isArray(a) && a.length===9 && a.every(n=>Number.isInteger(n)&&n>=0&&n<=8) && new Set(a).size===9 && solvable(a);
  function shuffle(difficulty, previous) {
    // Walk legally from the goal rather than assigning arbitrary permutations.
    // This guarantees a reachable puzzle and bounds the shuffle depth for children.
    for (let attempt=0;attempt<20;attempt++) {
      const tiles=[...GOAL], visited=new Set([tiles.join()]);
      let lastBlank=-1;
      for(let step=0;step<DEPTH[difficulty];step++) {
        const blank=tiles.indexOf(0);
        let options=tiles.flatMap((n,index)=>index!==lastBlank&&canMove(index,tiles)?[index]:[]);
        const fresh=options.filter(index=>{
          const next=[...tiles];[next[blank],next[index]]=[next[index],next[blank]];
          return !visited.has(next.join());
        });
        if(fresh.length) options=fresh;
        const index=options[Math.floor(Math.random()*options.length)];
        [tiles[blank],tiles[index]]=[tiles[index],tiles[blank]];
        lastBlank=blank;visited.add(tiles.join());
      }
      if(!solved(tiles)&&solvable(tiles)&&(difficulty==='easy'||distance(tiles)>=12)&&(!previous||tiles.join()!==previous.join())) return tiles;
    }
    // A deterministic, solvable fallback if a browser supplies unusual random values.
    const fallback=difficulty==='hard'?[8,6,7,2,5,4,3,0,1]:[1,2,3,4,5,6,0,7,8];
    return previous?.join()===fallback.join()?(difficulty==='hard'?[8,6,7,2,5,4,0,3,1]:[1,2,3,4,5,6,7,0,8]):fallback;
  }
  const freshRecord = () => ({version:1,difficulty:'easy',wins:0,bestMoves:{easy:null,hard:null},game:null});
  function readRecord() {
    const result=freshRecord();
    try {
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(!saved||saved.version!==1) return result;
      if(['easy','hard'].includes(saved.difficulty))result.difficulty=saved.difficulty;
      if(Number.isSafeInteger(saved.wins)&&saved.wins>=0)result.wins=saved.wins;
      for(const difficulty of ['easy','hard']) {
        const best=saved.bestMoves?.[difficulty];
        if(Number.isSafeInteger(best)&&best>0)result.bestMoves[difficulty]=best;
      }
      const game=saved.game;
      if(!game||!validTiles(game.tiles)||!validTiles(game.initial)||solved(game.initial)||!Number.isSafeInteger(game.moves)||game.moves<0||!Array.isArray(game.undo)||game.undo.length>MAX_UNDO||game.undo.length>game.moves||typeof game.credited!=='boolean')return result;
      // Check every stored undo step against the current board before allowing it.
      const rewind=[...game.tiles];
      for(let i=game.undo.length-1;i>=0;i--) {
        const index=game.undo[i];
        if(!Number.isInteger(index)||!canMove(index,rewind))return result;
        const blank=rewind.indexOf(0);[rewind[blank],rewind[index]]=[rewind[index],rewind[blank]];
      }
      if(game.moves===game.undo.length&&rewind.join()!==game.initial.join())return result;
      if(solved(game.tiles)&&(!game.credited||game.moves===0))return result;
      result.game={tiles:[...game.tiles],initial:[...game.initial],moves:game.moves,undo:[...game.undo],credited:game.credited};
    } catch (_) { /* A malformed or unavailable save starts a fresh, playable puzzle. */ }
    return result;
  }
  let record=readRecord();
  let message=record.game?'接着上次这一题，慢慢想就好。':'点亮边的数字，把它滑进空格。';
  const tileButtons=GOAL.map((_,index)=>{
    const button=document.createElement('button');
    button.type='button';button.className='tile';button.dataset.index=index;
    bindAction(button,()=>move(index));
    board.appendChild(button);return button;
  });
  function save() {
    let persisted=true;
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(record));}
    catch (_){
      persisted=false;
      document.getElementById('storage-note').textContent='这次可以正常玩；浏览器未允许保存，题目和记录暂时留在这一页。';
    }
    window.dispatchEvent(new CustomEvent('dyson-site-change',{detail:{persisted}}));
    return persisted;
  }
  function render() {
    const game=record.game, complete=solved(game.tiles);
    tileButtons.forEach((button,index)=>{
      const value=game.tiles[index], allowed=value!==0&&canMove(index,game.tiles)&&!complete;
      button.textContent=value||'空格';
      button.className='tile'+(!value?' blank':'')+(allowed?' can-move':'')+(value===GOAL[index]?' in-place':'');
      button.disabled=value===0||complete;
      button.tabIndex=allowed?0:-1;
      button.setAttribute('aria-label',value?'数字 '+value+'，第 '+(Math.floor(index/3)+1)+' 行，第 '+(index%3+1)+' 列'+(allowed?'，可以滑进空格':''):'空格');
    });
    board.classList.toggle('is-complete',complete);
    board.dataset.complete=String(complete);
    document.getElementById('move-count').textContent=game.moves;
    document.getElementById('wins').textContent=record.wins;
    document.getElementById('best-moves').textContent=record.bestMoves[record.difficulty]??'—';
    document.getElementById('best-unit').textContent=record.bestMoves[record.difficulty]===null?'':'步';
    undoButton.disabled=game.undo.length===0;
    document.querySelectorAll('[data-difficulty]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.difficulty===record.difficulty)));
    status.textContent=complete?'排好啦！你用了 '+game.moves+' 步。可以换一题，也能撤销再看看。':message;
    board.setAttribute('aria-label','数字滑块棋盘，走了 '+game.moves+' 步。方向键移动空格，按顺序排列1到8。');
  }
  function finish() {
    const game=record.game;
    const firstWin=!game.credited;
    if(firstWin){record.wins++;game.credited=true;}
    const best=record.bestMoves[record.difficulty];
    if(best===null||game.moves<best)record.bestMoves[record.difficulty]=game.moves;
    const persisted=save();
    if(firstWin)window.dispatchEvent(new CustomEvent('dyson-sliding-complete',{detail:{wins:record.wins,moves:game.moves,difficulty:record.difficulty,persisted}}));
    if(typeof window.DysonCelebrate==='function')window.DysonCelebrate();
  }
  function move(index) {
    const game=record.game;
    if(solved(game.tiles))return false;
    if(!canMove(index,game.tiles)) {message='只有紧挨空格的数字才能移动哦。';render();return false;}
    const bi=game.tiles.indexOf(0);
    game.undo.push(bi);if(game.undo.length>MAX_UNDO)game.undo.shift();
    // The original move swap and counter are preserved.
    const tiles=game.tiles;[tiles[bi],tiles[index]]=[tiles[index],tiles[bi]];
    game.moves++;
    message='挪好了！想一想，接下来移动哪一个？';
    if(solved(tiles))finish();else save();
    render();return true;
  }
  function undo() {
    const game=record.game;
    if(!game.undo.length)return;
    const index=game.undo.pop(),blank=game.tiles.indexOf(0);
    [game.tiles[blank],game.tiles[index]]=[game.tiles[index],game.tiles[blank]];
    game.moves--;message='退回上一步了，换个办法试试。';save();render();
  }
  function restart() {
    const game=record.game;game.tiles=[...game.initial];game.moves=0;game.undo=[];
    message='回到这题最开始啦，换个办法试试。';save();render();
  }
  function newPuzzle(difficulty=record.difficulty) {
    const tiles=shuffle(difficulty,record.game?.initial);
    record.difficulty=difficulty;
    record.game={tiles:[...tiles],initial:[...tiles],moves:0,undo:[],credited:false};
    message='新的一题！点亮边的数字，把它滑进空格。';save();render();
  }
  bindAction(undoButton,undo);
  bindAction(document.getElementById('restart-button'),restart);
  bindAction(document.getElementById('new-button'),()=>newPuzzle());
  document.querySelectorAll('[data-difficulty]').forEach(button=>bindAction(button,()=>{
    if(button.dataset.difficulty!==record.difficulty)newPuzzle(button.dataset.difficulty);
  }));
  document.addEventListener('keydown',event=>{
    if(document.hidden||event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.target.isContentEditable)return;
    const interactive=event.target.closest?.('a,button,input,textarea,select,[role="button"]');
    if(interactive&&!board.contains(interactive))return;
    const blank=record.game.tiles.indexOf(0);
    const offsets={ArrowUp:-3,ArrowDown:3,ArrowLeft:-1,ArrowRight:1};
    if(event.key in offsets){event.preventDefault();move(blank+offsets[event.key]);}
    else if(event.code==='KeyZ'){event.preventDefault();undo();}
    else if(event.code==='KeyR'){event.preventDefault();restart();}
  });
  window.DysonSliding=Object.freeze({storageKey:STORAGE_KEY,getState:()=>JSON.parse(JSON.stringify({...record,complete:solved(record.game.tiles)}))});
  if(!record.game)newPuzzle();else render();
})();
