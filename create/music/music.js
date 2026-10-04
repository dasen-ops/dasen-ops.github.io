(() => {
  'use strict';
  const STORAGE_KEY = 'dyson-music-draft-v1';
  const app = document.getElementById('music-app');
  const playButton = document.getElementById('play-music');
  const stopButton = document.getElementById('stop-music');
  const tempoInput = document.getElementById('music-tempo');
  const volumeInput = document.getElementById('music-volume');
  const status = document.getElementById('music-status');
  const draftStatus = document.getElementById('draft-status');
  const beatDisplay = document.getElementById('beat-display');
  const tracks = [
    { name: '咚咚鼓', hint: '稳稳的脚步', icon: '●', color: '#315d49', soft: '#e6efe5' },
    { name: '沙沙铃', hint: '轻轻的雨声', icon: '✺', color: '#976b26', soft: '#faf0d7' },
    { name: '小星音', hint: '亮亮的旋律', icon: '✦', color: '#655787', soft: '#eee9f6' }
  ];
  const presets = {
    walk: { tempo: 100, pattern: [[1,0,0,0,1,0,0,0],[0,0,1,0,0,0,1,0],[1,0,0,1,0,0,1,0]] },
    rain: { tempo: 80, pattern: [[1,0,0,0,0,0,1,0],[0,1,0,1,0,1,0,1],[0,0,1,0,1,0,0,1]] },
    stars: { tempo: 140, pattern: [[1,0,1,0,1,0,1,0],[0,1,0,1,0,1,0,1],[1,0,1,1,0,1,0,1]] }
  };
  const copyPattern = pattern => pattern.map(row => row.map(Boolean));
  const validDraft = value => value && value.version === 1 && Number.isFinite(value.tempo) && value.tempo >= 60 && value.tempo <= 180 &&
    Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 50 && Array.isArray(value.pattern) &&
    value.pattern.length === 3 && value.pattern.every(row => Array.isArray(row) && row.length === 8 && row.every(cell => typeof cell === 'boolean'));
  let draft = { version: 1, tempo: 100, volume: 25, pattern: copyPattern(presets.walk.pattern) };
  let phase = 'idle';
  let token = 0;
  let nextStep = 0;
  let audio = null;
  let watchedContext = false;
  const buttons = [];
  const onActivate = window.DysonSite && window.DysonSite.onActivate
    ? window.DysonSite.onActivate : (button, action) => button.addEventListener('click', action);

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (validDraft(saved)) {
      draft = { version: 1, tempo: saved.tempo, volume: saved.volume, pattern: copyPattern(saved.pattern) };
      status.textContent = '上次的节奏已经回来了。按播放，继续创作吧！';
    }
  } catch (_) { /* An unavailable or damaged draft never blocks music. */ }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      draftStatus.textContent = '节奏已记在这台设备的浏览器里，不会上传。下载后可用“打开节奏”继续玩。';
    } catch (_) {
      draftStatus.textContent = '这次浏览器没能记住草稿。你仍可以播放，也可以下载节奏文件。';
    }
  }
  function renderPattern() {
    buttons.forEach((row, rowIndex) => row.forEach((button, step) => {
      const selected = draft.pattern[rowIndex][step];
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${tracks[rowIndex].name}，第 ${step + 1} 拍，${selected ? '有声音' : '静音'}`);
    }));
  }
  function renderControls() {
    tempoInput.value = draft.tempo;
    volumeInput.value = draft.volume;
    document.getElementById('tempo-value').value = draft.tempo;
    document.getElementById('volume-value').value = draft.volume;
  }
  function showStep(step) {
    app.dataset.step = String(step);
    buttons.forEach(row => row.forEach((button, index) => button.classList.toggle('is-current', step === index)));
    beatDisplay.textContent = step < 0 ? '准备好啦' : `第 ${step + 1} / 8 拍`;
  }
  function setPhase(value) {
    phase = value;
    app.dataset.state = value;
    playButton.disabled = value !== 'idle';
    stopButton.disabled = value === 'idle';
    playButton.textContent = value === 'starting' ? '打开声音…' : '▶ 播放';
  }
  tracks.forEach((track, rowIndex) => {
    const row = document.createElement('div');
    row.className = 'music-track';
    row.style.setProperty('--track-color', track.color);
    row.style.setProperty('--track-soft', track.soft);
    const label = document.createElement('div');
    label.className = 'track-label';
    const icon = document.createElement('span');
    icon.className = 'track-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = track.icon;
    const title = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = track.name;
    const hint = document.createElement('p');
    hint.textContent = track.hint;
    title.append(heading, hint);
    label.append(icon, title);
    const steps = document.createElement('div');
    steps.className = 'track-steps';
    steps.setAttribute('role', 'group');
    steps.setAttribute('aria-label', `${track.name}的八拍`);
    const rowButtons = [];
    for (let step = 0; step < 8; step += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'beat-button';
      button.dataset.row = String(rowIndex);
      button.dataset.beat = String(step);
      const mark = document.createElement('span');
      mark.className = 'beat-mark';
      mark.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span');
      number.textContent = String(step + 1);
      button.append(mark, number);
      onActivate(button, () => {
        draft.pattern[rowIndex][step] = !draft.pattern[rowIndex][step];
        renderPattern();
        persist();
      });
      steps.appendChild(button);
      rowButtons.push(button);
    }
    buttons.push(rowButtons);
    row.append(label, steps);
    document.getElementById('music-tracks').appendChild(row);
  });

  function makeAudio() {
    const gain = new Tone.Gain(0).toDestination();
    const drum = new Tone.MembraneSynth({ pitchDecay: 0.025, octaves: 4, volume: -8,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.06 } }).connect(gain);
    const shakerFilter = new Tone.Filter({ type: 'highpass', frequency: 4500 }).connect(gain);
    const shaker = new Tone.NoiseSynth({ volume: -15, noise: { type: 'white' },
      envelope: { attack: 0.002, decay: 0.07, sustain: 0, release: 0.025 } }).connect(shakerFilter);
    const star = new Tone.Synth({ volume: -13, oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.08 } }).connect(gain);
    const transport = Tone.getTransport();
    const notes = ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'G5'];
    const loop = new Tone.Loop(time => {
      if (phase !== 'playing') return;
      const step = nextStep;
      const scheduledToken = token;
      nextStep = (step + 1) % 8;
      if (draft.pattern[0][step]) drum.triggerAttackRelease('C2', '16n', time, 0.85);
      if (draft.pattern[1][step]) shaker.triggerAttackRelease('32n', time, 0.65);
      if (draft.pattern[2][step]) star.triggerAttackRelease(notes[step], '16n', time, 0.75);
      Tone.getDraw().schedule(() => {
        if (phase === 'playing' && token === scheduledToken) showStep(step);
      }, time);
    }, '4n').start(0);
    return { gain, drum, shaker, star, shakerFilter, transport, loop };
  }
  function silence() {
    if (!audio) return;
    const now = Tone.immediate();
    audio.transport.stop(now);
    audio.transport.position = 0;
    audio.gain.gain.cancelScheduledValues(now);
    audio.gain.gain.setValueAtTime(0, now);
    // Dispose this run's graph so attacks already scheduled by the audio clock
    // cannot leak into a rapid restart. The AudioContext itself is reused.
    audio.loop.dispose();
    [audio.drum, audio.shaker, audio.star, audio.shakerFilter, audio.gain].forEach(node => node.dispose());
    Tone.getDraw().cancel();
    audio = null;
  }
  function stop(message = '已经停止。可以改改格子，再听一遍。') {
    token += 1;
    silence();
    nextStep = 0;
    setPhase('idle');
    showStep(-1);
    status.textContent = message;
  }
  async function start() {
    if (phase !== 'idle') return;
    if (!window.Tone || !(window.AudioContext || window.webkitAudioContext)) {
      status.textContent = '当前浏览器暂时不能打开声音。请试试较新的浏览器；格子仍能编辑和下载。';
      return;
    }
    const startingToken = ++token;
    setPhase('starting');
    status.textContent = '正在打开声音…';
    try {
      // Called directly from the user's button gesture, as mobile browsers require.
      await Tone.start();
      if (token !== startingToken || document.hidden) return;
      if (Tone.getContext().state !== 'running') throw new Error('Audio is suspended');
      if (!watchedContext) {
        watchedContext = true;
        Tone.getContext().on('statechange', () => {
          if (phase === 'playing' && Tone.getContext().state !== 'running') stop('声音暂时暂停了。按播放就能重新打开声音。');
        });
      }
      if (!audio) audio = makeAudio();
      audio.transport.bpm.value = draft.tempo;
      nextStep = 0;
      audio.gain.gain.setValueAtTime(draft.volume / 100 * 0.6, Tone.immediate());
      setPhase('playing');
      audio.transport.start('+0.05');
      status.textContent = draft.volume === 0 ? '正在循环，音量为 0。调高一点就能听到。' : '正在循环播放。你可以一边听，一边点格子。';
    } catch (_) {
      if (token === startingToken) stop('这次没能打开声音，请再按一次播放。格子仍能编辑和下载。');
    }
  }
  onActivate(playButton, start);
  onActivate(stopButton, () => stop());
  tempoInput.addEventListener('input', () => {
    draft.tempo = Number(tempoInput.value);
    if (audio) audio.transport.bpm.value = draft.tempo;
    renderControls();
    persist();
  });
  volumeInput.addEventListener('input', () => {
    draft.volume = Number(volumeInput.value);
    if (audio && phase === 'playing') audio.gain.gain.rampTo(draft.volume / 100 * 0.6, 0.04);
    renderControls();
    persist();
    if (phase === 'playing') status.textContent = draft.volume === 0 ? '正在循环，音量为 0。调高一点就能听到。' : '正在循环播放。你可以一边听，一边点格子。';
  });
  document.querySelectorAll('[data-preset]').forEach(button => onActivate(button, () => {
    const preset = presets[button.dataset.preset];
    draft.pattern = copyPattern(preset.pattern);
    draft.tempo = preset.tempo;
    if (audio) audio.transport.bpm.value = draft.tempo;
    renderPattern();
    renderControls();
    persist();
    status.textContent = `换成“${button.textContent}”啦。${phase === 'playing' ? '正在继续播放。' : '按播放听听看！'}`;
  }));
  onActivate(document.getElementById('clear-music'), () => {
    if (draft.pattern.some(row => row.some(Boolean)) && !window.confirm('清空所有亮起的格子吗？')) return;
    stop('格子清空啦。点亮新的格子，做一段自己的节奏吧！');
    draft.pattern = tracks.map(() => Array(8).fill(false));
    renderPattern();
    persist();
  });
  onActivate(document.getElementById('download-music'), () => {
    const file = { ...draft, title: '我的八拍节奏', tracks: tracks.map(track => track.name), steps: 8 };
    const blob = new Blob([JSON.stringify(file, null, 2) + '\n'], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '我的八拍节奏.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    status.textContent = '节奏文件已经准备好。它保存的是你的格子、速度和音量。';
  });
  const fileInput = document.getElementById('music-file');
  onActivate(document.getElementById('open-music'), () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      if (file.size > 64000) throw new Error('File too large');
      const loaded = JSON.parse(await file.text());
      if (!validDraft(loaded)) throw new Error('Invalid rhythm');
      stop('节奏已经打开啦。按播放，就能听到这段节奏！');
      draft = { version: 1, tempo: loaded.tempo, volume: loaded.volume, pattern: copyPattern(loaded.pattern) };
      renderPattern();
      renderControls();
      persist();
    } catch (_) {
      status.textContent = '这个文件暂时打不开。请选择从小小节奏机下载的 JSON 节奏文件，原来的格子还在。';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && phase !== 'idle') stop('切到后台，节奏已自动停止。回来后按播放就能继续。');
  });
  window.addEventListener('pagehide', () => stop('节奏已停止。'));
  window.addEventListener('blur', () => {
    if (phase !== 'idle') stop('离开了这个窗口，节奏已自动停止。按播放可以继续。');
  });
  renderPattern();
  renderControls();
  window.DysonMusic = Object.freeze({
    getState: () => ({ ...draft, pattern: copyPattern(draft.pattern), phase, currentStep: Number(app.dataset.step) }),
    stop: () => stop()
  });
})();
