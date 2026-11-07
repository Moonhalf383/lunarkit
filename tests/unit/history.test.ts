import { describe, expect, it } from 'vitest';
import { createInputHistory } from '../../src/input/history';

// 验证空历史及原文草稿行为。
function emptyHistory(): void {
  const history = createInputHistory();
  expect(history.previous(' 草稿 ')).toBe(' 草稿 ');
  expect(history.next(' 草稿 ')).toBe(' 草稿 ');
}

// 验证上下导航边界和离开历史后的草稿恢复。
function navigateHistory(): void {
  const history = createInputHistory();
  history.remember(' first ');
  history.remember('中文🙂');
  expect(history.previous('未提交')).toBe('中文🙂');
  expect(history.previous('中文🙂')).toBe(' first ');
  expect(history.previous(' first ')).toBe(' first ');
  expect(history.next(' first ')).toBe('中文🙂');
  expect(history.next('中文🙂')).toBe('未提交');
  expect(history.next('新草稿')).toBe('新草稿');
}

// 验证空提交和重复提交均保留为历史条目。
function preserveEntries(): void {
  const history = createInputHistory();
  history.remember('');
  history.remember('');
  expect(history.previous('draft')).toBe('');
  expect(history.previous('')).toBe('');
  expect(history.next('')).toBe('');
  expect(history.next('')).toBe('draft');
}

// 组织输入历史的纯状态测试。
function historySuite(): void {
  it('空历史保留草稿', emptyHistory);
  it('遍历历史并恢复草稿', navigateHistory);
  it('保留空提交与重复提交', preserveEntries);
}

describe('input history', historySuite);
