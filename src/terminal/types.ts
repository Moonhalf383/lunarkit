import type { ScrollOptions } from './scroll.js';
import type { TerminalMessages } from './messages.js';
import type { InputHistoryOptions } from '../input/history.js';
import type { Commands, TerminalOutput, TerminalView, TextOutputHandle, RuntimeOptions } from '../commands/types.js';

export interface TerminalOptions extends RuntimeOptions {
  element: HTMLElement;
  banner?: string;
  prompt?: string;
  paddingInline?: number | string;
  maxWidth?: number | string;
  maxHistoryLines?: number;
  inputBottomSpace?: number;
  autoFocus?: boolean;
  scroll?: ScrollOptions;
  messages?: Partial<TerminalMessages>;
  inputHistory?: InputHistoryOptions;
  priorityCommand?: (text: string) => string | undefined;
  onSubmit?: (text: string) => void;
  commands?: Commands;
  busyInput?: 'editable' | 'hidden';
}

export interface Terminal {
  write: (output: TerminalOutput) => void;
  writeBatch: (outputs: readonly TerminalOutput[]) => void;
  createTextOutput: (initial?: string) => TextOutputHandle;
  focus: () => void;
  scrollToLatest: () => void;
  interrupt: () => void;
  setPrompt: (text: string) => void;
  openView: () => TerminalView;
  destroy: () => void;
}
