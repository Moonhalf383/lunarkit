import { readFileSync, writeFileSync } from 'node:fs';

// 为打包字体统一基线度量，仅保留现代浏览器使用的 WOFF2 格式。
function normalizeFaces(packageName, fileName) {
  const source = readFileSync(`node_modules/@fontsource/${packageName}/${fileName}`, 'utf8');
  const faces = source.match(/@font-face\s*\{[^}]+\}/gu) ?? [];
  const normalized = [];
  for (const face of faces) {
    normalized.push(face
      .replace(/url\(\.\/files\/([^)]*)\) format\('woff2'\),[^;]+;/gu, "url('@fontsource/" + packageName + "/files/$1') format('woff2');")
      .replace(/\n\}/u, '\n  ascent-override: 98%;\n  descent-override: 30%;\n  line-gap-override: 0%;\n}'));
  }
  return normalized.join('\n\n');
}

const kode = normalizeFaces('kode-mono', '500.css');
const chinese = normalizeFaces('noto-sans-sc', '500.css');
const symbol = `@font-face {
  font-family: 'LunarKit Prompt';
  font-style: normal;
  font-display: swap;
  font-weight: 500;
  src: url('@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff2') format('woff2');
  unicode-range: U+276F;
  ascent-override: 98%;
  descent-override: 30%;
  line-gap-override: 0%;
}`;

writeFileSync('src/theme/fonts.css', `${kode}\n\n${chinese}\n\n${symbol}\n`);
