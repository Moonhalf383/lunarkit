# 第一阶段验收记录

## 交付范围

- `development.mf`：严格 TypeScript、职责化目录、中文单行注释规则、公开消费接口与检查命令。
- `first-example.mf`：纯浏览器流式终端、白底黑字 Kode Mono Medium、LunarKit 大字 banner、原样 echo。
- 默认内容区水平居中、最大宽度 1080px；`paddingInline` 与 `maxWidth` 支持像素数值及 CSS 长度字符串。
- `example/src/main.ts` 使用公开 API，Enter 提交，所有输入原样打印。

## 已执行验证

- `npm run check` 通过：严格类型检查、ESLint、中文注释检查、8 项单元测试、库与 example 构建、NodeNext 构建产物类型消费检查、8 项 Chromium 测试。
- 单元测试覆盖历史边界、草稿恢复、空白与 HTML 纯文本、输入法组合态、实例独立及销毁、布局参数。
- Chromium 测试覆盖自动聚焦、本地字体与主题、默认居中、换行光标坐标、原生剪贴板多行粘贴、各种文本原样回显、历史编辑、组合输入事件、窄屏溢出及减少动态效果。
- 已查看 `test-results/echo-desktop.png`，首屏为白底、LunarKit 大字、prompt 与光标；移动端截图保存在 `test-results/echo-mobile.png`。截图属于本地验收产物，不提交 Git。
- `npm audit`：0 vulnerabilities。开发工具 minimatch 暂时覆写为 `^11.0.1`，原因见 README。
- `npm pack --dry-run`：包含库 JS、类型、样式、README 与字体许可；排除 example 制品。
- `mkd lint --all`、`mkd build --check`、`mkd target first_stage --check`、全部 MF 的格式检查通过。

## 审查及边界

独立审查指出的换行光标插入断点与 NodeNext 声明扩展名问题已经修正，并补充对应测试。中文输入法边界通过合成组合事件验证；各操作系统真实候选窗口体验仍可手动复核。当前自动化浏览器覆盖 Chromium。

完整套件的组件插槽、命令映射、Context、Tab 补全与内置命令属于后续阶段；`start` 保留其完整愿景。
