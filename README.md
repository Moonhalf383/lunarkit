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

历史输出默认最多保留 **500 个逻辑行**，用 `maxHistoryLines` 正整数配置，例如 `createTerminal({ element, maxHistoryLines: 1000 })`。纯文本按显式换行统计，富内容按块元素和 `<br>` 统计；软换行、banner 和当前输入行不计入。超过上限从最早完整记录删除，单条超长纯文本仅保留末尾行。为避免破坏节点结构，单条超长富内容保留为完整最新记录；活跃面板和加载节点在结束前暂不裁剪。此配置限制历史容量，不限制可见窗口高度，也不改变 ↑ / ↓ 命令输入历史。

新增输出、加载更新和内容高度变化后，终端自动将最新内容滚动到视口内，加载时不依赖已隐藏的输入行；滚动不会改变外部输入的焦点。

返回的 `write(textOrElement)` 追加安全文本或调用者创建的 DOM 原节点，`focus()` 聚焦输入行，`interrupt()` 取消任务并清空草稿，`destroy()` 移除实例 DOM 与监听器并取消任务。DOM 节点中的事件与资源生命周期由消费端管理。页面卸载或组件销毁时调用 `destroy()`；销毁后再次调用这些方法安全。多个挂载元素可以拥有独立实例。

echo 用例位于 `example/example1/src/main.ts`，仅使用公开接口。开发时 Vite 将包名解析到源码；构建输出位于 `dist/index.js`、`dist/index.d.ts`、`dist/style.css`，echo 制品位于 `dist/example1/`。库样式内置字体数据，消费时无需请求第三方字体服务。库同时打包 Noto Sans SC Medium 中文字体和用于 `❯` 的 Noto Sans Symbols 2，统一行度量与基线，减少不同系统的视觉差异；字体覆盖范围以外的字符（如部分 emoji）仍由系统回退。三套字体的 SIL OFL 1.1 许可证位于 `THIRD_PARTY_LICENSES/`。字体按 Unicode 范围分片加载，库样式内嵌全部字体，打包体积随中文字体增加；`npm run generate:fonts` 可从依赖重新生成无注释的字体声明。

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

同一终端一次运行一个命令；默认 `busyInput: 'editable'`，运行期间可编辑草稿，Enter 保留草稿，Ctrl+C 取消后即可继续提交。消费端可配置 `busyInput: 'hidden'`，忙碌期间隐藏并暂停输入，交互提问时显示回答行；当前终端保留 Ctrl+C，完成或取消后恢复输入。example3 使用 hidden，前两个用例保留原有行为。空闲时 Ctrl+C 清空草稿并打印 `^C`，有选区时保留复制行为。上下箭头恢复历史输入及编辑前草稿。命令模式下 Tab 补全命令名和参数，候选唯一时插入，歧义时先扩展公共前缀，再于输入行下方展示临时菜单；连续 Tab 循环候选，菜单展开时 Shift+Tab 反向切换，Escape 或编辑关闭菜单。菜单关闭时 Shift+Tab 可移出输入框。候选支持字符串或 `{ value, description? }`，概要随候选显示；候选菜单独立于输出历史。参数支持引号和反斜线转义，带空格文件名会自动引用。

`createTextFiles` 接受相对路径到文本或 `() => Promise<string>` 的映射，提供 `list(directory?)`、`read(path, signal?)`、`complete(prefix)`。文件集只读，路径限制在挂载根目录；`list` 返回直属条目，目录带 `/` 后缀。第二用例的当前目录固定为挂载根目录，嵌套文件通过相对路径读取。

`example/example2/src/main.ts` 用 Vite `import.meta.glob` 挂载 `example/example2/files/` 中的 `.txt`、`.md`、`.json` 文件，惰性载入其原文。新增文件放入该目录后重新构建即可发布，内容会成为可公开读取的前端资源，应仅存放可分发的文件。`help`、`ls`、`cat` 的业务配置及帮助布局在 `example/example2/src/`，库提供通用命令与输出能力。

`npm run build` 构建库及三个用例，第二用例产物在 `dist/example2/`；可通过 `npm run preview:example2` 检查静态部署效果。

## 通用交互接口与 example3

```sh
npm run dev:example3
```

第三用例位于 `example/example3/`，提供 whoami、cd、login、ls、cat、minivim、pwd、help、exit。演示账号 `admin`、`user1`、`user2` 的公开测试密码均为 `lunarkit`。输入 `login` 后先输入用户名和无回显密码，校验通过后播放 3 秒连接动画，再显示 LunarService 欢迎信息。cat 呈现加载进度，Markdown 文档直接在流中排版。加载期间隐藏并禁用 shell 输入行，Ctrl+C 仍可取消。prompt 显示用户名和当前工作区路径，cd 后同步更新。

