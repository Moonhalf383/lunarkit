export interface FileWorkspace {
  pwd: () => string;
  cd: (path?: string) => void;
  list: (path?: string) => readonly string[];
  read: (path: string) => string;
  write: (path: string, text: string) => void;
  complete: (prefix: string, directoriesOnly?: boolean) => readonly string[];
}

// 将路径解析为工作区内的绝对路径，越过根目录时给出错误。
function resolvePath(path: string, current = '/'): string {
  if (path.includes('\\') || path.includes('\0')) throw new Error('Invalid path.');
  const parts = path.startsWith('/') ? [] : current.split('/').filter(Boolean);
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new Error('Path escapes workspace.');
      parts.pop();
    } else parts.push(part);
  }
  return '/' + parts.join('/');
}

// 创建共享内存文件集，用户工作区只暴露自己的根目录和显式挂载。
export function createMemoryFiles(seed: Readonly<Record<string, string>>) {
  const files = new Map<string, string>();
  for (const [path, text] of Object.entries(seed)) {
    const normalized = resolvePath(path);
    if (normalized === '/' || files.has(normalized)) throw new Error(`Duplicate or empty path: ${path}`);
    files.set(normalized, text);
  }

  // 判断底层路径是否为已存在的目录。
  function isDirectory(path: string): boolean {
    const prefix = path === '/' ? '/' : path + '/';
    for (const name of files.keys()) if (name.startsWith(prefix)) return true;
    return path === '/';
  }
  for (const path of files.keys()) if (isDirectory(path)) throw new Error(`File conflicts with directory: ${path}`);

  // 为一个用户创建独立当前目录，挂载引用共享的底层数据。
  function scope(root: string, mounts: Readonly<Record<string, string>> = {}): FileWorkspace {
    const base = resolvePath(root);
    if (!isDirectory(base)) throw new Error(`Directory not found: ${root}`);
    const mounted = new Map<string, string>();
    for (const [name, target] of Object.entries(mounts)) {
      if (!name || name.includes('/') || name === '.' || name === '..') throw new Error('Invalid mount name.');
      const destination = resolvePath(target);
      if (!isDirectory(destination) || files.has(`${base}/${name}`) || isDirectory(`${base}/${name}`)) throw new Error(`Invalid or conflicting mount: ${name}`);
      mounted.set(name, destination);
    }
    let current = '/';

    // 将工作区路径映射到底层路径，映射只发生在边界校验之后。
    function physical(path: string): string {
      const [head, ...tail] = path.slice(1).split('/');
      const target = mounted.get(head ?? '');
      if (target) return target + (tail.length ? '/' + tail.join('/') : '');
      return base + (path === '/' ? '' : path);
    }

    // 返回当前目录的工作区路径。
    function pwd(): string {
      return current;
    }

    // 列出工作区目录及显式挂载的直属条目。
    function list(path = '.'): readonly string[] {
      const virtual = resolvePath(path, current);
      const directory = physical(virtual);
      if (!isDirectory(directory)) throw new Error(`Directory not found: ${path}`);
      const entries = new Set<string>();
      const prefix = directory === '/' ? '/' : directory + '/';
      for (const name of files.keys()) {
        if (!name.startsWith(prefix)) continue;
        const remaining = name.slice(prefix.length);
        const separator = remaining.indexOf('/');
        entries.add(separator < 0 ? remaining : remaining.slice(0, separator + 1));
      }
      if (virtual === '/') for (const name of mounted.keys()) entries.add(name + '/');
      return [...entries].sort();
    }

    // 切换当前目录，失败时保持原位置。
    function cd(path = '/'): void {
      const next = resolvePath(path, current);
      list(next);
      current = next;
    }

    // 原样读取当前工作区内的文件。
    function read(path: string): string {
      const value = files.get(physical(resolvePath(path, current)));
      if (value === undefined) throw new Error(`File not found: ${path}`);
      return value;
    }

    // 在已有目录中保存文本，挂载与原工作区共享修改。
    function write(path: string, text: string): void {
      const virtual = resolvePath(path, current);
      const destination = physical(virtual);
      if (isDirectory(destination)) throw new Error(`Is a directory: ${path}`);
      const parent = destination.slice(0, destination.lastIndexOf('/')) || '/';
      if (!isDirectory(parent)) throw new Error(`Parent directory not found: ${path}`);
      files.set(destination, text);
    }

    // 为当前工作区提供文件及目录候选。
    function complete(prefix: string, directoriesOnly = false): readonly string[] {
      const slash = prefix.lastIndexOf('/');
      const directory = slash < 0 ? '' : prefix.slice(0, slash + 1);
      const results: string[] = [];
      try {
        for (const name of list(directory || '.')) {
          const candidate = directory + name;
          if (candidate.startsWith(prefix) && (!directoriesOnly || name.endsWith('/'))) results.push(candidate);
        }
      } catch {
        return [];
      }
      return results;
    }
    return { pwd, cd, list, read, write, complete };
  }
  return { scope };
}
