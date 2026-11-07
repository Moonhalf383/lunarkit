export type TerminalOutput = string | HTMLElement;

export interface CommandContext {
  args: readonly string[];
  signal: AbortSignal;
  write: (output: TerminalOutput) => void;
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
