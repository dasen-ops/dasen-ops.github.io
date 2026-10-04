# 四子棋的复用来源

上游：[KilledByAPixel / LittleJSArcade](https://github.com/KilledByAPixel/LittleJSArcade)，固定提交 `ea73cf7357854c913798390603045fdcb1f472e7`。

- 原游戏：[games/connect4.html](https://github.com/KilledByAPixel/LittleJSArcade/blob/ea73cf7357854c913798390603045fdcb1f472e7/games/connect4.html)，完整原文保存在 `source-connect4.txt`。
- 原电脑搜索：[templates/gameAI.js](https://github.com/KilledByAPixel/LittleJSArcade/blob/ea73cf7357854c913798390603045fdcb1f472e7/templates/gameAI.js)，完整原文保存在 `source-gameAI.txt`。
- [MIT 许可](https://github.com/KilledByAPixel/LittleJSArcade/blob/ea73cf7357854c913798390603045fdcb1f472e7/LICENSE)和 Frank Force 的版权声明保存在 `LICENSE`。

## 实际改编范围

`rules.js` 抽取原游戏的落子位置、四方向胜负判定、有效威胁计算、中心优先选列以及电脑用的局面评价和状态适配器。底部仍为第 0 行，规则及评价权重沿用原文。

`search.js` 复用原 `gameAI.js` 的随机选列、Alpha-beta 搜索、迭代加深、置换表和杀手步启发式。新增两处 `AbortSignal` 检查，让重开、切换模式及离开页面立即停止旧搜索；其余搜索代码保留。本站为认真/挑战设置 650/1000 毫秒时间预算，使用原算法已有的限时返回机制，所以挑战水平并不保证每次搜满 11 层。

`index.html`、`styles.css` 和 `game.js` 是本站的中文 DOM 页面与交互：七列六行棋盘，电脑/双人对局、三个电脑水平、落子提示、新局、键盘选列、赢局数、本机保存，以及搜索取消和重复输入保护。没有复用原 LittleJS 画布、引擎、菜单、音效或纹理；没有外部图片、字体或运行时网络请求。

页面使用本站 `shared.css`、`site-nav.css`、`site-core.js` 和 `site-nav.js`。算法仅需浏览器原生 API，不需安装依赖、登录账号或后端。

## 本机数据与测试接口

`localStorage` 键 `dyson-connect4-v1` 保存 `{version:1, mode, difficulty, wins:{ai,red,yellow}, draws}`。`wins.ai` 仅统计人类战胜电脑的局数；`red/yellow` 统计双人模式各方获胜局数。存储失败不影响下棋；棋盘本身不跨刷新保留。

`window.Connect4Rules` 提供复用的纯规则函数和 `connect4Game` 适配器；`window.Connect4Game.snapshot()` 返回当前棋盘副本、玩家、胜负和电脑忙碌状态。`newGame()`、`drop(0..6)` 与页面按钮调用同一逻辑；不能绕过思考期或结束状态的落子限制。

主要界面选择器：`[data-mode="ai"]`、`[data-mode="pvp"]`、`#difficulty`、`#new-game`、`#game-status`、`#board`、`.column-button[data-column="0".."6"]`、`.cell.winning`、`#ai-wins`、`#red-wins`、`#yellow-wins`。
