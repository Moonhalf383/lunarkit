# LunarKit

输入驱动的轻量浏览器终端套件。第一阶段提供白底黑字、Kode Mono Medium、流式文本、输入历史与原样回显 example。

默认提示符为 `❯`，闪烁块状光标高度等于字号，在文本行内垂直居中：文本中覆盖右侧完整字素的实际宽度，区分全角与半角；空输入、换行和文本末尾使用半角宽。覆盖文字以反色显示，选择文本时隐藏光标。

## 本地运行

使用 Node.js 24 LTS（也支持 22.13+ 的 22 LTS）。

```sh
npm ci
npm run dev
```

打开命令输出的本地地址。首屏显示 LunarKit 大字和输入行，Enter 提交，↑ / ↓ 遍历输入历史，输入法组合期间 Enter 确认候选词。多行粘贴作为一次输入提交，前后空白和空行保留。

## 消费接口

```ts
import { createTerminal } from 'lunarkit';
import 'lunarkit/style.css';

const element = document.querySelector<HTMLElement>('#app');
if (!element) throw new Error('缺少挂载元素');

// 将每次提交的原文打印到输出流。
function echo(text: string): void {
  terminal.write(text);
}

const terminal = createTerminal({ element, banner: 'LunarKit', onSubmit: echo });
```

`element` 为必填挂载元素；`banner` 可选；`prompt` 默认 `❯`；`onSubmit` 接收未经裁剪或命令解析的字符串。提交后先记录原始输入，再调用回调，example 中回调将同一文本追加为输出。

默认内容区最大宽度为 1080px，水平居中，内部文字左对齐；两侧内边距随视口在 24px 至 48px 之间调整。通过 `paddingInline` 和 `maxWidth` 可覆盖布局，数值单位为 px，也接受 CSS 长度字符串：

```ts
const terminal = createTerminal({
  element,
  banner: 'LunarKit',
  paddingInline: 'clamp(24px, 6vw, 80px)',
  maxWidth: 1200,
  onSubmit: echo,
});
```

返回的 `write(text)` 追加安全文本，`focus()` 聚焦输入行，`destroy()` 移除实例 DOM 与监听器。页面卸载或组件销毁时调用 `destroy()`；销毁后再次调用这些方法安全。多个挂载元素可以拥有独立实例。

example 位于 `example/src/main.ts`，仅使用公开接口。开发时 Vite 将包名解析到源码；构建输出位于 `dist/index.js`、`dist/index.d.ts`、`dist/style.css`，example 制品位于 `dist/example/`。库样式内置字体数据，消费时无需请求第三方字体服务。库同时打包 Noto Sans SC Medium 中文字体和用于 `❯` 的 Noto Sans Symbols 2，统一行度量与基线，减少不同系统的视觉差异；字体覆盖范围以外的字符（如部分 emoji）仍由系统回退。三套字体的 SIL OFL 1.1 许可证位于 `THIRD_PARTY_LICENSES/`。字体按 Unicode 范围分片加载，库样式内嵌全部字体，打包体积随中文字体增加；`npm run generate:fonts` 可从依赖重新生成无注释的字体声明。

## 目录

```text
.mkd/                 Target、开发规范与第一阶段验收要求
src/
  input/              输入行与历史草稿状态
  terminal/           终端公开类型与流式输出
  theme/              主题及字体
  index.ts            库公开入口
example/
  src/                原样回显消费用例与页面样式
tests/
  unit/               状态、纯文本安全和生命周期测试
  browser/            Chromium 交互与视觉属性测试
  consumer/           构建产物的 NodeNext 类型消费验证
tooling/              构建、检查与测试配置
```

## 验证

```sh
npx playwright install chromium
npm run check
npm audit
mkd lint --all
mkd target first_stage --check
```

`check` 包含严格类型检查、ESLint、中文单行注释检查、单元测试、库和 example 构建、构建产物的 NodeNext 类型消费检查、浏览器测试。浏览器截图写入未追踪的 `test-results/`。输入法测试通过合成组合事件验证提交边界；真实系统输入法体验可在本地手动复核。

开发规范见 `.mkd/development.mf`：函数和类附扼要中文单行注释，易混淆变量说明意图，其余位置保持无注释。`tooling/check-comments.mjs` 检查注释位置和形式；变量是否易混淆及注释是否准确仍需代码审查。

开发工具的 minimatch 暂时覆写至 `^11.0.1`，用于修复 GHSA-g3hv-75wg-m249；已通过 ESLint、类型及构建验证，上游更新后可重新评估该覆写。

## 阶段边界

`first_stage` 交付当前 echo 用例。完整愿景保留在 `.mkd/main.mf` 的 `start`：组件插槽、声明式命令映射、Context、Tab 补全和内置命令留待后续实现。当前输入的 `clear`、`help` 与其他文本一样原样打印。
