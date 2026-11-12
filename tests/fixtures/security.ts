import { createTerminal } from '../../src/core';
import { renderMarkdown } from '../../src/output/markdown';

const host = document.querySelector<HTMLElement>('#host')!;
const terminal = createTerminal({ element: host, autoFocus: false });
terminal.write('<img src=x onerror=alert(1)>');
try {
  terminal.write(renderMarkdown('**Safe** [bad](javascript:alert(1))'));
  host.dataset.markdown = 'passed';
} catch (error) {
  host.dataset.markdown = String(error);
}
host.dataset.ready = 'true';
