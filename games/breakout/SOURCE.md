# 彩虹打砖块：开源来源

本游戏改编自 [KilledByAPixel / LittleJSArcade](https://github.com/KilledByAPixel/LittleJSArcade)。

- 固定上游版本：`ea73cf7357854c913798390603045fdcb1f472e7`
- 原游戏：[games/brickout.html](https://github.com/KilledByAPixel/LittleJSArcade/blob/ea73cf7357854c913798390603045fdcb1f472e7/games/brickout.html)
- 本地保存原文：`source-brickout.txt`
- 原作者：Frank Force；代码许可：MIT，完整条款见 [LICENSE](LICENSE)。

实际复用内容：砖块碰撞、挡板反弹、5 关地图与随机迷宫、连击得分、3 次生命、7 种道具、小球轨迹与碎片效果。`game.js` 由原游戏脚本改编，保留这些核心逻辑，替换标题、英文菜单、输入桥接与界面状态。

本地依赖（均取自同一固定版本）：

- `vendor/littlejs.min.js` ← `dist/littlejs.min.js`：LittleJS 引擎预编译版本
- `vendor/textureGenerator.js` ← `templates/textureGenerator.js`：程序绘制图形
- `vendor/gameFx.js` ← `templates/gameFx.js`：声音合成、屏幕反馈

适配修改：中文页面与大按钮、手机拖动挡板、手机按钮直接响应触摸并去重兼容点击、嵌入式舞台、暂停与自动暂停、本机最高分、奶油白与绿色界面。外部字体、原菜单模块、广告、跟踪服务、服务器均未接入。

默认图标由代码绘制，表情使用设备自带字体。未采用上游的 Twemoji 字体资源。
