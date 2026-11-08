import { renderMarkdown, showLoading } from 'lunarkit';
import type { CommandContext, Commands, CompletionContext } from 'lunarkit';
import { createMemoryFiles } from './files/memory-files';
import type { FileWorkspace } from './files/memory-files';
import { createMiniVim } from './editor/minivim';

// 创建示例服务器的账号、挂载策略及页面内存会话。
export function createService() {
  const guest = 'guest' + crypto.getRandomValues(new Uint32Array(1))[0]!.toString(16).padStart(8, '0');
  const users = new Set(['admin', 'user1', 'user2']);
  const files = createMemoryFiles({
    '/admin/readme.md': '# Administration\n\nWelcome to **LunarService**.\n\n- user1/ and user2/ are shared mounts.\n- Use minivim to edit text files.\n',
    '/user1/readme.md': '# User One\n\nYour private workspace.\n\n## Quick start\n\nUse `ls`, `cat`, and `minivim notes.txt`.\n\n> Changes last until this page is refreshed.\n\n[Documentation](https://example.com)\n',
    '/user1/notes.txt': 'Hello from user1.\nEdit this file with minivim.\n',
    '/user1/docs/guide.md': '# Guide\n\n```ts\nconst kit = "LunarKit";\n```\n\n<script>alert("plain text")</script>\n',
    '/user2/readme.md': '# User Two\n\nWelcome to your workspace.\n',
    '/user2/notes.txt': 'Hello from user2.\n',
  });
  let username = guest;
  let workspace: FileWorkspace | undefined;

  // 返回当前身份的提示符。
  function prompt(): string {
    return `${username} ${workspace?.pwd() ?? '/'} ❯`;
  }

  // 确认用户已登录再访问个人文件。
  function authenticated(): FileWorkspace {
    if (!workspace) throw new Error('Please login first.');
    return workspace;
  }

  // 校验没有参数的命令用法。
  function noArgs(args: readonly string[], name: string): void {
    if (args.length) throw new Error(`Usage: ${name}`);
  }

  // 显示当前用户名或随机访客身份。
  function whoami({ args, write }: CommandContext): void {
    noArgs(args, 'whoami');
    write(username);
  }

  // 模拟 SSH 风格连接与用户名、秘密密码交互。
  async function login(context: CommandContext): Promise<void> {
    const { args, signal, write, read, setPrompt } = context;
    noArgs(args, 'login');
    if (workspace) throw new Error('Already logged in. Use exit before switching users.');
    const name = (await read({ prompt: 'login as:' })).trim();
    const password = await read({ prompt: `${name}@lunarservice password:`, secret: true });
    signal.throwIfAborted();
    if (!users.has(name) || password !== 'lunarkit') throw new Error('Permission denied.');
    await showLoading({ label: 'Connecting to LunarService', duration: 3000, signal, write });
    signal.throwIfAborted();
    workspace = files.scope(`/${name}`, name === 'admin' ? { user1: '/user1', user2: '/user2' } : {});
    username = name;
    setPrompt(prompt());
    const welcome = document.createElement('section');
    const heading = document.createElement('h1');
    heading.className = 'service-banner';
    heading.textContent = 'LunarService';
    const message = document.createElement('p');
    message.textContent = `Welcome to LunarService, ${name}.\nBrowser-native session · All changes are held in memory.\nType help for available commands. Enjoy your stay.`;
    welcome.append(heading, message);
    write(welcome);
  }

  // 切换当前工作区目录，空参数返回个人根目录。
  function cd({ args, setPrompt }: CommandContext): void {
    const current = authenticated();
    if (args.length > 1) throw new Error('Usage: cd [directory]');
    current.cd(args[0] ?? '/');
    setPrompt(prompt());
  }

  // 输出工作区内的当前位置。
  function pwd({ args, write }: CommandContext): void {
    const current = authenticated();
    noArgs(args, 'pwd');
    write(current.pwd());
  }

  // 列出当前目录或指定目录的直属条目。
  function ls({ args, write }: CommandContext): void {
    const current = authenticated();
    if (args.length > 1) throw new Error('Usage: ls [directory]');
    write(current.list(args[0] ?? '.').join('\n'));
  }

  // 加载文本后按扩展名选择 Markdown 文档或安全文本输出。
  async function cat({ args, signal, write }: CommandContext): Promise<void> {
    const current = authenticated();
    if (args.length !== 1) throw new Error('Usage: cat <filename>');
    const path = args[0]!;
    const text = current.read(path);
    await showLoading({ label: `Reading ${path}`, duration: 1000, signal, write, kind: 'progress' });
    write(/\.md$/iu.test(path) ? renderMarkdown(text) : text);
  }

  // 将示例编辑器作为 SDK 的流内交互面板运行。
  async function minivim(context: CommandContext): Promise<void> {
    const current = authenticated();
    if (context.args.length !== 1) throw new Error('Usage: minivim <filename>');
    const path = context.args[0]!;
    const text = current.read(path);
    // 将编辑器保存操作绑定到当前工作区文件。
    function save(value: string): void {
      current.write(path, value);
    }
    await context.present(createMiniVim({ filename: path, text, save }));
  }

  // 展示示例命令及公开演示账号信息。
  function help({ args, write }: CommandContext): void {
    noArgs(args, 'help');
    const lines = ['LunarService · browser-native demo', 'Demo users: admin, user1, user2 · Password: lunarkit', ''];
    for (const [name, command] of Object.entries(commands)) lines.push(`${name}: ${command.description}`);
    write(lines.join('\n'));
  }

  // 退出登录并恢复本页面的原始访客身份。
  function exit({ args, write, setPrompt }: CommandContext): void {
    noArgs(args, 'exit');
    username = guest;
    workspace = undefined;
    setPrompt(prompt());
    write('Connection to LunarService closed.');
  }

  // 只在登录工作区内提供路径补全。
  function complete({ args, prefix }: CompletionContext): readonly string[] {
    return args.length ? [] : (workspace?.complete(prefix) ?? []);
  }

  // cd 补全只显示目录候选。
  function completeDirectory({ args, prefix }: CompletionContext): readonly string[] {
    return args.length ? [] : (workspace?.complete(prefix, true) ?? []);
  }

  const commands: Commands = {
    whoami: { description: 'Print the current identity.', run: whoami },
    cd: { description: 'Change directory: cd [directory].', run: cd, complete: completeDirectory },
    login: { description: 'Connect and sign in interactively.', run: login },
    ls: { description: 'List workspace files.', run: ls, complete: completeDirectory },
    cat: { description: 'Read text or Markdown: cat <filename>.', run: cat, complete },
    minivim: { description: 'Edit a file: hjkl, i/a, Esc, :w, :q.', run: minivim, complete },
    pwd: { description: 'Print the current directory.', run: pwd },
    help: { description: 'Show commands and demo credentials.', run: help },
    exit: { description: 'Log out and return to the guest session.', run: exit },
  };
  return { commands, prompt };
}
