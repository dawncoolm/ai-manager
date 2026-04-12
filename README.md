# AI Manager

A cross-platform desktop application for managing AI coding tool skills. Browse, install, enable, disable, and share skills across Claude Code, Codex, Gemini, GitHub Copilot, and more — all from a single UI.

## Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite 7
- **Backend**: Tauri v2 (Rust)
- **State**: Zustand
- **Routing**: react-router-dom (Hash Router)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform
- `bun` or `npm`

## Getting Started

```bash
# Install dependencies
bun install

# Start desktop development mode
bun start

# npm also works
npm start

# Build for production
bun run tauri build
```

## Supported AI Tools

| Tool | Skills Support | Config Directory |
|------|---------------|-----------------|
| Claude Code | Yes | `~/.claude/` |
| Codex (OpenAI) | Yes | `~/.codex/` |
| Google Gemini | Yes | `~/.gemini/` |
| GitHub Copilot | Yes | `~/.copilot/` |
| Cursor | Config only | Platform-specific |
| CodeBuddy | Config only | `~/.codebuddy/` |
| MarsCode | Config only | `~/.marscode/` |
| Kiro | Config only | `~/.kiro/` |

Skills can also be stored in a shared hub at `~/.agents/skills/` and installed into individual tools via symlink.

## Platform Notes

- Windows symlink creation still requires Developer Mode or administrator privileges. When Developer Mode is unavailable, the app now automatically retries install actions with a UAC elevation prompt.
- Cursor config path varies by OS: `%APPDATA%\Cursor\` on Windows, `~/Library/Application Support/Cursor/` on macOS, `~/.config/Cursor/` on Linux.

## Project Docs

See [`docs/ai-skills-manager.md`](docs/ai-skills-manager.md) for full architecture, API reference, and data models.
