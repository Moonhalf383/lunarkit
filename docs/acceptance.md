# 自动验收与人工检查

## 当前证据

本轮类型检查、Lint／中文注释检查、58 项单元测试通过。开发示例 Chromium 38 项通过，Firefox 37 项通过、1 项原生剪贴板测试因 Playwright 权限接口限制跳过。生产示例 Chromium 4 项通过。SDK 专项在 Chromium／Firefox 各 6 项通过，覆盖指定容器滚动、历史阅读跟随、场景留白、跳过及播报结构、Markdown 清理、CSP 和批量资源释放。

Firefox 多轮执行中曾偶发停在空挂载节点，导致后续输入定位超时；单独重跑及最近一次完整单 worker 执行通过。保留失败 trace 的配置已加入，CI 仍需观察初始化稳定性。合成组合事件只验证 SDK 的组合状态处理；系统候选窗及真实提交时序交由下方人工步骤检查。

WebKit 已下载，当前开发系统无法启动其 Ubuntu fallback 构建，缺少 libicu74 和兼容的 libxml2。因此本机没有 WebKit 运行通过的证据。CI 已配置安装三种引擎及系统依赖；本轮修改提交后的 CI 结果待查看。此前远端提交 eba531e 的既有 CI 已成功。

## 可重复运行

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run check
npm run test:acceptance
npm run test:package
```

受限环境可分别运行已可用引擎，报告中保留缺失平台：

```sh
npm run test:e2e -- --project chromium --project firefox --workers 1
npm run test:acceptance -- --project chromium --project firefox --workers 1
```

`test:package` 实际触发 prepack，生成 tgz，在临时项目安装并删除临时文件。它检查六个公开 JS 入口的无 DOM 导入、NodeNext 消费声明、许可与字体资产、起步模板生产构建及 help／load／字体运行结果；React／Vue 夹具也经生产构建后挂载、卸载终端，确认两个实例均移除。SSR 检查为框架占位节点渲染及模块导入，客户端 hydration 尚未覆盖。该检查需要 npm registry 网络访问，并为框架探针安装 React 19 与 Vue 3 当前兼容版本。

CSP 夹具允许同源模块、同源资源、内联样式与 DOMPurify 的 `dompurify` Trusted Types policy。Chromium 实际强制 `require-trusted-types-for 'script'`；Firefox 运行同一夹具的结果只代表其支持的策略范围。严格禁止所有内联样式、禁止 DOMPurify policy、跨源字体或生产部署的 HTTP CSP header 仍需宿主验证。

## 性能及资源测量

在当前开发机的无头浏览器中，单批挂载 5000 个简单组件、历史上限 500，最近一次样本 Chromium 约 26.9ms，Firefox 约 34ms。两个引擎均保留 500 条记录，销毁后累计释放全部 5000 个组件，宿主内 SDK 节点为零。耗时使用 `performance.now()` 测量同步 `writeBatch`，夹具准备和后续绘制不计入。结果附在 Playwright 测试附件中。

这是单次开发环境样本，用来建立基线；长期堆内存、真实设备帧率、复杂模型和长时间交互尚无量化结果。资源计数验证组件释放契约，单元测试另覆盖清理栈、定时器、监听和命令取消。后续性能预算应结合目标设备及实际内容确定。

## 人工验收

在记录中填写设备／系统／浏览器版本、结果和异常复现步骤。运行 `npm run dev` 查看基础输入，`npm run dev:example3` 查看登录与编辑器，`npm run dev:example4` 查看游戏。

### 真实中文输入法

在 example1 输入中文、英文、emoji 和混合文本，使用候选数字键及回车选词，然后回车提交。候选确认期间内容保持编辑状态，最终提交只发生一次，光标跟随完整字素。检查左右移动、删除、长文本换行及多行粘贴。

在 example3 执行 `login`，账号 `user1`、密码 `lunarkit`。确认秘密值没有出现在输出／镜像／历史；登录后执行 `minivim notes.txt`，按 `i` 用中文输入法编辑，Esc 后输入 `:q!` 退出。确认模式切换、焦点和候选位置可用。

### iPhone 与 Android 软键盘

用真实设备打开同一局域网的开发服务器，例如 `npm run dev:example4 -- --host 0.0.0.0`，在设备访问开发机 IP 与终端显示的端口。检查键盘展开／收起、屏幕旋转、长输入和补全时，输入行及当前选项仍可见，页面宽度稳定。使用系统粘贴菜单和中文键盘，确认提交动作符合用户预期。测试服务器仅在可信局域网开放。

### 屏幕阅读器

至少用一种实际组合（如 NVDA＋Firefox 或 VoiceOver＋Safari），通过键盘进入输入行、执行命令和导航补全。确认标签、当前候选和历史播报可理解，焦点顺序连贯。

在 example4 输入 `play` 开始游戏，再执行 `fetch`；播放中导航到 “Show full message” 按钮并激活。确认能跳过且整段叙事播报清楚，无逐字噪声或重复播报。继续执行 `do depart` 检查选项名称、选中状态和完成后的焦点。若短消息播放过快，可使用 `/tests/fixtures/sdk.html`（`npx vite --config tooling/vite.acceptance.ts`，端口 4180）的 `story` 长间隔夹具。

### 视觉与操作体验

桌面与窄屏各检查一次白底黑字、字体、中文光标、图表轴线及柱体动画、暗背景三维模型、场景过渡和输入留白。在 example4 旅行过程中暂停、继续、保存并刷新，确认到达事件处理后才展示星球详情。系统开启减少动态效果后重新检查，确认信息完整且动画体验舒适。

## 发布待办

完成 WebKit CI 复验、观察 Firefox 稳定性，并记录上述人工结果。维护者随后核实包名归属、批准版本与标签、配置 npm Trusted Publisher／GitHub 受保护环境并批准发布。当前版本仍为 0.1.0；本轮没有执行 npm publish。具体配置见 [releasing.md](releasing.md)。
