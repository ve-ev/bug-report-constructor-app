# Bug Report Constructor (YouTrack app)

A YouTrack widget that helps you **quickly assemble a consistent bug report** from reusable blocks and a guided form and create an issue draft with the generated description.

## What it does / key features

- **Guided bug report form**: summary, preconditions, steps to reproduce, expected vs actual, and additional info.
- **Steps constructor with ordering**: add and reorder steps (drag & drop) to keep reproduction steps clear.
- **Reusable “saved blocks”**: keep frequently used text snippets and insert them into your report.
- **Generated description preview**: see the final description as you build it and **copy to clipboard** (if needed).
- **Output formats / templates**: use the default Markdown output and switch to custom formats when configured.
- **Draft-aware custom fields**: can load and use custom fields from a draft issue context (when available).
- **View modes**: switch between **Wide** (default) and **Fixed (1200px)** layout.

## Stack

- Language: `TypeScript` (frontend) + `JavaScript` (YouTrack app backend)
- UI: `React 18`
- Bundler/dev server: `Vite`
- Styling: `Tailwind CSS` (via `postcss` + `tailwindcss`) + `@jetbrains/ring-ui-built`
- Linting: `ESLint`
- YouTrack apps tooling: `@jetbrains/youtrack-apps-tools` (`youtrack-app` CLI used by scripts)
- Package manager: `npm` (lockfile: `package-lock.json`)


## Project structure

High-level layout (not exhaustive):

- `manifest.json` — YouTrack app manifest (widget registration)
- `vite.config.ts` — Vite config (root `./src`, build output `./dist`, widget entry points)
- `src/`
  - `backend.js` — YouTrack app backend `httpHandler` endpoints (e.g., `saved-blocks`, `output-formats`)
  - `widgets/bug-report-constructor-app/` — the widget implementation
    - `index.html` / `index.tsx` — widget entry
    - `app.tsx` — root React component
    - `components/`, `store/`, `tools/`, `utils/`, `types.ts` — widget modules
- `public/` — static assets copied into the final bundle (see `vite-plugin-static-copy` in `vite.config.ts`)
- `dist/` — build output (generated)

## License

Licensed under the **MIT License**. See [`LICENSE`](./LICENSE).
