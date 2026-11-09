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

### Migration

- 使用原有完整字体效果时，显式增加 `import 'lunarkit/fonts/all.css'`；基础 `style.css` 保持单独导入。
- 根 JS 入口导入不隐式加载样式，客户端显式导入 `lunarkit/style.css`。
- 输入历史默认最多 500 条，使用 inputHistory.limit 调整或设为 0 禁用。
- 实际发布、包名所有权及 repository／homepage／bugs 地址等待维护者确认。
