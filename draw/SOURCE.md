# 小小画室：复用来源

- 组件：Konva 10.7.0（固定版本，本地加载，不使用运行时 CDN）。
- 官方仓库：https://github.com/konvajs/konva
- 对应版本：https://github.com/konvajs/konva/tree/10.7.0
- 下载包：https://registry.npmjs.org/konva/-/konva-10.7.0.tgz
- 本地文件：`vendor/konva-10.7.0.min.js`，取自上述 npm 包中的 `package/konva.min.js`，未改动。
- 许可：MIT，原始许可已保存在 `vendor/LICENSE-Konva.txt`。原工作版权归 Eric Rowell，修改工作版权归 Anton Lavrenov。
- 官方自由绘画参考：https://konvajs.org/docs/sandbox/Free_Drawing.html

页面界面、画笔状态、草稿保存、撤销重做、贴纸形状与拖动、PNG 导出均为本项目实现。Konva 提供画布场景、图形、事件与导出能力。

## 操作与数据

入口：`draw/index.html`。选择画笔和颜色后在画布画画；橡皮擦笔迹；点击贴纸后进入拖动模式；“保存图片”导出白底 PNG。清空前询问，并可撤销。撤销最多保留最近 40 个操作，刷新后不保留撤销历史。

草稿使用浏览器 localStorage，只保存在当前设备和当前站点的浏览器中，不上传，不跨设备同步。浏览器禁止存储或空间不足时会显示提示。布局改变只缩放画布，笔迹保留逻辑坐标。手机绘画使用 Pointer Events 并关闭画布触摸滚动。
