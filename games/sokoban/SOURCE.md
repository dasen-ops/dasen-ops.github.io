# 推箱子源码来源

- 上游仓库：[KilledByAPixel/LittleJSArcade](https://github.com/KilledByAPixel/LittleJSArcade)
- 固定提交：`ea73cf7357854c913798390603045fdcb1f472e7`（2026-10-02）
- 原入口：[games/sokoban.html](https://github.com/KilledByAPixel/LittleJSArcade/blob/ea73cf7357854c913798390603045fdcb1f472e7/games/sokoban.html)
- 原文副本：`source-sokoban.txt`，19,943 字节，未经修改。
- 作者：Frank Force。仓库代码为 MIT，原许可完整保存在 `LICENSE` 中。

## 实际复用

复用了原有 7 张字符地图和 `parseLevel`、`loadLevel`、`getTile`、`setTile`、`isWalkable`、`hasBox`、`saveState`、`undo`、`tryMove`、`checkWin` 的核心代码。保持墙壁碰撞、只推不拉、步数与推箱次数计算、箱子与目标格转换，以及最多 1,000 步撤销的规则。去除了引擎相机、菜单和音效调用，过关时改为保存本站记录并更新界面。

本地关卡顺序对应上游 `[2, 3, 4, 5, 6, 1, 7]`，地图本身没有修改。上游第 2 关较容易，安排为本站第一关。其初始解法为 `右、下、下、左、右、上、上、左、下、上、上、左、左、下、下、右`，16 步、3 次推箱。

## 本站改编

棋盘使用 DOM 和 CSS 绘制，图案均由 CSS 生成。中文选关、方向按钮、撤销、重玩、下一关、完成反馈、触摸滑动和键盘输入由本站实现。按钮至少 44px，导航、表单和其他按钮得到键盘焦点时，不触发棋盘方向键。

没有引入 LittleJS 引擎或原菜单依赖，也没有使用 Twemoji 字体、外部图像、广告或跟踪。运行只需静态服务器；无需安装、编译或联网加载资源。复用本站 `shared.css`、`site-nav`、`site-core` 和已有的本地庆祝效果；庆祝效果缺失也不影响游戏。

## 完成记录

存储键为 `dyson-sokoban-v1`：

```json
{"version":1,"selectedLevel":0,"completed":{"1":{"moves":16,"pushes":3}}}
```

`selectedLevel` 从 0 开始，`completed` 的关卡号从 1 开始。先比较推箱次数，再比较同样推箱次数下的步数，保留最佳完成记录。刷新页面会重新准备上次选择的关卡，完成记录保留。存储不可用时仍可游戏，并在页面内说明记录仅留在当前页面。

完成时发布 `dyson-sokoban-complete`，包含 `{level, moves, pushes, completed, total, persisted}`，同时发布本站的 `dyson-site-change`。只读 `window.DysonSokoban.getState()` 返回当前关卡和棋盘状态，供本站检查使用。

## 验证

已用真实 Chromium 在 320、390、1440px 宽度检查页面无横向溢出、按钮大小、方向键、导航焦点、撤销、重玩、选关、完成反馈、刷新后的完成记录；320/390px 还测试了真实触摸滑动、方向按钮、撤销和取消滑动。第一关按 16 步解法完成；电脑按完整解法通关前 6 关。

测试脚本：项目 `tmp/reuse-20261004/check_sokoban.cjs`。截图与结果也保存在该研究目录。最后一关保留原 19×11 地图，已检查手机/电脑的显示及选关；这里没有声称完成了该关的实际试玩。
