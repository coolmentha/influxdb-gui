# InfluxDB GUI

A modern desktop GUI for InfluxDB 1.x — read-only browsing and InfluxQL querying, built with Tauri.

See [CONTEXT.md](./CONTEXT.md) for the domain glossary, [docs/ROADMAP.md](./docs/ROADMAP.md) for the version plan, and [docs/adr/](./docs/adr/) for architectural decisions.

## Tech stack

- **Shell**: Tauri 2 (Rust backend)
- **Frontend**: React 19 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS v4
- **State**: Zustand
- **Test**: Vitest (frontend) + `cargo test` (Rust)

## Prerequisites

- **Node.js 22** (see `.nvmrc`) — use `nvm use 22`
- **pnpm 11** — `corepack enable pnpm` (ships with Node)
- **Rust stable** — https://rustup.rs
- **Windows**: Visual Studio Build Tools with the "C++ build tools" workload (MSVC `link.exe` is required by Rust on Windows)
  ```powershell
  winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  ```

## Getting started

```bash
pnpm install
pnpm tauri dev      # launches the desktop window
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Vite dev server (frontend only, no Tauri window) |
| `pnpm tauri dev` | Full app: Rust + Vite in a Tauri window |
| `pnpm build` | Type-check + Vite production build |
| `pnpm test` | Run Vitest once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm lint` | `tsc --noEmit` type check |

Rust tests: `cargo test --manifest-path src-tauri/Cargo.toml`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
