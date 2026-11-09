# 兼容性与安全边界

## 浏览器能力要求

目标环境为现代浏览器，使用 ES2022、Intl.Segmenter、AbortController、MutationObserver、原生 textarea 和 SVG。ResizeObserver 与 IntersectionObserver 缺失时提供有限降级；准确滚动与光标布局仍需要浏览器 DOM。

仓库现有自动化覆盖 Chromium。Firefox、WebKit、iOS Safari、Android 软键盘、真实中文输入法和屏幕阅读器属于待执行的兼容性验收。本轮保留已有自动化，不宣称这些平台已经验证。

## SSR 与框架接入

ESM 核心模块可作为客户端依赖导入；创建终端、图形或 Markdown 节点需在浏览器挂载后执行。React effect、Vue onMounted、Astro 客户端脚本等宿主生命周期中创建实例，并在清理阶段调用 destroy。SSR 页面只输出挂载节点，终端接管其内部内容，不承担 hydration。

iframe 挂载通过 ownerDocument 管理终端节点。独立图表／Markdown 工具当前使用全局 document，在 iframe 场景请在对应窗口调用工具；跨窗口图形创建属于后续兼容性工作。

## 内容信任

write(string) 使用纯文本。write(HTMLElement) 和 OutputComponent 是受信消费代码接口，宿主负责其中的脚本、监听和资源。renderMarkdown 对原始 HTML 转义并经过 DOMPurify 白名单清理；仅开放 http、https、mailto 与页内锚点链接。

命令在浏览器权限中执行。示例账号与本地存档不提供服务端安全保证。业务身份校验、服务端权限、机密存储、请求限流与存档可信性由消费应用负责。

## CSP

默认字体独立托管，可按自己的域名配置 font-src。SDK 会使用 style 属性设置光标几何、动画状态和布局；严格禁止内联样式的 CSP 需要宿主评估。Trusted Types、严格 style-src 和跨源字体加载属于待执行验收，当前不声明完整支持。Markdown 安全策略不能代替整个应用的 CSP。

## 性能策略

普通输出遵循 maxHistoryLines；富内容按完整记录回收，最新超长富节点保留。writeBatch 减少重复历史收敛；createTextOutput 适合流式文字；富内容变化合帧并缓存未变化记录行数。字体由 Unicode 范围按需请求。

历史仍使用真实 DOM，并扫描顶层记录；大量无限富内容需要应用自行设定容量。性能预算、压力测试与虚拟化决定留待后续量化验收。
