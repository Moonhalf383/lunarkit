const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// 依据完整字素与统一字体度量，将块状光标放在文本行的视觉中心。
export function updateCaret(input: HTMLTextAreaElement, mirror: HTMLElement, caret: HTMLElement): void {
  const document = input.ownerDocument;
  const text = document.createTextNode(`${input.value}\u200b`);
  mirror.replaceChildren(text);
  caret.hidden = input.selectionStart !== input.selectionEnd;
  const position = input.selectionEnd;
  const character = segmenter.segment(input.value).containing(position);
  const start = character?.index ?? position;
  const end = character ? start + character.segment.length : position + 1;
  const range = document.createRange();
  range.setStart(text, start);
  range.setEnd(text, end);
  if (typeof range.getBoundingClientRect !== 'function') return;
  const rectangle = range.getBoundingClientRect();
  const bounds = mirror.getBoundingClientRect();
  const styles = document.defaultView!.getComputedStyle(input);
  const lineHeight = parseFloat(styles.lineHeight);
  const fontSize = parseFloat(styles.fontSize);
  // 字体回退字框带有不同的上下留白，映射回统一行格可消除垂直偏移。
  const row = Math.round((rectangle.top - bounds.top) / lineHeight);
  const isLineBreak = character?.segment === '\n' || character?.segment === '\r\n';
  caret.style.left = `${rectangle.left - bounds.left}px`;
  caret.style.top = `${row * lineHeight + (lineHeight - fontSize) / 2}px`;
  caret.style.height = `${fontSize}px`;
  caret.style.width = character && !isLineBreak && rectangle.width > 0 ? `${rectangle.width}px` : '1ch';
}
