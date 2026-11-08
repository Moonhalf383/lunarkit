import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBarChart, createLineChart, createPieChart, createProgressBar, createRotatingModel, typewrite } from '../../src/index';
import { createChoices } from '../../src/input/choices';
import type { Mesh3D } from '../../src/index';

// 恢复定时器并清空测试节点。
function cleanup(): void { vi.useRealTimers(); document.body.replaceChildren(); }

// 验证选择跳过禁用项、确认结果及持久可读标签。
async function choices(): Promise<void> {
  const { panel, result } = createChoices({ prompt: 'Pick', choices: [{ label: 'First', value: 'a' }, { label: 'Disabled', value: 'b', disabled: true }, { label: 'Third', value: 'c' }] }, document);
  document.body.append(panel.element);
  panel.focus();
  panel.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(document.activeElement?.textContent).toBe('Third');
  panel.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(await result).toBe('c');
  await panel.closed;
  panel.dispose();
  expect(panel.element.textContent).toContain('Third');
}

// 验证打字机保持安全节点和完整字素，并在取消时恢复全文。
async function typing(): Promise<void> {
  vi.useFakeTimers();
  const element = document.createElement('article');
  element.innerHTML = '<h1>Hi🙂</h1><p>Text</p>';
  const signal = new AbortController();
  const promise = typewrite({ element, signal: signal.signal, interval: 10 });
  expect(element.querySelector('h1')).toBeTruthy();
  expect(element.textContent).toBe('');
  await vi.advanceTimersByTimeAsync(30);
  expect(element.querySelector('h1')!.textContent).toBe('Hi🙂');
  const rejection = expect(promise).rejects.toBeDefined();
  signal.abort();
  await rejection;
  expect(element.textContent).toBe('Hi🙂Text');
  expect(vi.getTimerCount()).toBe(0);
}

// 验证图表数值语义和静态动画配置。
function charts(): void {
  const data = [{ label: 'A', value: 30 }, { label: 'B', value: 70 }];
  for (const factory of [createPieChart, createBarChart, createLineChart]) {
    const component = factory({ label: 'Resources', data, animate: false });
    expect(component.element.querySelector('svg')!.getAttribute('aria-label')).toContain('A: 30');
    expect(component.element.querySelector('.lk-chart-enter')).toBeNull();
    component.dispose();
  }
  const progress = createProgressBar({ label: 'Hull', value: 120, max: 100 });
  expect(progress.element.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('100');
  progress.dispose();
}

// 验证三角面投影输出可见字符并可重复释放。
function model(): void {
  const mesh: Mesh3D = { vertices: [[0, 1, 0], [-1, -1, 0], [1, -1, 0]], faces: [[0, 1, 2]] };
  const component = createRotatingModel({ label: 'Triangle', mesh, animate: false });
  expect(component.element.textContent!.trim().length).toBeGreaterThan(0);
  expect(component.element.textContent!.split('\n')).toHaveLength(20);
  component.dispose();
  component.dispose();
}

// 组织通用流内组件回归测试。
function suite(): void {
  afterEach(cleanup);
  it('选择跳过禁用并确认', choices);
  it('打字机字素和取消', typing);
  it('图形数值和动画配置', charts);
  it('三维投影与释放', model);
}
describe('stream visuals', suite);
