const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// 在只读 NORMAL 缓冲区上绘制完整字素方块，独立于浏览器原生插入光标。
export function createNormalCursor(editor: HTMLTextAreaElement, viewport: HTMLElement) {
  const mirror = document.createElement('pre');
  mirror.className = 'minivim-mirror';
  mirror.setAttribute('aria-hidden', 'true');
  const caret = document.createElement('span');
  caret.className = 'minivim-caret';
  caret.setAttribute('aria-hidden', 'true');
  viewport.append(mirror, caret);
  let normal = true;

  // 从完整文本范围读取坐标，扣除编辑器内部滚动偏移。
  function render(): void {
    caret.hidden = !normal || document.activeElement !== editor || editor.selectionStart !== editor.selectionEnd;
    if (caret.hidden) return;
    const text = document.createTextNode(editor.value + '\u200b');
    mirror.replaceChildren(text);
    const position = editor.selectionEnd;
    const segment = segmenter.segment(editor.value).containing(position);
    const range = document.createRange();
    range.setStart(text, segment?.index ?? position);
    range.setEnd(text, segment ? segment.index + segment.segment.length : position + 1);
    const rectangle = range.getBoundingClientRect();
    const bounds = mirror.getBoundingClientRect();
    const styles = getComputedStyle(editor);
    const lineHeight = parseFloat(styles.lineHeight);
    const fontSize = parseFloat(styles.fontSize);
    const row = Math.round((rectangle.top - bounds.top) / lineHeight);
    caret.style.left = `${rectangle.left - bounds.left - editor.scrollLeft}px`;
    caret.style.top = `${row * lineHeight + (lineHeight - fontSize) / 2 - editor.scrollTop}px`;
    caret.style.height = `${fontSize}px`;
    caret.style.width = segment && segment.segment !== '\n' && rectangle.width > 0 ? `${rectangle.width}px` : '1ch';
  }

  // 在模式切换时同步原生和自绘光标的唯一可见状态。
  function setNormal(enabled: boolean): void {
    normal = enabled;
    editor.classList.toggle('minivim-normal', enabled);
    render();
  }

  // 仅在本编辑器拥有焦点时处理全局选择变化。
  function selection(): void {
    if (document.activeElement === editor) render();
  }

  const events = ['focus', 'blur', 'select', 'keyup', 'input', 'scroll'];
  for (const event of events) editor.addEventListener(event, render);
  document.addEventListener('selectionchange', selection);
  document.fonts.addEventListener('loadingdone', render);
  const observer = new ResizeObserver(render);
  observer.observe(viewport);

  // 编辑器退出后释放镜像节点及选择监听。
  function dispose(): void {
    observer.disconnect();
    for (const event of events) editor.removeEventListener(event, render);
    document.removeEventListener('selectionchange', selection);
    document.fonts.removeEventListener('loadingdone', render);
    mirror.remove();
    caret.remove();
  }
  return { render, setNormal, dispose };
}
