import type { Commands } from 'lunarkit';

// 创建保留语义和安全文本的双栏帮助内容。
export function createHelp(commands: Commands): HTMLElement {
  const section = document.createElement('section');
  section.className = 'command-help';
  section.setAttribute('aria-label', 'LunarKit help');
  const heading = document.createElement('h1');
  heading.className = 'command-help-brand';
  for (const text of ['Lunar', 'Kit']) {
    const line = document.createElement('span');
    line.textContent = text;
    heading.append(line);
  }
  const details = document.createElement('div');
  details.className = 'command-help-details';
  const description = document.createElement('p');
  description.textContent = 'LunarKit is a lightweight, input-driven UI kit for browser-native command interfaces, stream-based output, and interactive content.';
  const list = document.createElement('dl');
  for (const [name, command] of Object.entries(commands)) {
    const row = document.createElement('div');
    row.className = 'command-help-entry';
    const term = document.createElement('dt');
    term.textContent = `${name}:`;
    const definition = document.createElement('dd');
    definition.textContent = command.description;
    row.append(term, definition);
    list.append(row);
  }
  details.append(description, list);
  section.append(heading, details);
  return section;
}
