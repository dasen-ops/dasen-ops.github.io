const fs = require('node:fs');
const path = require('node:path');
const { marked } = require('../assets/vendor/marked/marked.umd.js');
const root = path.resolve(__dirname, '..');
const articles = [
  { slug:'welcome', title:'你好，欢迎来到我的小站', date:'置顶 · 欢迎', next:'new-friends', nextTitle:'游乐园多了三位新朋友' },
  { slug:'new-friends', title:'游乐园多了三位新朋友', date:'2026年10月4日 · 小站更新', next:'welcome', nextTitle:'你好，欢迎来到我的小站' }
];
// Only compile the trusted Markdown files maintained in this repository.
for (const article of articles) {
  const markdown = fs.readFileSync(path.join(root, 'articles/content', article.slug + '.md'), 'utf8');
  const content = marked.parse(markdown, { gfm:true });
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f4e8"><title>${article.title} · Dyson的小小空间</title><link rel="stylesheet" href="../assets/shared.css"><link rel="stylesheet" href="../assets/article.css"></head>
<body><main class="page-shell article-shell"><a class="back-link" href="../index.html#talk">← 返回首页</a><article class="surface prose"><div class="article-date">${article.date}</div>${content}</article><nav class="article-nav" aria-label="其他文章"><a class="btn" href="${article.next}.html">再读一篇：${article.nextTitle} →</a></nav><footer class="page-footer">Dyson的小小空间 · 留下小小的发现</footer></main></body></html>
`;
  fs.writeFileSync(path.join(root, 'articles', article.slug + '.html'), html);
  console.log('Built articles/' + article.slug + '.html');
}
