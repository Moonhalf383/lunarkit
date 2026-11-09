export interface TerminalMessages {
  terminalLabel: string;
  inputLabel: string;
  secretLabel: string;
  historyLabel: string;
  completionsLabel: string;
  unknownCommand: string;
  skipAnimation: string;
}

export const defaultMessages: TerminalMessages = {
  terminalLabel: 'LunarKit', inputLabel: '输入内容', secretLabel: '密码', historyLabel: '交互记录', completionsLabel: 'Completions',
  unknownCommand: 'Unknown command: {command}. Type help for commands.', skipAnimation: 'Show full message',
};
