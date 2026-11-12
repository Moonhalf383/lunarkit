# Compatibility and security

LunarKit targets modern browsers with ES2022, Intl.Segmenter, AbortController, MutationObserver, native textarea editing, and SVG. ResizeObserver and IntersectionObserver have limited fallbacks. Accurate caret placement and scrolling require browser layout.

## Frameworks and server rendering

Public ESM entries can be imported in Node without creating DOM objects. Create terminals and visual components after the browser mounts, and call destroy during cleanup. React effects and Vue onMounted/onUnmounted can own this lifecycle. Server-rendered pages should provide an empty mount element whose contents are managed by LunarKit. React 19 and Vue 3 client mounting, disposal, and server-rendered placeholders are covered by package-consumption checks; hydration is not covered.

Terminal nodes use the mount element's ownerDocument. Standalone chart and Markdown helpers use the global document; call them in the corresponding window when working with iframes.

## Content and permissions

write(string) renders plain text. HTMLElement and OutputComponent outputs are trusted application interfaces: the application owns their scripts, listeners, and resources. renderMarkdown escapes raw HTML and applies DOMPurify's allowlist. Links are limited to HTTP, HTTPS, mailto, and page fragments.

Commands run with the host page's browser permissions. Example accounts and local saves are demonstrations. Applications are responsible for server-side authorization, secret storage, rate limiting, and save validation.

## Content Security Policy

Fonts are self-hosted assets and can use the application's font-src policy. Caret geometry, animations, and layout use inline style properties; evaluate these against the host's style policy.

Markdown uses a sanitized DocumentFragment. A Chromium check enforces Trusted Types with the DOMPurify policy named `dompurify` permitted. Policies that prohibit this policy, stricter style rules, cross-origin fonts, and deployment-specific HTTP headers require application-level checks.

## Browser coverage

Automated suites cover Chromium and Firefox. Native clipboard automation currently uses Chromium-specific permissions. Firefox development-server runs have occasionally timed out before the application mounted; retained traces support further diagnosis. WebKit is included in CI and requires Playwright's system dependencies on Linux. Real input methods, mobile keyboards, screen-reader output, and visual interaction also require device-based checks.

## Performance and resource ownership

maxHistoryLines bounds output history. Rich records are released as complete units, while the newest oversized record is retained. writeBatch combines history updates, createTextOutput supports incremental text, and rich-content changes are coalesced by frame. Font subsets load by Unicode range.

A browser resource check writes 5000 simple components with a 500-record limit, then verifies all component disposers run when the terminal is destroyed. This validates component ownership; long-term heap usage needs separate profiling. History uses real DOM nodes; set explicit limits for large content and measure rendering on the application's target devices.
