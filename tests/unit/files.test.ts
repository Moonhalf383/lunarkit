import { describe, expect, it } from 'vitest';
import { createTextFiles } from '../../src/files/text-files';

// 验证挂载目录、路径规范化、原样读取和文件名补全。
async function mountedFiles(): Promise<void> {
  const files = createTextFiles({
    'hello world.txt': '  你好🙂\n<script>text</script>\n',
    'docs/guide.md': '# guide',
    'empty.txt': '',
    'toString': 'safe map',
  });
  expect(files.list()).toEqual(['docs/', 'empty.txt', 'hello world.txt', 'toString']);
  expect(files.list('docs')).toEqual(['guide.md']);
  expect(files.complete('docs/')).toEqual(['docs/guide.md']);
  expect(files.complete('h')).toEqual(['hello world.txt']);
  expect(files.complete('../')).toEqual([]);
  expect(await files.read('./docs/../hello world.txt')).toBe('  你好🙂\n<script>text</script>\n');
  expect(await files.read('empty.txt')).toBe('');
  expect(await files.read('toString')).toBe('safe map');
  await expect(files.read('../secret')).rejects.toThrow('escapes');
  await expect(files.read('/etc/passwd')).rejects.toThrow('Invalid');
  await expect(files.read('missing')).rejects.toThrow('not found');
  await expect(files.read('docs/')).rejects.toThrow('Not a file');
}

// 验证挂载时的路径重名和文件目录冲突。
function pathConflicts(): void {
  // 构造越界挂载以验证初始化错误。
  function invalidPath(): void {
    createTextFiles({ '../secret': '' });
  }
  // 构造规范化后的重名文件。
  function duplicatePath(): void {
    createTextFiles({ './a': '', a: '' });
  }
  // 构造文件与目录同名的挂载。
  function conflictingDirectory(): void {
    createTextFiles({ a: '', 'a/b': '' });
  }
  expect(invalidPath).toThrow('escapes');
  expect(duplicatePath).toThrow('Duplicate');
  expect(conflictingDirectory).toThrow('conflicts');
}

// 验证异步文件读取取消后立即拒绝并释放订阅。
async function abortRead(): Promise<void> {
  let resolve!: (text: string) => void;
  // 保存读取完成入口以模拟迟到文本。
  function pending(done: (text: string) => void): void {
    resolve = done;
  }
  // 模拟构建工具提供的惰性文本导入。
  function load(): Promise<string> {
    return new Promise<string>(pending);
  }
  const files = createTextFiles({ 'slow.txt': load });
  const controller = new AbortController();
  const reading = files.read('slow.txt', controller.signal);
  controller.abort();
  await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
  resolve('late');
  await expect(files.read('slow.txt', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
}

// 组织文本挂载与取消行为测试。
function suite(): void {
  it('列出读取并补全文本文件', mountedFiles);
  it('检查路径边界与重名', pathConflicts);
  it('取消惰性文件读取', abortRead);
}

describe('text files', suite);
