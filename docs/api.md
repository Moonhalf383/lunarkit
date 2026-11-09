# API reference

LunarKit runs in the browser. Create a terminal after its host element is mounted, and call `destroy()` when the host is disposed. See [compatibility and security](compatibility.md) for browser requirements and content trust boundaries.

## Imports and fonts

The root `lunarkit` entry exports the complete SDK. Use `lunarkit/core` for terminal, command, text-file, loading, typewriter, and cleanup utilities. Optional modules have separate entry points:

```ts
import { createTerminal, createCleanup, createTextFiles, showLoading, typewrite } from 'lunarkit/core';
import { renderMarkdown } from 'lunarkit/markdown';
import { createBarChart, createLineChart, createPieChart, createProgressBar } from 'lunarkit/charts';
import { createRotatingModel } from 'lunarkit/models';
import { createIcon } from 'lunarkit/icons/streamline';
import 'lunarkit/style.css';
```

JavaScript imports do not load styles. Import `style.css` once in the application. Fonts are optional: `fonts/kode-mono.css`, `fonts/prompt.css`, and `fonts/noto-sans-sc.css` provide Latin, prompt-symbol, and Chinese coverage. Import `fonts/all.css` for the complete preset. Font CSS references bundled WOFF2 files by relative URL, allowing your build tool to serve and cache them locally.