用户根目录在各自工作区内显示为 `/`；admin 将其他用户目录挂载在 `/user1`、`/user2`，编辑结果共享内存。退出登录保留本页面修改，刷新页面重置。**这是前端交互演示，账号与文件随前端代码公开，不提供真实服务端认证或安全存储。**

minivim 是 example3 的消费端面板，窗口最多 15 行：普通模式显示完整字素方块光标，`hjkl` 移动；`i` / `a` 切换为竖线光标并插入，`Esc` 返回方块光标；`:w` 保存，`:q` 退出，`:wq` 保存退出，`:q!` 放弃修改，Ctrl+C 取消。编辑和保存均发生在页面内存。

SDK 新增的是可复用的通用接口：

- `context.read({ prompt, secret? })`：复用输入行提问；秘密回答无回显、固定光标，答案排除输出与历史；提交后保留提问标签和空白答案行，拦截复制／剪切。回答仅交给命令处理器，仍属于浏览器内存中的数据。
- `context.setPrompt(text)` / `terminal.setPrompt(text)`：动态更新当前输入行标签，既有提交保持原标签。
- `context.present(panel)`：等待消费端流内面板关闭。`InteractivePanel` 提供 `element`、`closed: Promise<void>`、`focus()`、`dispose()`；关闭、Ctrl+C 或销毁均释放面板并恢复 shell。
- `showLoading({ label, duration, kind?, signal, write })`：通用 spinner／进度条；时长和文案由消费端决定，取消会清理计时器。
- `renderMarkdown(text)`：生成安全 Markdown 节点，标题最大 1.5em，原始 HTML 显示为文本，链接限制协议；由 `write()` 插入输出流。

```ts
import type { CommandContext } from 'lunarkit';

// 消费端自行定义业务提问和会话策略。
async function greet(context: CommandContext): Promise<void> {
  const name = await context.read({ prompt: 'Your name:' });
  context.setPrompt(`${name} ❯`);
  context.write(`Hello, ${name}.`);
}
```

**源码边界**：`src/` 提供命令、输入、面板生命周期、渲染与加载能力；账号密码、用户目录／权限、命令集合、Vim 键位和界面、欢迎文案及模拟延迟全部位于 `example/example3/src/`。SDK 不导出模拟服务器、内存用户文件系统或 minivim。

## LuanrMerchant · example4

```sh
npm run dev:example4
npm run build:example4
npm run preview:example4
```

`example/example4/` 是纯指令回合制跑商肉鸽，玩家界面为英文。命令为 **help、about、play、pause、fetch、do**；`about` 显示用户指定拼写的 LuanrMerchant banner。

- **play**：上下键选择三个存档位，进入游戏后切换到独立会话输出流，退出或结算后恢复主界面记录、提示符与草稿；已有存档可继续或开启新局。localStorage 保存显式存档和最近二十局结算历史，刷新后可恢复；浏览器禁用存储时提示当前仅本页保存。
- **pause**：流内 Save / Continue / Exit。Save 后仍保持暂停；选择或打字机期间可直接键入 `pause` 再按 Enter，中断当前交互。中断事件叙事保留待决策事件，可用 `do resolve` 继续。
- **fetch**：局外列出历史成绩，局内默认以紧凑双列显示代表飞船的旋转长方体、船体与燃料粗线环图、资源和最多六件道具，数值位于环图下方；所有 fetch 分支均以打字机揭示文字并协调图形入场，星球使用深色背景和方向光照；`fetch history` 单独查看资金折线，`fetch cargo` 查看已持有货物柱状图与容量进度。`fetch prism` 显示星球信息与模型，`fetch patch` 显示图标及逐字揭示的 Markdown 特性。
- **do**：列出当前阶段可用动作，补全同样按阶段和参数位置筛选；`do depart ` 返回其他星球，`do travel` 直接推进当前航线。每颗星球的商店固定供应三种道具，购买、菜单及补全使用同一供应规则。港口使用 `do market`、`do buy grain 5`、`do sell grain 5`、`do refuel 10`、`do repair 10`、`do equip shield`；`do use patch` 使用消耗品，`do discard patch` 释放槽位。缺少目标或数量时通过流内选择或键入补齐。
- **航行**：`do depart prism` 选择目的地，`do travel` 推进一回合；每回合随机前进 12–23 距离，消耗燃料和逐步增加的维护费，价格小幅波动，并遇到一个事件。事件解决后继续航行，到达后进入港口交易；查询、交易和决策期间时间静止。

世界包含十颗星球和十种特产，欧式距离形成带权完全图；二十件道具覆盖消耗品和被动装备，三十个事件各有明确收益、代价或风险。初始 1000 资金、100 燃料、100 船体、30 货舱和两件应急道具。空燃料航行或船体耗尽结算，维护费付不起时损伤船体；得分为资金 + 25 × 回合 + 100 × 航线 + 货物残值。事件始终提供以 12 船体为代价的 endure 选项。

