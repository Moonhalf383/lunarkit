import { createIcon, createTerminal, createTextFiles, createPieChart, createBarChart, createLineChart, createProgressBar, createRotatingModel, renderMarkdown, showLoading, typewrite } from 'lunarkit';
import type { CommandContext, Commands, CompletionContext, InteractivePanel, TerminalOptions } from 'lunarkit';
import 'lunarkit/style.css';

const options: TerminalOptions = {
  element: document.createElement('main'),
  banner: 'LunarKit',
  paddingInline: '5vw',
  maxWidth: 1080,
  maxHistoryLines: 500,
  inputBottomSpace: 96,
};

const terminal = createTerminal(options);
terminal.write('消费接口类型验证');
const iconOutput = document.createElement('span');
iconOutput.append(createIcon('box', { label: 'Box', size: 24 }));
terminal.write(iconOutput);
const view = terminal.openView();
view.close();
terminal.focus();
terminal.destroy();

const files = createTextFiles({ 'readme.txt': 'text' });

// 验证构建后的命令上下文及异步文本读取接口。
async function cat({ args, signal, write }: CommandContext): Promise<void> {
  write(await files.read(args[0] ?? 'readme.txt', signal));
  write(document.createElement('section'));
}

// 验证文件补全的公开类型。
function complete({ prefix }: CompletionContext): readonly string[] {
  return files.complete(prefix);
}

const commands: Commands = { cat: { description: 'Print a file.', run: cat, complete } };
const commandTerminal = createTerminal({ element: document.createElement('main'), commands });
files.list();
commandTerminal.interrupt();
commandTerminal.setPrompt('consumer ❯');
commandTerminal.destroy();

// 验证通用面板的公开类型，业务实现留在消费端。
function focus(): void {}
// 释放消费端资源。
function dispose(): void {}
const panel: InteractivePanel = { element: document.createElement('section'), closed: Promise.resolve(), focus, dispose };

// 验证交互提问、面板及渲染工具的构建声明。
async function interactive(context: CommandContext): Promise<void> {
  const view = context.openView();
  await context.nextScene();
  view.close();
  const answer = await context.read({ prompt: 'Name:', secret: true });
  await context.choose({ prompt: 'Choose:', choices: [{ label: 'One', value: 'one' }] });
  const document = renderMarkdown('# Animated');
  context.write(document);
  await typewrite({ element: document, signal: context.signal, interval: 1 });
  const chartOptions = { label: 'Data', data: [{ label: 'Value', value: 1 }], animate: false };
  context.write(createPieChart(chartOptions));
  context.write(createBarChart(chartOptions));
  context.write(createLineChart(chartOptions));
  context.write(createProgressBar({ label: 'Progress', value: 1 }));
  context.write(createRotatingModel({ label: 'Mesh', mesh: { vertices: [[0, 0, 0]], faces: [] }, animate: false }));
  context.setPrompt(`${answer} ❯`);
  await showLoading({ label: 'Loading', duration: 1, signal: context.signal, write: context.write });
  context.write(renderMarkdown('# Title'));
  await context.present(panel);
}
const interactiveCommands: Commands = { interactive: { description: 'Consumer-defined interaction.', run: interactive } };
createTerminal({ element: document.createElement('main'), commands: interactiveCommands, busyInput: 'hidden' }).destroy();
