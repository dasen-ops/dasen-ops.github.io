# 数字滑块源码来源

- 上游：[iditri08/8PuzzleGame](https://github.com/iditri08/8PuzzleGame)
- 固定提交：`9c68e6e33d0a6c5778cc55772901611f7fc3caaf`
- 原入口：[play.html](https://github.com/iditri08/8PuzzleGame/blob/9c68e6e33d0a6c5778cc55772901611f7fc3caaf/play.html)
- 作者：Iditri Datta。代码采用 MIT 许可，原许可完整保存在 `LICENSE`。
- `source-play.txt` 是原入口未经修改的 8,520 字节副本，保留 CRLF 换行。SHA256：`CCB37532FA2D745DF24FE70BCC6877DA8074B1F88BFA044D29F2DB95DAFDD9C7`。

## 实际复用和改编

复用了原有目标序列 `GOAL`、逆序数偶数判断 `solvable`、原 `move` 的上下左右邻接规则与空格交换/步数递增核心。邻接规则被分离为 `canMove`，供按钮、键盘和存档验证共用。

本站重写了中文单页界面、棋盘按钮、难度、撤销、同题重来、换题、完成反馈和存档。原随机排序洗牌改为从完成状态合法移动：入门打乱 10 步，挑战打乱 50 步，避免立即原路返回；挑战题额外要求曼哈顿距离至少 12，保证比入门题需要更多移动。所有生成题目都保持可解且不直接处于完成状态。重复题或特殊随机序列有可解的备用布局。

去掉原外部字体、计时器、单独胜利页和延迟跳转。使用本站共享样式、导航、收藏和已有本地庆祝效果；无需新依赖、编译、账号或网络请求。全部图案为 HTML/CSS，未使用外部图片或音效。断网时可直接打开本地 `index.html` 试玩；这里没有提供网站离线缓存或 Service Worker。

## 存档与接口

存储键为 `dyson-sliding-v1`，格式：

```json
{
  "version": 1,
  "difficulty": "easy",
  "wins": 0,
  "bestMoves": {"easy": null, "hard": null},
  "game": {
    "tiles": [1,2,3,4,5,6,7,0,8],
    "initial": [1,2,3,4,5,6,7,0,8],
    "moves": 0,
    "undo": [],
    "credited": false
  }
}
```

`0` 代表空格，`undo` 存放每一步移动前的空格索引，最多保留最近 200 步。刷新可恢复当前题目、步数和撤销记录。加载时检查数字排列、可解性、初始题目、计数和每个撤销步骤；坏题目会重新准备，合法的完成记录保留。存储不可用时仍能正常玩，并显示当前页面记录提示。

`wins` 记录完成题目数。同一题完成后，撤销或重来再完成不会重复增加；换题后可以继续累计。`bestMoves` 记录每个难度的最少完成步数。

只读 `window.DysonSliding.getState()` 返回存档结构的复制及 `complete`。每次保存发布 `dyson-site-change`；一题首次完成时发布 `dyson-sliding-complete`，包含 `{wins, moves, difficulty, persisted}`。

稳定选择器：`#board`、`.tile[data-index]`、`[data-difficulty]`、`#move-count`、`#wins`、`#best-moves`、`#undo-button`、`#restart-button`、`#new-button`。

## 实际验证

测试脚本位于项目 `tmp/reuse-20261005/check_sliding.cjs`，结果为 `sliding-results.json`，截图为 `sliding-{320,390,1440}.png` 和 `sliding-win-*.png`。

在 Chromium 的 320/390/1440px 宽度检查了无横向溢出、按钮至少 44px（320px 数字格约 80.7px）、手机真实触摸、电脑方向键、完整通关、刷新恢复、撤销、同题重来、换题、完成只计一次及导航焦点保护。用独立广度优先搜索枚举全部 181,440 个可达棋盘，核对了 72 个生成题目；三种尺寸分别实际完成了一题挑战题。

另外验证了 5 种坏存档、存储拒绝、刷新后撤销、后台保留题目，以及浏览器断网时从本地文件全新打开并移动。游戏无外部资源请求、无脚本异常。原文副本与下载文件逐字节相同。
