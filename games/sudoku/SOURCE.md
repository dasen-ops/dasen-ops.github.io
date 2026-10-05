# 小小数独来源与改编

上游：[robatron/sudoku.js](https://github.com/robatron/sudoku.js)。

固定提交：`4362a13510925f03a2f749b4657a8e4c5f36a869`。

- `sudoku.js`：该提交的 [sudoku.js 原文件](https://github.com/robatron/sudoku.js/blob/4362a13510925f03a2f749b4657a8e4c5f36a869/sudoku.js)，原文件未修改，版权与 MIT 许可随附在 `LICENSE` 中。
- `LICENSE`：该提交的 [LICENSE 原文](https://github.com/robatron/sudoku.js/blob/4362a13510925f03a2f749b4657a8e4c5f36a869/LICENSE)，保留 Rob McGuire-Dale 的版权声明。
- `puzzles.js`：离线调用上述原库生成的 30 道题，入门、普通、挑战各 10 道，分别保留 62、53、44 个题目数字；每题附带完整答案。
- `bank-verification.json`：每道题的独立唯一解检查结果。独立的位掩码约束搜索选择候选数最少的格子，找到第二个解即停止；只有计数为 1 的题目进入题库。没有把上游正向、反向求解结果相同当作唯一解证明。
- `verify-bank.cjs`：可重复运行的独立题库检查器，只使用 Node 内置模块；页面不会加载它。在此目录执行 `node verify-bank.cjs`，可验证全部题目的唯一解、答案、线索数量和每级题目数量。
- `index.html`、`styles.css`、`game.js`：本站编写的中文界面、键盘和触摸操作、数字重映射、重复数字反馈、提示、撤销、草稿和完成次数保存。

实际复用：离线题库生成使用原库 `generate()` / `solve()`；页面提示调用本地原库 `get_candidates()`，非单一候选格使用经过唯一解验证的题库答案。运行时不生成题目、不加载 CDN、不需要账号或后端。

每次换题选另一道同级题，并随机重映射 1–9。数字的一一对应替换保留原题的唯一解。浏览器只保存题库 ID、数字映射、填写内容和有限撤销历史；从本地题库重新构建题目，校验损坏草稿。

存储键：`dyson-sudoku-v1`。只读检查接口：`window.DysonSudoku.getState()`。每一道新题只有首次填成已验证答案时增加完成次数。草稿中的 `credited` 保存这道题是否已经计过数，同题重来会保留它，重填完成、刷新或重新打开都不会重复增加；换一道新题才开始新的计数机会。
