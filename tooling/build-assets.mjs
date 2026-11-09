import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const output = resolve('dist/fonts');
mkdirSync(output, { recursive: true });
// 将字体声明中的资源复制到产物，并替换成可独立缓存的相对地址。
function font(packageName, file, target) {
  const base = resolve(`node_modules/@fontsource/${packageName}`);
  const source = readFileSync(resolve(base, file), 'utf8');
  const faces = source.match(/@font-face\s*\{[^}]+\}/gu) ?? [];
  const normalized = [];
  for (const face of faces) {
    const match = face.match(/url\(\.\/files\/([^)]*\.woff2)\)/u);
    if (!match) continue;
    const name = match[1];
    copyFileSync(resolve(base, 'files', name), resolve(output, name));
    normalized.push(face.replace(/src:[^;]+;/u, `src: url('./${name}') format('woff2');`).replace(/\n\}/u, '\n  ascent-override: 98%;\n  descent-override: 30%;\n  line-gap-override: 0%;\n}'));
  }
  writeFileSync(resolve(output, target), normalized.join('\n\n'));
}
font('kode-mono', '500.css', 'kode-mono.css');
font('noto-sans-sc', '500.css', 'noto-sans-sc.css');
const symbol = 'noto-sans-symbols-2-symbols-400-normal.woff2';
copyFileSync(resolve('node_modules/@fontsource/noto-sans-symbols-2/files', symbol), resolve(output, symbol));
writeFileSync(resolve(output, 'prompt.css'), `@font-face { font-family: 'LunarKit Prompt'; font-style: normal; font-weight: 500; font-display: swap; src: url('./${symbol}') format('woff2'); unicode-range: U+276F; ascent-override: 98%; descent-override: 30%; line-gap-override: 0%; }\n`);
writeFileSync(resolve(output, 'all.css'), "@import './kode-mono.css';\n@import './noto-sans-sc.css';\n@import './prompt.css';\n");
mkdirSync(dirname(resolve('dist/style.css')), { recursive: true });
copyFileSync('src/theme/style.css', 'dist/style.css');
