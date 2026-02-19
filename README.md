# Bug Report Constructor (YouTrack App)

[![JetBrains Marketplace](https://img.shields.io/badge/JetBrains_Marketplace-Bug_Report_Constructor-blue?logo=jetbrains)](https://plugins.jetbrains.com/plugin/29658-bug-report-constructor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A YouTrack widget that helps you **quickly assemble a consistent bug report** from reusable blocks and a guided form and create an issue draft with the generated description.

## Installation

Install directly from the [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/29658-bug-report-constructor).

## Key Features

- **Guided bug report form** — summary, preconditions, steps to reproduce, expected vs actual, and additional info.
- **Steps constructor with ordering** — add and reorder steps (drag & drop) to keep reproduction steps clear.
- **Reusable "saved blocks"** — keep frequently used text snippets and insert them into your report.
- **Generated description preview** — see the final description as you build it and **copy to clipboard** (if needed).
- **Output formats / templates** — use the default Markdown output and switch to custom formats when configured.
- **Draft-aware custom fields** — can load and use custom fields from a draft issue context (when available).
- **View modes** — switch between **Wide** (default) and **Fixed (1200 px)** layout.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (frontend), JavaScript (YouTrack app backend) |
| UI | React 18, @jetbrains/ring-ui-built |
| Bundler | Vite |
| Styling | Tailwind CSS (via PostCSS) |
| Linting | ESLint |
| YouTrack tooling | @jetbrains/youtrack-apps-tools (`youtrack-app` CLI) |
| Package manager | npm |

## Project Structure

```
├── manifest.json              — YouTrack app manifest (widget registration)
├── vite.config.ts             — Vite config (root ./src, build output ./dist)
├── src/
│   ├── backend.js             — YouTrack app backend httpHandler endpoints
│   └── widgets/
│       └── bug-report-constructor-app/
│           ├── index.html / index.tsx  — widget entry
│           ├── app.tsx                 — root React component
│           ├── components/             — UI components
│           ├── store/                  — state management
│           ├── tools/                  — helper utilities
│           ├── utils/                  — shared utilities
│           └── types.ts               — TypeScript types
├── public/                    — static assets (copied into the bundle)
└── dist/                      — build output (generated)
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Lint
npm run lint

# Build & validate
npm run build

# Pack for distribution
npm run pack

# Build & upload to YouTrack
npm run upload
```

## License

Licensed under the **MIT License**. See [`LICENSE`](./LICENSE).
