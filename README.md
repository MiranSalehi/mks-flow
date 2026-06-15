# MKSFlow

AI-native task management for developers — works in Cursor, VS Code, Cline, Claude Code, and Antigravity.

## Development

```bash
# Install dependencies
npm install
npm install --prefix webview-ui

# Build extension + webview
npm run build

# Watch extension (use F5 in VS Code/Cursor to debug)
npm run watch
```

## Features (Phase 1 — in progress)

- Personal mode — local SQLite, offline-first
- Kanban board with drag & drop
- Quick Capture (`Cmd+Shift+T`)
- Task timer in status bar
- AI prompt generation (clipboard)
- Git changed-files integration (read-only)
- Export project to JSON

See `docs/` for full architecture and phase roadmap.
