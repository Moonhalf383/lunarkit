import type { Commands, TerminalOutput } from '../commands/types.js';

export interface TerminalOptions {
  element: HTMLElement;
  banner?: string;
  prompt?: string;
  paddingInline?: number | string;
  maxWidth?: number | string;
  onSubmit?: (text: string) => void;
  commands?: Commands;
}

export interface Terminal {
  write: (output: TerminalOutput) => void;
  focus: () => void;
  interrupt: () => void;
  destroy: () => void;
}
