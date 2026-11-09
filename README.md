<img src="docs/assets/lunarkit.png" alt="LunarKit" width="112" height="112">

# LunarKit

LunarKit is a lightweight, framework-independent TypeScript SDK for terminal-style websites, personal pages, and interactive stories. It combines a text prompt, command history, completion, and cancellable asynchronous commands in a single scrolling conversation.

## Usage

Import the SDK and its styles into a browser application. Fonts are optional and served from your own application.

```ts
import { createTerminal } from 'lunarkit/core';
import type { CommandContext } from 'lunarkit/core';
import 'lunarkit/style.css';
import 'lunarkit/fonts/kode-mono.css';
import 'lunarkit/fonts/prompt.css';

const element = document.querySelector<HTMLElement>('#app');
if (!element) throw new Error('Missing terminal element.');

function hello(context: CommandContext): void {
  context.write('Hello, Moon.');
}

const terminal = createTerminal({
  element,
  commands: {
    hello: { description: 'Say hello.', run: hello },
  },
});

terminal.write('Type hello to begin.');

function dispose(): void {
  terminal.destroy();
}
window.addEventListener('pagehide', dispose, { once: true });
```

Mount it in an existing page element:

```html
<main id="app"></main>
```

Press Enter to run a command, Tab to complete it, and Ctrl+C to cancel a running task. Use the arrow keys to browse command history. Call `destroy()` when the host page or component is disposed.

See the [API reference](docs/api.md) for configuration, interactive input, output components, and optional modules. A [starter project](templates/starter/README.md) and [example guide](docs/examples.md) are also available.

LunarKit's original code is [MIT licensed](LICENSE). Bundled fonts and optional Streamline icons retain their [respective licenses](THIRD_PARTY_LICENSES/).
