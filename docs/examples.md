# Examples and local development

Use Node.js 24 LTS, then install the repository dependencies with `npm ci`. Each example consumes the public SDK interface. Its application state and layout stay in its own directory.

## Echo

Run `npm run dev` to open `example/example1/`. Input is echoed as plain text, including whitespace, HTML literals, Chinese text, and emoji. Arrow keys browse history. Multiline pasted text is submitted as one entry, and Enter confirms an active IME composition before it submits a command.

## Text files

Run `npm run dev:example2` to open `example/example2/`. Type `help`, `ls`, or `cat readme.txt`. Quoted names such as `cat "hello world.txt"` and nested paths such as `cat docs/guide.md` are supported.

Files in `example/example2/files/` are mounted through Vite's build-time imports. Adding a file requires rebuilding the application. These files become public frontend assets and should contain distributable content only.

## Workspace and editor

Run `npm run dev:example3` to open `example/example3/`. Available commands are `whoami`, `cd`, `login`, `ls`, `cat`, `minivim`, `pwd`, `help`, and `exit`.

The demonstration accounts are `admin`, `user1`, and `user2`; their public demonstration password is `lunarkit`. Login checks the answers, plays a connection animation, and updates the prompt. Each user has a logical workspace rooted at `/`; admin can also access the user workspaces through `/user1` and `/user2`.

The inline editor shows up to 15 lines. Normal mode uses a block cursor with `hjkl` navigation. `i` or `a` enters insert mode, and Escape returns to normal mode. `:w`, `:q`, `:wq`, and `:q!` save or close; Ctrl+C cancels. Data lives in page memory and resets on refresh. This example demonstrates interaction rather than server authentication or secure storage.

## LuanrMerchant

Run `npm run dev:example4` to open `example/example4/`. The game uses `help`, `about`, `play`, `pause`, `fetch`, and `do`. Its interface is English, and `play` offers three local save slots.

Use `do market`, `do buy grain 5`, `do sell grain 5`, `do refuel 10`, `do repair 10`, or `do equip shield` while docked. Each planet stocks three equipment items. Missing arguments are requested inline. `do use patch` consumes a carried item, and `do discard patch` releases an inventory slot.

`do depart prism` selects a route. Only `do travel` advances time, spending fuel and maintenance while moving 12–23 distance and generating one event. Every event offers an `endure` action costing 12 hull. The arrival turn still has an event; resolving it while alive triggers a scene transition and a destination preview. Trading, reading, and making choices do not advance turns.

`fetch` shows the ship and resources. `fetch history` shows credits, `fetch cargo` shows cargo, and a planet or item name opens its details. `pause` offers Save, Continue, and Exit; it also works during narration and choices. Saves are explicit, use localStorage, and retain the random state and pending event. Refreshing discards changes made after the last save. Ending or exiting a voyage restores the parent terminal view.

The world contains ten planets, ten goods, twenty items, and thirty events. A new run begins with 1000 credits, 100 fuel, 100 hull, and capacity for 30 cargo units. Score combines credits, turns, completed routes, and cargo resale value.

## Building and maintaining

`npm run build` builds the SDK and all four examples. `npm run build:lib` builds only the package. Output lives under `dist/`; example applications are separate from the published library. `npm run preview:example2`, `preview:example3`, and `preview:example4` serve their production builds.

`npm run check` runs type checking, lint, unit tests, builds, public declaration consumption, development suites in Chromium, Firefox, and WebKit, and production Chromium tests. Install the browsers and system dependencies with `npx playwright install --with-deps chromium firefox webkit` first. `npm run test:acceptance` checks SDK integration across the three engines; `npm run test:package` builds and installs a real package in a temporary project, then checks the starter and framework integrations. See [compatibility](compatibility.md) for runtime requirements and coverage.

The [starter template](../templates/starter/README.md) provides a smaller starting point for a new site. API behavior is documented in the [reference](api.md).
