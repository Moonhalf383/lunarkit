import { describe, expect, it } from 'vitest';
import { createMemoryFiles } from '../../example/example3/src/files/memory-files';
import { moveCharacter, moveLine } from '../../example/example3/src/editor/movement';

// 验证示例工作区的路径边界和共享挂载写入。
function workspaces(): void {
  const files = createMemoryFiles({ '/admin/info.txt': 'admin', '/user1/docs/a.md': 'one', '/user2/info.txt': 'two' });
  const user = files.scope('/user1');
  const admin = files.scope('/admin', { user1: '/user1', user2: '/user2' });
  expect(user.list()).toEqual(['docs/']);
  expect(admin.list()).toEqual(['info.txt', 'user1/', 'user2/']);
  admin.cd('user1/docs');
  admin.write('a.md', 'shared');
  expect(user.read('/docs/a.md')).toBe('shared');
  expect(admin.pwd()).toBe('/user1/docs');
  expect(user.complete('docs/')).toEqual(['docs/a.md']);
  // 尝试越过普通用户根目录。
  function escape(): void { user.cd('../user2'); }
  // 尝试以普通用户绝对路径读取其他用户。
  function sibling(): void { user.read('/user2/info.txt'); }
  expect(escape).toThrow('escapes');
  expect(sibling).toThrow('not found');
  expect(user.pwd()).toBe('/');
  admin.cd('/');
  expect(admin.complete('user')).toEqual(['user1/', 'user2/']);
}

// 验证编辑器移动不会拆分字素且可跨越空行。
function movement(): void {
  expect(moveCharacter('🙂a', 0, 1)).toBe(2);
  expect(moveCharacter('🙂a', 2, -1)).toBe(0);
  expect(moveLine('\nabc', 1, -1)).toBe(0);
  expect(moveLine('\nabc', 0, 1)).toBe(1);
  expect(moveLine('abc\nde', 2, 1)).toBe(6);
  expect(moveLine('abc\nde', 6, -1)).toBe(2);
}

// 组织示例业务层的文件与编辑规则测试。
function suite(): void {
  it('隔离用户路径并共享 admin 挂载', workspaces);
  it('按完整字素跨行移动', movement);
}
describe('example3 business rules', suite);
