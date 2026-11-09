import { createTerminal } from 'lunarkit';
import 'lunarkit/style.css';
import 'lunarkit/fonts/all.css';
import { createMerchant } from './merchant';
import './page.css';

const element = document.querySelector<HTMLElement>('#app');
if (!element) throw new Error('Missing merchant mount element.');
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { storage = undefined; }
const merchant = createMerchant(storage);

// 在被面板接管时将明确键入的 pause 交给高优先命令。
function priorityCommand(text: string): string | undefined { return text.trim().toLowerCase() === 'pause' ? 'pause' : undefined; }
const terminal = createTerminal({ element, commands: merchant.commands, prompt: merchant.prompt(), busyInput: 'hidden', priorityCommand });
terminal.write('LuanrMerchant — a turn-based voyage. Type about, help, or play.');

// 页面热更新时清理选择、计时器与图形动画。
function dispose(): void { terminal.destroy(); }
import.meta.hot?.dispose(dispose);
