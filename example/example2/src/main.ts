import { createTerminal, createTextFiles } from 'lunarkit';
import 'lunarkit/style.css';
import 'lunarkit/fonts/all.css';
import { createFileCommands } from './commands';
import './page.css';

const element = document.querySelector<HTMLElement>('#app');
if (!element) throw new Error('缺少 example2 挂载元素');

const sources = import.meta.glob<string>('../files/**/*.{txt,md,json}', { query: '?raw', import: 'default' });
const mounted: Record<string, () => Promise<string>> = {};
for (const [path, load] of Object.entries(sources)) mounted[path.slice('../files/'.length)] = load;
const files = createTextFiles(mounted);
const terminal = createTerminal({ element, commands: createFileCommands(files) });

// 热更新前取消命令并销毁终端实例。
function dispose(): void {
  terminal.destroy();
}

import.meta.hot?.dispose(dispose);
