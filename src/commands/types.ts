export interface TerminalView {
  close: () => void;
}

export interface CompletionCandidate {
  value: string;
  description?: string;
}

export interface OutputComponent {
  element: HTMLElement;
  dispose: () => void;
}

export type TerminalOutput = string | HTMLElement | OutputComponent;

export interface Choice {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface ChooseOptions {
  prompt: string;
  choices: readonly Choice[];
}

export interface ReadOptions {
  prompt: string;
  secret?: boolean;
}

export interface InteractivePanel {
  element: HTMLElement;
  closed: Promise<void>;
  focus: () => void;
  dispose: () => void;
  scroll?: 'end' | 'focus';
}

export interface CommandInteraction {
  read: (options: ReadOptions, signal: AbortSignal) => Promise<string>;
  present: (panel: InteractivePanel, signal: AbortSignal) => Promise<void>;
  choose?: (options: ChooseOptions, signal: AbortSignal) => Promise<string>;
  setPrompt: (text: string) => void;
  openView?: () => TerminalView;
  nextScene?: (signal: AbortSignal) => Promise<void>;
}

export interface CommandContext {
  args: readonly string[];
  signal: AbortSignal;
  write: (output: TerminalOutput) => void;
  read: (options: ReadOptions) => Promise<string>;
  present: (panel: InteractivePanel) => Promise<void>;
  choose: (options: ChooseOptions) => Promise<string>;
  setPrompt: (text: string) => void;
  openView: () => TerminalView;
  nextScene: () => Promise<void>;
}

export interface CompletionContext {
  args: readonly string[];
  prefix: string;
}

export interface Command {
  description: string;
  interruptRunning?: boolean;
  run: (context: CommandContext) => void | Promise<void>;
  complete?: (context: CompletionContext) => readonly (string | CompletionCandidate)[];
}

export type Commands = Readonly<Record<string, Command>>;

export interface CompletionResult {
  text: string;
  cursor: number;
  candidates: readonly string[];
  options?: readonly CompletionCandidate[];
  replacements?: readonly { text: string; cursor: number }[];
}
