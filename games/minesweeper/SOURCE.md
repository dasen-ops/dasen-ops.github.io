# 花园扫雷源码来源

- 上游仓库：[KilledByAPixel/LittleJSArcade](https://github.com/KilledByAPixel/LittleJSArcade)
- 固定提交：`ea73cf7357854c913798390603045fdcb1f472e7`。
- 原入口：[games/minesweeper.html](https://github.com/KilledByAPixel/LittleJSArcade/blob/ea73cf7357854c913798390603045fdcb1f472e7/games/minesweeper.html)。
- 原文完整保存在 `source-minesweeper.txt`，23,464 字节，未经修改；SHA-256：`527b19cd4e3ba49e590f1516ba470bdf80ddbc3b7a1f7727a9e884bf1d10de54`。上游完整 MIT 许可保存在 `LICENSE`，作者 Frank Force。

## 实际复用与修改

`game.js` 改编了上游的 `inBounds`、`idx`、`resetGame`、`placeMines`、邻格数字计算、`revealCell` 的栈式空地展开、`checkWin` 和 `toggleFlag`。保留首点及其相邻 3 × 3 区域不放石头、数字包含斜邻格、旗格不展开、全部安全格翻开时胜利并自动标记石头的规则。

本站改为 6 × 6 / 5 块石头的入门花园，以及 8 × 8 / 10 块石头的挑战花园。增加完成后操作锁定和显式石头检查，避免空地展开访问石头。移除 LittleJS 引擎、菜单、音效、计时、按数字自动开邻格和未完棋局存档；没有运行上游页面或加载它的依赖。中文 DOM 界面、花园图案、翻开/标记按钮、棋盘键盘访问和完成次数记录由本站实现。修改声明位于 `game.js` 开头。

图案由 CSS 绘制，不带图片或音频素材。格子最少 44 × 44px；窄手机上的挑战棋盘可以在棋盘内左右滑动，页面本身不横向溢出。方向键移格，回车/空格执行当前模式，F 键标记；快捷键仅在棋盘内响应。所有按钮复用本站 `DysonSite.onActivate`，库缺失时回退原生 click。庆祝效果复用已有本地 `canvas-confetti` 和 `celebrate.js`，缺失时不影响胜负。

## 完成记录与接口

存储键 `dyson-minesweeper-v1`，格式：

```json
{"version":1,"difficulty":"easy","wins":0}
```

`difficulty` 为 `easy` / `hard`，`wins` 是非负安全整数。只保存选择的难度和累计完成次数，当前棋局不保存；刷新会开始新的一局，坏记录回退默认值，存储不可用仍能玩并显示说明。胜利只记一次；新局清空棋盘和模式，完成记录保留。其他标签页更新完成次数时，这一页同步显示。

完成时发布 `dyson-minesweeper-complete`，包含 `{difficulty,wins,persisted}`；保存时也发布 `dyson-site-change`，包含 `{game:'minesweeper',persisted}`。只读 `window.DysonMinesweeper.getState()` 返回难度、模式、阶段、首点状态、棋盘尺寸、石头数量、已翻格数、完成次数和四个数组副本，供本站验证。

主要选择器：`#mine-board[data-phase]`、`.garden-cell[data-cell]`、`[data-difficulty]`、`[data-mode]`、`#new-garden`、`#garden-status`、`#garden-wins`、`#storage-note`。

## 验证

测试脚本：项目 `tmp/reuse-20261005/check-minesweeper.cjs`，对应截图 `minesweeper-{easy|hard}-{320|390|768|1440}.png`。

已在真实 Chromium 中测试两种难度的首点及邻格安全、全部数字重算、空地展开、旗格保护、收旗、胜利与失败、完成后锁定、旧棋盘事件在重开后失效、每胜只计一次、刷新记录及跨标签同步。键盘方向键/F/回车/空格，以及非棋盘控件焦点不触发格子操作均通过。

320/390/768/1440px 页面无横向溢出，所有按钮和格子最小 44px。320px 入门棋盘内部 `scrollWidth / clientWidth` 为 `294 / 294`，六列全部显示；挑战为 `390 / 294`，只在棋盘内部横向滑动且有说明。320px 实际触摸事件验证了翻开、放旗/收旗、重开、挑战横滑不误翻、右端格子首点安全和失败反馈。

坏 JSON、错误版本、非法难度和负完成次数均回退为可玩的新花园。存储不可用仍能通关并说明记录只留在当前页面。离线 `file://` 打开可以实际翻格，无缺失资源或页面脚本错误。
