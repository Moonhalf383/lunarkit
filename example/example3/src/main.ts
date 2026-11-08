import { createTerminal } from 'lunarkit';
import 'lunarkit/style.css';
import { createService } from './service';
import './page.css';

const element = document.querySelector<HTMLElement>('#app');
if (!element) throw new Error('缺少 example3 挂载元素');
const service = createService();
const terminal = createTerminal({ element, prompt: service.prompt(), commands: service.commands });

// 页面热更新时释放命令、秘密输入和面板资源。
function dispose(): void {
  terminal.destroy();
}
import.meta.hot?.dispose(dispose);
