import './theme/style.css';

export { createTerminal } from './terminal/create-terminal.js';
export type { Terminal, TerminalOptions } from './terminal/types.js';
export type { Command, Commands, CommandContext, CompletionContext, TerminalOutput } from './commands/types.js';
export { createTextFiles } from './files/text-files.js';
export type { TextFiles, TextFileSource } from './files/text-files.js';
