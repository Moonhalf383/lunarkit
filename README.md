# LunarKit

输入驱动的轻量浏览器终端套件。提供白底黑字、Kode Mono Medium、流式输出、输入历史、声明式命令、文件挂载、Tab 补全和可取消的异步任务。

默认提示符为 `❯`，闪烁块状光标高度等于字号，在文本行内垂直居中：文本中覆盖右侧完整字素的实际宽度，区分全角与半角；空输入、换行和文本末尾使用半角宽。覆盖文字以反色显示，选择文本时隐藏光标。移动、输入、粘贴和历史切换时光标保持常亮，最后一次操作结束 550ms 后恢复闪烁；输入法组合期间及减少动态效果模式下保持常亮。

## 本地运行

使用 Node.js 24 LTS（也支持 22.13+ 的 22 LTS）。

```sh
npm ci
npm run dev
```

打开命令输出的本地地址。首屏显示 LunarKit 大字和输入行，Enter 提交，↑ / ↓ 遍历输入历史，输入法组合期间 Enter 确认候选词。多行粘贴作为一次输入提交，前后空白和空行保留。

第二个用例运行：

```sh
npm run dev:example2
```

首屏只显示输入行。输入 `help` 查看双栏介绍，`ls` 列出挂载目录，`cat readme.txt`、`cat "hello world.txt"` 或 `cat docs/guide.md` 阅读文本。

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

返回的 `write(textOrElement)` 追加安全文本或调用者创建的 DOM 原节点，`focus()` 聚焦输入行，`interrupt()` 取消任务并清空草稿，`destroy()` 移除实例 DOM 与监听器并取消任务。DOM 节点中的事件与资源生命周期由消费端管理。页面卸载或组件销毁时调用 `destroy()`；销毁后再次调用这些方法安全。多个挂载元素可以拥有独立实例。

example 位于 `example/src/main.ts`，仅使用公开接口。开发时 Vite 将包名解析到源码；构建输出位于 `dist/index.js`、`dist/index.d.ts`、`dist/style.css`，example 制品位于 `dist/example/`。库样式内置字体数据，消费时无需请求第三方字体服务。库同时打包 Noto Sans SC Medium 中文字体和用于 `❯` 的 Noto Sans Symbols 2，统一行度量与基线，减少不同系统的视觉差异；字体覆盖范围以外的字符（如部分 emoji）仍由系统回退。三套字体的 SIL OFL 1.1 许可证位于 `THIRD_PARTY_LICENSES/`。字体按 Unicode 范围分片加载，库样式内嵌全部字体，打包体积随中文字体增加；`npm run generate:fonts` 可从依赖重新生成无注释的字体声明。

## 命令模式与挂载文件

配置 `commands` 开启命令模式，与原文 `onSubmit` 模式分别使用。命令配置提供描述、处理器和可选的同步补全器：

```ts
import { createTerminal, createTextFiles } from 'lunarkit';
import type { CommandContext, CompletionContext } from 'lunarkit';
import 'lunarkit/style.css';

const files = createTextFiles({ 'readme.txt': 'Hello, LunarKit.' });

// 读取文件并将取消信号传给异步加载。
async function cat({ args, signal, write }: CommandContext): Promise<void> {
  if (args.length !== 1) throw new Error('Usage: cat <filename>');
  write(await files.read(args[0]!, signal));
}

// 为第一个参数返回完整文件路径候选。
function complete({ args, prefix }: CompletionContext): readonly string[] {
  return args.length ? [] : files.complete(prefix);
}

const terminal = createTerminal({
  element,
  commands: {
    cat: { description: 'Print a file.', run: cat, complete },
  },
});
```

`CommandContext` 提供 `args`、`signal` 和 `write`。通过上下文 `write` 输出可得到取消隔离：Ctrl+C 后该次命令的迟到输出与错误会被过滤。消费端自行发起的网络或长任务应使用 `signal` 主动释放资源；同步长循环需要拆分成可取消的异步工作，浏览器才能处理键盘事件。

同一终端一次运行一个命令；运行期间可编辑草稿，Enter 保留草稿，Ctrl+C 取消后即可继续提交。空闲时 Ctrl+C 清空草稿并打印 `^C`，有选区时保留复制行为。上下箭头恢复历史输入及编辑前草稿。命令模式下 Tab 补全命令名和参数，候选唯一时插入，歧义时先扩展公共前缀、再列出候选；Shift+Tab 可移出输入框。参数支持引号和反斜线转义，带空格文件名会自动引用。

`createTextFiles` 接受相对路径到文本或 `() => Promise<string>` 的映射，提供 `list(directory?)`、`read(path, signal?)`、`complete(prefix)`。文件集只读，路径限制在挂载根目录；`list` 返回直属条目，目录带 `/` 后缀。第二用例的当前目录固定为挂载根目录，嵌套文件通过相对路径读取。

`example2/src/main.ts` 用 Vite `import.meta.glob` 挂载 `example2/files/` 中的 `.txt`、`.md`、`.json` 文件，惰性载入其原文。新增文件放入该目录后重新构建即可发布，内容会成为可公开读取的前端资源，应仅存放可分发的文件。`help`、`ls`、`cat` 的业务配置及帮助布局在 `example2/src/`，库提供通用命令与输出能力。

`npm run build` 构建库及两个用例，第二用例产物在 `dist/example2/`；可通过 `npm run preview:example2` 检查静态部署效果。

## 目录

```text
.mkd/                 Target、开发规范与阶段验收要求
src/
  commands/           参数解析、补全与可取消命令运行态
  files/              只读文本文件挂载
  input/              输入行与历史草稿状态
  terminal/           终端公开类型与流式输出
  theme/              主题及字体
  index.ts            库公开入口
example/
  src/                原样回显消费用例与页面样式
example2/
  files/              可公开分发的挂载文本文件
  src/                help、ls、cat 消费配置与双栏帮助布局
tests/
  unit/               状态、纯文本安全和生命周期测试
  browser/            Chromium 交互与视觉属性测试
  consumer/           构建产物的 NodeNext 类型消费验证
  production/         第二用例的静态产物读取及取消验证
tooling/              构建、检查与测试配置
```

## 验证

```sh
npx playwright install chromium
npm run check
npm audit
mkd lint --all
mkd target second_stage --check
```

`check` 包含严格类型检查、ESLint、中文单行注释检查、单元测试、库和两个 example 构建、构建产物的 NodeNext 类型消费检查、开发页面与生产产物的浏览器测试。浏览器截图写入未追踪的 `test-results/`。输入法测试通过合成组合事件验证提交边界；真实系统输入法体验可在本地手动复核。

开发规范见 `.mkd/development.mf`：函数和类附扼要中文单行注释，易混淆变量说明意图，其余位置保持无注释。`tooling/check-comments.mjs` 检查注释位置和形式；变量是否易混淆及注释是否准确仍需代码审查。

开发工具的 minimatch 暂时覆写至 `^11.0.1`，用于修复 GHSA-g3hv-75wg-m249；已通过 ESLint、类型及构建验证，上游更新后可重新评估该覆写。

## 阶段边界

`first_stage` 交付 echo 用例，`second_stage` 交付命令模式与挂载文件的 example2。echo 用例中的 `clear`、`help` 仍原样打印；example2 通过消费配置提供 `help`、`ls`、`cat`。完整愿景保留在 `.mkd/main.mf` 的 `start`，Context 与更丰富的组件生命周期等能力由后续阶段推进。