Streamline icons use CC BY 4.0. Applications using them should credit [Streamline](https://streamlinehq.com), link to the [license](https://creativecommons.org/licenses/by/4.0/), and retain the bundled [attribution notice](../THIRD_PARTY_LICENSES/Streamline-Sharp.txt). Fonts retain their SIL OFL licenses.

## Creating a terminal

```ts
const terminal = createTerminal({
  element,
  prompt: '❯',
  autoFocus: false,
  maxWidth: 1080,
  paddingInline: 'clamp(24px, 4vw, 48px)',
  maxHistoryLines: 500,
  inputBottomSpace: 96,
  scroll: { follow: 'near-bottom' },
  commands,
});

terminal.focus();
```

`element` is required. `banner` adds a heading, and `prompt` defaults to `❯`. `maxWidth` and `paddingInline` accept pixel numbers or CSS length strings. `autoFocus` defaults to true; set it to false when the host should manage initial focus.

Provide either `commands` or `onSubmit`. Command mode parses quoted and escaped arguments. `onSubmit(text)` receives the original input, including whitespace, without command parsing. Both modes record the submitted line before invoking the handler.

`busyInput` defaults to `editable`: users may edit a draft while a command runs, and Enter leaves it pending. With `hidden`, the shell input is hidden and disabled during work. Interactive questions temporarily restore the input. Ctrl+C cancels the current task; when there is a text selection, the normal copy shortcut is preserved.

### History

`maxHistoryLines` defaults to 500 and accepts a positive safe integer. Plain text counts explicit newlines. Rich output counts block boundaries and line breaks; wrapped visual lines, the banner, and the current prompt are excluded. Old entries are removed whole. A single oversized plain-text entry keeps its trailing lines; the latest oversized rich entry remains intact. Active panels and loading indicators are temporarily protected.

Input history is independent. `inputHistory.limit` defaults to 500; 0 disables recording. `inputHistory.filter(text)` can exclude sensitive commands, and `inputHistory.deduplicate` removes adjacent duplicates. Question answers stay out of command history. Arrow keys browse previous commands and restore the draft when returning to the current position.

### Scrolling

`inputBottomSpace` defaults to 96 pixels and accepts a finite nonnegative number. It keeps room below the input, completion menu, and latest output.

`scroll.container` selects an HTMLElement as the scrolling host; omitting it uses page scrolling. `scroll.follow` accepts `always`, `near-bottom`, or `manual`, defaulting to `always`. The `near-bottom` mode pauses following when the user reads earlier content; `scroll.threshold` sets its distance threshold in pixels and defaults to 80. Call `terminal.scrollToLatest()` to return to the latest output and resume following. In manual mode, this call explicitly requests positioning.

`scroll.sceneDuration` defaults to 240 milliseconds and `scroll.sceneTopSpace` to 0 pixels. They configure `context.nextScene()`, an explicit scene transition independent of ordinary output following. Reduced-motion preferences make the transition immediate.

### Messages and notifications

`messages` overrides `terminalLabel`, `inputLabel`, `secretLabel`, `historyLabel`, `completionsLabel`, and `unknownCommand`. The unknown-command template uses `{command}` as a placeholder. `skipAnimation` is available as a label to pass to `typewrite({ skipLabel })`; standalone output tools are configured separately.

```ts
const terminal = createTerminal({
  element,
  commands,
  messages: {
    inputLabel: 'Command',
    secretLabel: 'Secret answer',
    historyLabel: 'Conversation',
    unknownCommand: 'Unknown command: {command}.',
  },
  showErrors: false,
  onCommand(event) {
    console.log(event.phase, event.command);
  },
  onError(error) {
    console.error(error);
  },
});
```

`onCommand` receives `start`, `end`, `cancel`, and `error` events. `command` contains the original submitted text. Cancellation emits `cancel` immediately; an uncancelled handler emits `end` when it finishes. A failing handler emits `error` followed by `end`. `onError` also receives component cleanup failures and notification callback errors. `showErrors` defaults to true; false delegates error presentation to the host. Exceptions from error observers are isolated.

Use these callbacks for telemetry and host state updates. Keep recursive command submission and view changes outside notification callbacks. Business-facing errors and command content are localized by the application.

## Terminal methods

`write(output)` appends a string, an HTMLElement, or an `OutputComponent`. Strings are rendered as text. DOM nodes are trusted application content; the application owns their security and listeners.

`writeBatch(outputs)` appends several entries with one history reconciliation. `createTextOutput(initial?)` returns an `append(text)`, `replace(text)`, and `close()` handle that updates one existing text entry. Closing freezes the text without removing it. Updates require the originating view to be active and the entry to remain in history.

```ts
const output = terminal.createTextOutput('Connecting…');
output.replace('Connected.');
output.append('\nReady.');
output.close();
```

`focus()` focuses the input, or the terminal's cancellation target while the input is hidden. `interrupt()` cancels the active command, clears its draft, and records `^C`. `setPrompt(text)` changes the current label without rewriting earlier submissions. `scrollToLatest()` requests the latest position. `destroy()` cancels work and releases terminal resources; repeated destruction is safe.

`openView()` starts a separate output stream and returns `{ close() }`. Closing restores the parent stream, prompt, and draft. Views close in stack order, and released components are disposed. Open a view after any current question or panel completes.

An `OutputComponent` has `{ element: HTMLElement, dispose(): void }`. History eviction, view release, terminal destruction, and rejected late output release components. Cleanup errors are reported while remaining components continue to release. Plain DOM output needs application-owned cleanup.

## Commands and completion

```ts
import type { CommandContext, CompletionContext, Commands } from 'lunarkit/core';

async function readFile(context: CommandContext): Promise<void> {
  context.write(await files.read(context.args[0] ?? 'readme.txt', context.signal));
}

function completeFile({ args, prefix }: CompletionContext) {
  return args.length ? [] : files.complete(prefix);
}

const commands: Commands = {
  cat: {
    description: 'Read a file.',
    run: readFile,
    complete: completeFile,
  },
};
```

A command has `description`, `run(context)`, optional synchronous `complete(context)`, and optional `interruptRunning`. Completion receives `args` and the current `prefix`, returning strings or `{ value, description? }` candidates. Tab inserts a unique result or extends the common prefix and opens a temporary menu. Repeated Tab cycles candidates; Shift+Tab reverses. Escape or editing closes the menu. Completion records stay outside output history.

The command context provides `args`, `signal`, `write`, `writeBatch`, `createTextOutput`, `read`, `choose`, `present`, `setPrompt`, `openView`, and `nextScene`. Context output is guarded against late writes after cancellation. Context-created text handles close automatically when the command finishes or is cancelled. Await background work and pass `signal` to network operations and other cancellable tasks.

The runtime runs one command at a time. A command marked `interruptRunning` can replace the current command. `priorityCommand(text)` maps text typed while a panel owns the keyboard to an explicitly interrupting command. Command names and application policies remain consumer-defined.

## Interactive input and scenes

`await context.read({ prompt, secret? })` requests one answer using the existing input. Secret answers have no visible echo and are excluded from command history and output. Submission retains the question label with a blank answer. The value remains browser memory and is passed to the handler.

`await context.choose({ prompt, choices })` returns an option's string value. Choices have `label`, `value`, optional `description`, and optional `disabled`. Arrow keys, Home, End, Enter, and pointer selection are supported. Confirmation retains a readable selection record.

`await context.present(panel)` mounts an application-defined panel. An `InteractivePanel` provides `element`, `closed: Promise<void>`, `focus()`, and `dispose()`. Its optional `scroll` is `focus` or `end`. Closing or cancelling releases the panel and restores shell ownership.

`await context.nextScene()` preserves history and scrolls previous content out of the viewport before the next output starts. Command cancellation, destruction, and a view switch during the transition interrupt it.

## Text files

`createTextFiles(source)` accepts relative paths mapped to strings or asynchronous loader functions. It returns `list(directory?)`, `read(path, signal?)`, and `complete(prefix)`. Directories end in `/` when listed. Paths are constrained to the mounted root, and the file set is read-only. File contents shipped in a frontend bundle are public resources.

```ts
const files = createTextFiles({
  'readme.txt': 'Hello, Moon.',
  'docs/guide.md': async () => 'A short guide.',
});
```

## Markdown and loading

`renderMarkdown(text)` returns an article element. Raw HTML is escaped and the resulting document is sanitized using a tag and attribute allowlist. Links are restricted to HTTP, HTTPS, mailto, and local anchors. Append it with `write()`.

`showLoading({ label, duration, kind?, signal, write })` displays a cancellable loading indicator for a duration in milliseconds. `kind` selects `spinner` or `progress`. Pass the command's `signal` and `write` to preserve runtime ownership.

## Typewriter output

```ts
const message = document.createElement('p');
message.textContent = 'A signal arrives from the moon.';
context.write(message);
await typewrite({ element: message, signal: context.signal, interval: 12 });
```

`typewrite()` reveals complete grapheme clusters while preserving the document structure. It accepts `interval`, `skipSignal`, `skipLabel`, and `skipOnClick`. Clicking ordinary text skips the animation by default; a keyboard-focusable button provides the same action. `finishTypewrite(element)` reveals the full message and completes normally. Aborting `skipSignal` also skips normally; aborting the command signal restores the full text and rejects with the cancellation reason.

During playback, the visual document is hidden from the accessibility tree. Completion announces the whole message through a separate status node, and the original semantics are restored. Reduced-motion preferences and an interval of 0 display the complete document immediately. SVG and transient model text retain their independent rendering lifecycle. Screen-reader behavior remains subject to the compatibility checks described in the [compatibility notes](compatibility.md).

## Charts, icons, and models

`createPieChart`, `createBarChart`, and `createLineChart` accept `{ label, data, legend?, animate? }`, where data is an array of `{ label, value }`. They return disposable output components. Values must be finite and nonnegative. Pie charts also accept `strokeWidth` from 1 to 32 and `centerLabel`; bar charts grow vertically from a fixed baseline.

`createProgressBar({ label, value, max?, animate? })` returns a disposable component with progress semantics. The maximum defaults to 100 and the value is clamped to its range.

`createIcon(name, { size?, label? })` returns a monochrome SVG. Size defaults to 24 pixels. Providing a label makes it an accessible image; otherwise it is decorative. `IconName` exposes the available aliases, whose source mapping appears in the Streamline attribution notice.

`createRotatingModel({ label, mesh, columns?, rows?, speed?, animate?, background?, light? })` returns a disposable character-rendered model. `Mesh3D` contains vertices and triangular faces. `background` is `light` or `dark`, and `light` is a three-component direction. Animation pauses offscreen and when the page is hidden, and respects reduced-motion preferences. Application models and layouts remain consumer code.

## Cleanup

`createCleanup(onError?)` returns `add(dispose)`, `listen(target, type, listener, options?)`, `timeout(callback, delay)`, and `dispose()`. Resources release once in reverse registration order. Resources added after disposal release immediately. Individual registration methods return a release function. Timers remove their registration when they fire. One callback failure does not stop remaining cleanup.

## Theme

Set CSS variables on the host element or `.lk-terminal`:

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

Terminal components use these values. Charts retain their monochrome data presentation, and dark model panels use a dedicated background. Application layout belongs to the host page.
