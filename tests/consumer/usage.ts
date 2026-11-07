import { createTerminal } from 'lunarkit';
import type { TerminalOptions } from 'lunarkit';
import 'lunarkit/style.css';

const options: TerminalOptions = {
  element: document.createElement('main'),
  banner: 'LunarKit',
  paddingInline: '5vw',
  maxWidth: 1080,
};

const terminal = createTerminal(options);
terminal.write('消费接口类型验证');
terminal.focus();
terminal.destroy();
