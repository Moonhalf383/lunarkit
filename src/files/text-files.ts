export type TextFileSource = string | (() => Promise<string>);

export interface TextFiles {
  list: (directory?: string) => readonly string[];
  read: (path: string, signal?: AbortSignal) => Promise<string>;
  complete: (prefix: string) => readonly string[];
}

// 规范挂载路径并检查根目录边界。
function normalizePath(path: string): string {
  if (path.startsWith('/') || /^[a-z]:/iu.test(path) || path.includes('\\') || path.includes('\0')) {
    throw new Error(`Invalid mounted path: ${path}`);
  }
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new Error(`Path escapes mounted directory: ${path}`);
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

// 让文本加载响应取消信号并及时释放监听器。
async function readSource(source: TextFileSource, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  return new Promise<string>(resolveSource);

  // 注册读取结果及取消事件，并确保任一完成后释放监听。
  function resolveSource(resolve: (text: string) => void, reject: (reason: unknown) => void): void {
    // 清理读取期间的取消监听。
    function cleanup(): void {
      signal?.removeEventListener('abort', abort);
    }
    // 响应取消并保留调用者提供的原因。
    function abort(): void {
      cleanup();
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    }
    // 将成功文本交给消费端。
    function success(text: string): void {
      cleanup();
      resolve(text);
    }
    // 将读取错误交给消费端。
    function failure(error: unknown): void {
      cleanup();
      reject(error);
    }
    signal?.addEventListener('abort', abort, { once: true });
    try {
      Promise.resolve(typeof source === 'string' ? source : source()).then(success, failure);
    } catch (error) {
      failure(error);
    }
  }
}

// 从构建时导入的文本映射创建只读文件集。
export function createTextFiles(sources: Readonly<Record<string, TextFileSource>>): TextFiles {
  const files = new Map<string, TextFileSource>();
  for (const [path, source] of Object.entries(sources)) {
    const normalized = normalizePath(path);
    if (!normalized || files.has(normalized)) throw new Error(`Duplicate or empty file path: ${path}`);
    files.set(normalized, source);
  }
  for (const path of files.keys()) {
    const parts = path.split('/');
    parts.pop();
    while (parts.length) {
      if (files.has(parts.join('/'))) throw new Error(`File conflicts with directory: ${path}`);
      parts.pop();
    }
  }

  // 列出指定目录的直属文件和子目录。
  function list(directory = ''): readonly string[] {
    const normalized = normalizePath(directory);
    const prefix = normalized ? `${normalized}/` : '';
    const entries = new Set<string>();
    for (const path of files.keys()) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      const separator = rest.indexOf('/');
      entries.add(separator < 0 ? rest : rest.slice(0, separator + 1));
    }
    if (normalized && !entries.size) throw new Error(`Directory not found: ${directory}`);
    return [...entries].sort();
  }

  // 原样读取挂载文件，取消时及时拒绝挂起读取。
  async function read(path: string, signal?: AbortSignal): Promise<string> {
    const normalized = normalizePath(path);
    if (path.endsWith('/')) throw new Error(`Not a file: ${path}`);
    const source = files.get(normalized);
    if (source === undefined) throw new Error(`File not found: ${path}`);
    return readSource(source, signal);
  }

  // 返回路径前缀所指目录中的匹配候选。
  function complete(prefix: string): readonly string[] {
    const separator = prefix.lastIndexOf('/');
    const directory = separator < 0 ? '' : prefix.slice(0, separator + 1);
    const candidates: string[] = [];
    try {
      for (const name of list(directory)) {
        const candidate = directory + name;
        if (candidate.startsWith(prefix)) candidates.push(candidate);
      }
    } catch {
      return [];
    }
    return candidates;
  }

  return { list, read, complete };
}
