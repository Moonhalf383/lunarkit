import { createTerminal } from 'lunarkit';
import 'lunarkit/style.css';
import './page.css';

const element = document.querySelector<HTMLElement>('#app');
if (!element) throw new Error('缺少 example 挂载元素');

// 将提交内容原样写入输出流。
function echo(text: string): void {
  terminal.write(text);
}

const terminal = createTerminal({ element, banner: 'LunarKit', onSubmit: echo });

// 热更新前释放当前实例。
function dispose(): void {
  terminal.destroy();
}

import.meta.hot?.dispose(dispose);
