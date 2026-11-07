# 第一阶段验收记录

## 交付范围

- `development.mf`：严格 TypeScript、职责化目录、中文单行注释规则、公开消费接口与检查命令。
- `first-example.mf`：纯浏览器流式终端、白底黑字 Kode Mono Medium、LunarKit 大字 banner、原样 echo。
- 默认内容区水平居中、最大宽度 1080px；`paddingInline` 与 `maxWidth` 支持像素数值及 CSS 长度字符串。
- `example/src/main.ts` 使用公开 API，Enter 提交，所有输入原样打印。

## 已执行验证

- `npm run check` 通过：严格类型检查、ESLint、中文注释检查、9 项单元测试、库与 example 构建、NodeNext 构建产物类型消费检查、14 项 Chromium 测试。
- 单元测试覆盖历史边界、草稿恢复、空白与 HTML 纯文本、输入法组合态、实例独立及销毁、布局参数。
- Chromium 测试覆盖自动聚焦、本地字体与主题、默认居中、换行光标坐标、原生剪贴板多行粘贴、各种文本原样回显、历史编辑、组合输入事件、窄屏溢出及减少动态效果。
- 已查看 `test-results/echo-desktop.png`，首屏为白底、LunarKit 大字、prompt 与光标；移动端截图保存在 `test-results/echo-mobile.png`。截图属于本地验收产物，不提交 Git。
- `npm audit`：0 vulnerabilities。开发工具 minimatch 暂时覆写为 `^11.0.1`，原因见 README。
- `npm pack --dry-run`：包含库 JS、类型、样式、README 与字体许可；排除 example 制品。
- `mkd lint --all`、`mkd build --check`、`mkd target first_stage --check`、全部 MF 的格式检查通过。

## 光标及字体修订

- 默认 prompt 改为 `❯`；块状光标高度等于字号，在行内居中，覆盖右侧完整字素，末尾及空输入为半角宽。
- 打包 Noto Sans SC Medium 中文及 Noto Sans Symbols 2 提示符字体，与 Kode Mono 统一 ascent、descent、line-gap；提示符专用字体优先于中文字体。
- `src/theme/fonts.css` 由 `npm run generate:fonts` 生成，保留 Unicode 分片及 WOFF2，所有字体许可证随包分发。
- 新增 Chromium 测试覆盖中文字高、实际字体栈选择、字形墨迹中心、全半角、emoji 字素簇、组合字符、末尾及空输入、多行及字号变化、选区隐藏。
- 已查看中文块状光标与中文末尾截图，新增 `test-results/caret-bundled-font-alignment.png` 验证中英文及提示符同排的视觉效果。
- 独立审查发现中文字体抢先匹配提示符，已调整字体栈优先级并增加实际字体栈与专用字体宽度比对测试。

## 光标空闲闪烁修订

- 移动、编辑、粘贴和历史导航时光标立即常亮；最后一次操作 550ms 后恢复闪烁，每次操作重新计时。
- 输入法组合期间持续常亮，结束组合后重新等待空闲；失焦与实例销毁均清理空闲计时器。
- 新增浏览器虚拟时钟测试覆盖连续移动、输入、历史切换、组合输入、失焦及重新聚焦、减少动态效果；新增单元测试验证销毁后计时器释放。
- `npm run check` 全部通过：9 项单元测试、14 项 Chromium 测试以及类型、注释规范、构建和 NodeNext 消费检查。

## 审查及边界

独立审查指出的换行光标插入断点与 NodeNext 声明扩展名问题已经修正，并补充对应测试。中文输入法边界通过合成组合事件验证；各操作系统真实候选窗口体验仍可手动复核。当前自动化浏览器覆盖 Chromium。

完整套件的组件插槽、命令映射、Context、Tab 补全与内置命令属于后续阶段；`start` 保留其完整愿景。
