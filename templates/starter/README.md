# LunarKit starter

复制本目录到一个新项目，安装依赖并运行：

```sh
npm install
npm run dev
```

SDK 尚未发布时，将 package.json 中 lunarkit 的版本替换为本地构建包路径或可用预览版本。模板版本与仓库 package.json 一致；正式复制前按实际发布版本更新。

- `help` 展示指令。
- `story` 使用过场、可跳过文字和选择。
- `load` 使用 AbortSignal 取消网络请求，并更新已有文本输出。
- 清理栈在页面离开和 Vite 热更新时销毁终端。
- 按需加入 `lunarkit/fonts/noto-sans-sc.css` 使用随包分发的中文字体。
- 若使用 `lunarkit/icons/streamline`，在页面 About／Credits 提供 Streamline 及 CC BY 4.0 链接，保留随包许可。模板本身未使用图标。

自有代码采用 MIT。字体采用各自 SIL OFL 许可，见 SDK 的 THIRD_PARTY_LICENSES。
