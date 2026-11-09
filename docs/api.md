# SDK 接入与 API

LunarKit 面向终端式网页、个人站及互动叙事。核心只依赖浏览器能力；Markdown 子模块使用 marked 与 DOMPurify。

## 入口与样式

```ts
import { createTerminal, createCleanup, typewrite } from 'lunarkit/core';
import { renderMarkdown } from 'lunarkit/markdown';
import { createBarChart } from 'lunarkit/charts';
import { createRotatingModel } from 'lunarkit/models';
import { createIcon } from 'lunarkit/icons/streamline';
import 'lunarkit/style.css';
import 'lunarkit/fonts/kode-mono.css';
import 'lunarkit/fonts/prompt.css';
```

`lunarkit` 根入口保留全部功能导出。`core` 适合纯终端页面，子路径支持按需构建。基础样式不携带字体；中文字体 `fonts/noto-sans-sc.css` 和完整预设 `fonts/all.css` 可选。WOFF2 使用相对 URL，由宿主构建工具搬运，支持缓存与 Unicode 分片请求。

## createTerminal(options)

必填 `element: HTMLElement`。`commands` 与 `onSubmit` 二选一；后者接收未经命令解析的原文。

| 配置 | 默认／行为 |
|---|---|
| banner / prompt | 可选标题／`❯` |
| autoFocus | true；false 时由宿主调用 focus |
| maxWidth / paddingInline | 1080px／响应式留白，接受数值或 CSS 长度 |
| maxHistoryLines | 500 正安全整数；逻辑输出行容量 |
| inputBottomSpace | 96 非负像素数 |
| busyInput | editable；也可 hidden |
| inputHistory | limit 默认 500，0 禁用；filter(text) 决定是否记录，deduplicate 去除相邻重复 |
| messages | 覆盖 terminalLabel、inputLabel、secretLabel、historyLabel、completionsLabel、unknownCommand 等 |
| scroll | container 为 HTMLElement，省略时滚动页面；follow 为 always／near-bottom／manual，默认 always |
| scroll.threshold | 80px；接近底部时跟随输出 |
| scroll.sceneDuration / sceneTopSpace | 240ms／0px；减少动态效果时立即对齐 |
| onCommand | 接收 start、end、cancel、error，command 为提交原文 |
| onError | 命令错误、组件释放错误、通知回调错误的宿主通道 |
| showErrors | true；false 时错误仅通过通知通道交给宿主 |

输入历史 filter 应由消费端用于排除含敏感参数的命令。提问答案不进入命令历史。messages.unknownCommand 使用 `{command}` 占位符，消费端业务错误自行本地化。messages.skipAnimation 可作为 typewrite.skipLabel 传入；消息层与独立输出工具分别配置。

near-bottom 模式在用户向上阅读时停止跟随；调用 `terminal.scrollToLatest()` 返回末尾并恢复跟随。manual 模式只在显式调用时定位。`context.nextScene()` 是消费端明确请求的滚动过场，因此独立于普通输出跟随模式。

## Terminal 与输出

- `write(string | HTMLElement | OutputComponent)`：安全文本、受信 DOM 或可释放组件。
- `writeBatch(outputs)`：一次历史收敛追加多条输出。
- `createTextOutput(initial?)`：返回 append(text)、replace(text)、close()；在原有记录中更新纯文本。close 后保留文字，更新失效。
- `focus()`、`interrupt()`、`setPrompt(text)`、`scrollToLatest()`、`openView()`、`destroy()`。

文本句柄仅在创建它的视图活动且节点未被淘汰时接受更新。命令上下文创建的句柄在命令结束或取消时自动关闭。后台任务必须主动等待其工作结束，并传递 signal；宿主长期输出可使用 Terminal 的句柄。

`OutputComponent` 为 `{ element, dispose() }`。历史淘汰、视图释放、销毁及迟到输出均触发释放；一个释放函数失败会报告给 onError，其他组件仍继续清理。普通 HTMLElement 的业务监听与资源由消费端托管；优先使用 OutputComponent 或 createCleanup。

## 命令生命周期

处理器接收 args、signal、write、writeBatch、createTextOutput、read、choose、present、setPrompt、openView、nextScene。一次运行一个命令；Ctrl+C 或显式 interrupt 取消当前命令。取消时立即发送 cancel，未取消的处理器结束时发送 end，错误发送 error 后仍发送 end；迟到输出被隔离。

取消 Promise 沿用 signal.reason。正常业务失败使用 Error。通知回调的异常交给 onError，onError 自身异常被隔离。观察器应用于遥测和宿主状态同步，避免在通知内递归提交命令或切换视图。

`Command.interruptRunning` 与 `priorityCommand` 提供显式优先命令机制。业务规则、网络权限与存储由宿主负责。

## 交互与叙事

- `read({ prompt, secret? })` 复用输入行，秘密值仅交给处理器。
- `choose({ prompt, choices })` 支持键盘、鼠标、禁用项，结束保留记录。
- `present(panel)` 托管带 closed、focus、dispose 的消费面板。
- `openView()` 返回 close()，按栈顺序恢复父流、草稿与提示符。
- `nextScene()` 保留历史并滚出此前内容后继续；命令取消与过场中的视图切换会中断任务。
- `typewrite({ element, signal, interval?, skipSignal?, skipLabel?, skipOnClick? })` 按字素输出，默认点击普通文字可立即显示全文；键盘可聚焦“显示全文”按钮。skipSignal 取消只跳过动画，命令 signal 取消会恢复全文并拒绝 Promise。
- `finishTypewrite(element)` 正常完成指定消息动画。

播放期间视觉文档暂时从辅助技术树隐藏，完整文案在完成后通过独立 status 节点播报。取消时恢复原语义。减少动态效果和 interval:0 直接保留完整文档。具体屏幕阅读器体验尚待后续人工验收。

## 清理工具

`createCleanup(onError?)` 返回 add(dispose)、listen(target,type,listener,options?)、timeout(callback,delay)、dispose()。资源按后进先出释放，每项只释放一次；关闭后的新资源立即释放。listen 返回单项释放函数；timeout 到时自动移出清理栈。清理回调异常不会阻断其他项。

## 主题变量

在挂载元素或 `.lk-terminal` 设置：

```css
#app {
  --lk-background: #fff;
  --lk-foreground: #111;
  --lk-muted: #777;
  --lk-font-family: 'Kode Mono', monospace;
  --lk-font-size: 16px;
  --lk-line-height: 1.6;
  --lk-content-width: 1080px;
  --lk-focus-color: #111;
}
```

默认终端组件使用这些变量。图表保留黑白数据表现，深色三维面板使用专属背景；消费端可根据品牌需要配置外部布局。
