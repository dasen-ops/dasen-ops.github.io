# 小小节奏机的复用来源

- 复用库：[Tone.js](https://github.com/Tonejs/Tone.js)，MIT 许可。
- 固定 npm 稳定发行：`tone@15.1.22`。获取日期：2026-10-04。
- 官方发行包：<https://registry.npmjs.org/tone/-/tone-15.1.22.tgz>。
- 直接复用发行包中的预编译 `package/build/Tone.js`，原样保存为 `../../assets/vendor/tone/Tone-15.1.22.js`，无需构建或联网加载。实际大小 345,500 字节；本地 gzip level 9 为 79,283 字节。
- SHA-256：`e290952fa43d9a7a780182a83c6fccf44d79cb7ae2cba102ef1f2b9d98124e22`。
- 原样保留官方 `LICENSE.md` 和 bundle 标注的 `Tone.js.LICENSE.txt`，位于同一 vendor 目录。
- 官方说明：[README](https://github.com/Tonejs/Tone.js/blob/dev/README.md)、[文档](https://tonejs.github.io/docs/15.1.22/index.html)。手机声音必须在用户操作里调用并等待 `Tone.start()`；此模块在点击播放时执行。

本页面和儿童操作界面由本站制作，使用 `MembraneSynth`、`NoiseSynth`、`Synth` 与 `Loop` 合成三种声音，未复制官方 demo 的页面、字体或音频采样。8 拍循环由 Tone 音频时钟调度，每格一拍（四分音符），与界面“拍 / 分钟”速度一致，画面通过 Tone Draw 跟随音频时间。停止时立即将总增益归零、停止 Transport、销毁本轮音频节点与 Loop 并清除画面调度，防止快速启停叠加；AudioContext 可在下次播放时复用。后台或离开窗口也停止。

草稿只存在当前浏览器的 `localStorage`（`dyson-music-draft-v1`），版本 1。JSON 下载只包含节奏数据，不是音频文件；可在“打开节奏”导入，导入校验文件不超过 64,000 字节、版本 1、3 行 × 8 列布尔格子、速度 60–180 与音量 0–50，失败时保留当前作品。没有账号、上传、外部请求或录音。
