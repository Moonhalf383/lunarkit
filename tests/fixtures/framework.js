import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createApp, h, onMounted, onUnmounted, ref } from 'vue';
import { createTerminal } from 'lunarkit/core';

// 在 React 提交 DOM 后创建终端，并交还释放函数。
function ReactTerminal() {
  const host = useRef(null);
  // 绑定 React effect 生命周期。
  function mount() { const terminal = createTerminal({ element: host.current, autoFocus: false }); return terminal.destroy; }
  useEffect(mount, []);
  return React.createElement('div', { ref: host });
}
// 创建 Vue 生命周期隔离的终端组件。
function setup() {
  const host = ref(null);
  let terminal;
  // Vue 挂载后创建浏览器资源。
  function mount() { terminal = createTerminal({ element: host.value, autoFocus: false }); }
  // Vue 卸载时释放浏览器资源。
  function unmount() { terminal.destroy(); }
  // 输出只由 SDK 管理内部内容的宿主节点。
  function render() { return h('div', { ref: host }); }
  onMounted(mount); onUnmounted(unmount);
  return render;
}
const react = createRoot(document.querySelector('#react'));
react.render(React.createElement(ReactTerminal));
const vue = createApp({ setup });
vue.mount('#vue');
// 等待 React effect 提交后执行实际框架卸载。
function finish() {
  const before = document.querySelectorAll('.lk-terminal').length;
  if (before !== 2) { setTimeout(finish, 10); return; }
  react.unmount(); vue.unmount();
  window.frameworkResult = { before, after: document.querySelectorAll('.lk-terminal').length };
  document.body.dataset.ready = 'true';
}
finish();
