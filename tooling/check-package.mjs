import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { URL } from 'node:url';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const directory = mkdtempSync(join(tmpdir(), 'lunarkit-package-'));
let server;
let browser;
// 执行隔离目录命令并保留失败输出。
function run(command, args, cwd = directory) { return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
try {
  const packOutput = run('npm', ['pack', '--json', '--pack-destination', directory], root);
  const packed = JSON.parse(packOutput.slice(packOutput.indexOf('[\n')))[0];
  const archive = join(directory, packed.filename);
  cpSync(join(root, 'templates/starter'), join(directory, 'site'), { recursive: true });
  const site = join(directory, 'site');
  const manifest = JSON.parse(readFileSync(join(site, 'package.json'), 'utf8'));
  manifest.dependencies.lunarkit = `file:${archive}`;
  Object.assign(manifest.dependencies, { react: '^19.0.0', 'react-dom': '^19.0.0', vue: '^3.5.0' });
  writeFileSync(join(site, 'package.json'), JSON.stringify(manifest));
  run('npm', ['install', '--no-audit', '--no-fund'], site);
  run('npm', ['run', 'build'], site);
  const imports = "for (const path of ['lunarkit', 'lunarkit/core', 'lunarkit/markdown', 'lunarkit/charts', 'lunarkit/models', 'lunarkit/icons/streamline']) await import(path);";
  run(process.execPath, ['--input-type=module', '-e', imports], site);
  const packageRoot = join(site, 'node_modules/lunarkit');
  for (const path of ['LICENSE', 'THIRD_PARTY_LICENSES/Streamline-Sharp.txt', 'dist/style.css', 'dist/fonts/all.css', 'dist/fonts/kode-mono.css']) {
    if (!existsSync(join(packageRoot, path))) throw new Error(`Missing package asset: ${path}`);
  }
  const usage = readFileSync(join(root, 'tests/consumer/usage.ts'), 'utf8');
  writeFileSync(join(site, 'usage.ts'), usage);
  run(join(site, 'node_modules/.bin/tsc'), ['--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'usage.ts'], site);
  const framework = "import 'lunarkit/style.css';\n" + readFileSync(join(root, 'tests/fixtures/framework.js'), 'utf8');
  writeFileSync(join(site, 'framework.js'), framework);
  writeFileSync(join(site, 'framework.html'), '<!doctype html><html><head><meta charset="UTF-8"></head><body><div id="react"></div><div id="vue"></div><script type="module" src="/framework.js"></script></body></html>');
  writeFileSync(join(site, 'ssr.mjs'), "import React from 'react'; import {renderToString} from 'react-dom/server'; import {createSSRApp,h} from 'vue'; import {renderToString as vueRender} from 'vue/server-renderer'; import 'lunarkit/core'; if (!renderToString(React.createElement('div',{id:'terminal'})).includes('terminal')) throw Error('React SSR'); if (!(await vueRender(createSSRApp({render(){return h('div',{id:'terminal'})}}))).includes('terminal')) throw Error('Vue SSR');");
  run(process.execPath, ['ssr.mjs'], site);
  const frameworkOutput = join(directory, 'framework-dist');
  writeFileSync(join(site, 'vite.framework.config.mjs'), "export default {base:'/framework/',build:{rollupOptions:{input:'framework.html'}}};");
  run(join(site, 'node_modules/.bin/vite'), ['build', '--config', 'vite.framework.config.mjs', '--outDir', frameworkOutput, '--emptyOutDir'], site);
  const output = join(site, 'dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
  // 仅提供本轮构建产物，系统分配端口避免串用其他运行实例。
  function serve(request, response) {
    const url = new URL(request.url, 'http://localhost');
    const frameworks = url.pathname.startsWith('/framework/');
    const base = frameworks ? frameworkOutput : output;
    const path = frameworks ? url.pathname.slice('/framework'.length) : url.pathname;
    const file = resolve(base, '.' + decodeURIComponent(path === '/' ? '/index.html' : path));
    if (!file.startsWith(base + sep) || !existsSync(file)) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    response.end(readFileSync(file));
  }
  server = createServer(serve);
  // 等待自有静态服务成功绑定，不发送探测请求给未知进程。
  function listen(resolve, reject) { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }
  await new Promise(listen);
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);
  const errors = [];
  // 收集包消费端运行异常。
  function error(value) { errors.push(String(value)); }
  page.on('pageerror', error);
  await page.goto(baseURL);
  const input = page.locator('textarea');
  await input.fill('help'); await input.press('Enter');
  await page.getByText('Ctrl+C cancels a running command.', { exact: false }).waitFor();
  await input.fill('load'); await input.press('Enter');
  await page.getByText(/Loaded \d+ characters/u).waitFor();
  // 等待独立字体请求完成，检查实际加载失败。
  async function fonts() { await document.fonts.ready; return [...document.fonts].filter(font => font.status === 'error').length; }
  if (await page.evaluate(fonts)) throw new Error('Font load failure');
  await page.goto(`${baseURL}/framework/framework.html`);
  await page.locator('body[data-ready="true"]').waitFor({ state: 'attached' });
  // 读取框架挂载卸载结果。
  function result() { return window.frameworkResult; }
  const frameworks = await page.evaluate(result);
  if (frameworks.before !== 2 || frameworks.after !== 0 || errors.length) throw new Error(JSON.stringify({ frameworks, errors }));
  console.log(JSON.stringify({ archive: packed.filename, bytes: packed.size, files: packed.files.length, starter: 'build/help/load/fonts passed', imports: 'six entries passed without DOM', types: 'NodeNext passed', frameworks, ssr: 'React/Vue placeholder render passed' }, null, 2));
} finally {
  await browser?.close();
  server?.closeAllConnections();
  server?.close();
  rmSync(directory, { recursive: true, force: true });
}
