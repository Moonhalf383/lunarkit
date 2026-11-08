export type TerminalOutput = string | HTMLElement;

export interface ReadOptions {
  prompt: string;
  secret?: boolean;
}

export interface InteractivePanel {
  element: HTMLElement;
  closed: Promise<void>;
  focus: () => void;
  dispose: () => void;
}

export interface CommandInteraction {
  read: (options: ReadOptions, signal: AbortSignal) => Promise<string>;
  present: (panel: InteractivePanel, signal: AbortSignal) => Promise<void>;
  setPrompt: (text: string) => void;
}

export interface CommandContext {
  args: readonly string[];
  signal: AbortSignal;
  write: (output: TerminalOutput) => void;
  read: (options: ReadOptions) => Promise<string>;
  present: (panel: InteractivePanel) => Promise<void>;
  setPrompt: (text: string) => void;
}

export interface CompletionContext {
  args: readonly string[];
  prefix: string;
}

export interface Command {
  description: string;
  run: (context: CommandContext) => void | Promise<void>;
  complete?: (context: CompletionContext) => readonly string[];
}

export type Commands = Readonly<Record<string, Command>>;

export interface CompletionResult {
  text: string;
  cursor: number;
  candidates: readonly string[];
}
