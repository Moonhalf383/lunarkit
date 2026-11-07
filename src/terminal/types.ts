export interface TerminalOptions {
  element: HTMLElement;
  banner?: string;
  prompt?: string;
  paddingInline?: number | string;
  maxWidth?: number | string;
  onSubmit?: (text: string) => void;
}

export interface Terminal {
  write: (text: string) => void;
  focus: () => void;
  destroy: () => void;
}
