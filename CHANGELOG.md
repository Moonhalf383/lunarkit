# Changelog

## Unreleased

### Added

- 可选 core、markdown、charts、models、icons/streamline 子路径。
- 独立字体 CSS 与 WOFF2；基础样式默认不携带字体。
- autoFocus、宿主滚动容器、跟随模式、场景时长和顶部留白。
- messages、补全当前项关联、文字动画跳过与整段辅助播报。
- 命令状态／错误通知、createCleanup、批量输出和文本流句柄。
- 输入历史容量／过滤／去重、变化记录缓存和富内容合帧。
- 起步模板、API／兼容性／发布说明、现有检查 CI 与受保护发布配置。
- 项目自有代码 MIT；第三方资产保留原许可。

### Fixed

- Markdown 通过清理后的 DocumentFragment 挂载，支持允许 DOMPurify policy 的 Trusted Types 策略。
- 超高面板保持当前阅读位置；同帧用户滚动可及时暂停接近底部跟随。

### Verification

- SDK 生命周期专项、Chromium／Firefox 回归、真实 tgz／模板／React／Vue／SSR 占位消费检查。
- 三引擎 CI 与人工验收清单，覆盖边界见 docs/acceptance.md。

### Migration

- 使用原有完整字体效果时，显式增加 `import 'lunarkit/fonts/all.css'`；基础 `style.css` 保持单独导入。
- 根 JS 入口导入不隐式加载样式，客户端显式导入 `lunarkit/style.css`。
- 输入历史默认最多 500 条，使用 inputHistory.limit 调整或设为 0 禁用。
- repository／homepage／bugs 已配置为 Moonhalf383/lunarkit；实际发布和包名所有权等待维护者确认。
