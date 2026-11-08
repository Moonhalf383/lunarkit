import type { Commands, TerminalOutput } from '../commands/types.js';

export interface TerminalOptions {
  element: HTMLElement;
  banner?: string;
  prompt?: string;
  paddingInline?: number | string;
  maxWidth?: number | string;
  maxHistoryLines?: number;
  onSubmit?: (text: string) => void;
  commands?: Commands;
  busyInput?: 'editable' | 'hidden';
}

export interface Terminal {
  write: (output: TerminalOutput) => void;
  focus: () => void;
  interrupt: () => void;
  setPrompt: (text: string) => void;
  destroy: () => void;
}