### 新增 SDK 消费接口

- `context.choose({ prompt, choices })`：选项含 `label`、`value`、可选 `description` / `disabled`；上下键、Home/End、Enter 或鼠标确认，返回字符串值。完成后保留流内选择记录，Ctrl+C 取消沿用命令生命周期。
- `terminal.openView()` / `context.openView()`：创建独立输出流，返回 `{ close() }`；按栈顺序关闭以恢复父输出、标签和草稿。视图创建适合在选择完成后调用，终端销毁统一释放所有视图组件。
- `createIcon(name, { size?, label? })`：内置二十种统一线宽的通用单色 SVG 图标，支持尺寸与可访问标签，默认作为装饰图标；消费端配置图标名字。
- `typewrite({ element, signal, interval? })`：按完整字素逐步揭示已创建节点的文本；可直接处理 `renderMarkdown()` 返回的文档，保留标题和链接结构。取消时恢复完整可读文本并拒绝 Promise，减少动态效果下立即显示。动态三维文本与 SVG 图元由各自渲染器管理，打字机协调其可见性。
- `createPieChart`、`createBarChart`、`createLineChart`：接收 `{ label, data: [{ label, value }], legend?, animate? }`，返回可释放组件；黑白环图具有旋转入场，图形含可访问数值描述；环图支持 `strokeWidth` 和 `centerLabel`。
- `createProgressBar({ label, value, max?, animate? })`：图形轨道进度条，包含原生进度语义。
- `createRotatingModel({ label, mesh, columns?, rows?, speed?, animate?, background?, light? })`：接受顶点和三角面的通用网格，通过深度缓冲绘制低分辨率字符投影；屏幕外及页面隐藏时暂停，减少动态效果下显示静态模型。
- `terminal.write(component)` / `context.write(component)` 接受 `{ element, dispose }`。历史淘汰和终端销毁时释放组件，消费端组合多组件时负责在组合的 dispose 中逐个释放。
- `Command.interruptRunning` 显式声明优先命令。`TerminalOptions.priorityCommand(text)` 将面板接管期间键入的文本映射成命令，优先命令会取消原命令再执行；example4 通过该配置实现 pause。

SDK 提供与游戏内容无关的选择、渲染与生命周期能力。游戏状态、随机序列、存档校验、价格、道具、事件、飞船和星球网格、图标映射及双列布局均在 `example/example4/src/`，通过公开包入口消费 SDK。

图表参考页 `099.supply/components/004` 可访问的内容标记为 Loader，预览区未呈现动画；本实现依据需求提供黑圈旋转入场。已检查本机 `fetch --help` 的旋转、粗分辨率和字符明暗参数，并在浏览器实现同类字符投影。

## 目录

```text
.mkd/                 Target、开发规范与阶段验收要求
src/
  commands/           参数解析、补全与可取消命令运行态
  files/              只读文本文件挂载
  input/              输入行与历史草稿状态
  terminal/           终端公开类型、提问与面板生命周期
  output/             通用加载提示、安全 Markdown 与打字机输出
  visuals/            黑白图表、低分辨率三维投影和可见动画
  theme/              主题及字体
  index.ts            库公开入口
example/
  example1/           原样回显消费用例
  example2/           只读文件挂载与命令帮助用例
  example4/           LuanrMerchant 游戏、内容、存档与可视化布局
  example3/
    src/
      files/          演示内存工作区与挂载规则
      editor/         消费端 minivim 界面与键位
      service.ts      演示会话、九个命令和登录流程
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
mkd target third_stage --check
```

`check` 包含严格类型检查、ESLint、中文单行注释检查、单元测试、库和三个 example 构建、构建产物的 NodeNext 类型消费检查、开发页面与生产产物的浏览器测试。浏览器截图写入未追踪的 `test-results/`。输入法测试通过合成组合事件验证提交边界；真实系统输入法体验可在本地手动复核。

开发规范见 `.mkd/development.mf`：函数和类附扼要中文单行注释，易混淆变量说明意图，其余位置保持无注释。`tooling/check-comments.mjs` 检查注释位置和形式；变量是否易混淆及注释是否准确仍需代码审查。

开发工具的 minimatch 暂时覆写至 `^11.0.1`，用于修复 GHSA-g3hv-75wg-m249；已通过 ESLint、类型及构建验证，上游更新后可重新评估该覆写。

## 阶段边界

`first_stage` 交付 echo 用例，`second_stage` 交付命令模式与挂载文件的 example2，`third_stage` 交付通用交互能力及 example3 模拟服务器。echo 用例中的 `clear`、`help` 仍原样打印；example2 通过消费配置提供 `help`、`ls`、`cat`。完整愿景保留在 `.mkd/main.mf` 的 `start`，Context 与更丰富的组件生命周期等能力由后续阶段推进。
