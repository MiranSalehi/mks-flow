# MKSFlow

<p align="center">
  <img src="media/icon.png" alt="MKSFlow" width="128" height="128" />
</p>

**AI-native task management in your editor** — Kanban board, Quick Capture, offline Personal mode, integrations, and **Send to AI** for Cursor, VS Code, Cline, Claude Code, and Antigravity.

Pairs with **[mksflow.com](https://mksflow.com/)** for Team sync, cloud agents, and PR previews. Same pipeline: **To Do → Doing → Test → Done**.

---

## In the extension

### Personal mode (offline)

- **Kanban board** — drag & drop across four columns
- **Quick Capture** — `Cmd+Shift+T` / `Ctrl+Shift+T`
- **Task timer** — optional status bar display
- **Markdown descriptions** — rich editor; images stored locally
- **Git awareness** — changed files on a task (read-only)
- **Export** — project to JSON
- **Offline-first** — SQLite; UI assets bundled locally (no CDN)

### Send to AI (best-effort)

Builds structured context from the task and writes `mksflow-tasks/:id.md` in your workspace.

| Host | Behavior |
|------|----------|
| **auto** (default) | Detect Cursor → Cline → Claude Code → Antigravity |
| **cursor** / **cline** / **claude** / **antigravity** | Force a specific chat host |
| **clipboard** | Copy prompt only |

Auto-attach works when the host extension is installed; otherwise the prompt is copied and you paste `@mksflow-tasks/:id.md` into chat. Set `mksflow.aiProvider` in Settings.

### Integrations (Personal projects)

| Integration | Sync |
|-------------|------|
| **Linear** | Two-way issues |
| **GitHub** | Issues, PRs, Projects v2 board columns |
| **Notion** | Database / board |

Connect from the board header or command palette.

### Team mode (cloud sync)

Switch the board to **Team** (not a separate project type):

- Sign in with **email/password** or paste an **API token** from your [mksflow.com](https://mksflow.com/) profile (`tasks:read` + `tasks:write`)
- Shows **tasks assigned to you** on team projects; polls for updates
- Move tasks, edit fields, upload media; **team owners** approve **Test → Done**
- **Done** cloud tasks are read-only in the extension
- **Open in cloud** for agent runs, diff review, PR workflow, and comments

Configure `mksflow.apiBaseUrl` (default: `https://mksflow.com/api/v1`).

---

## On mksflow.com (not in the extension)

These run in the browser on [mksflow.com](https://mksflow.com/):

- **Cursor Cloud agents** — dispatch, diffs, accept/reject, pull requests
- **PR preview environments** — live URL per pull request
- **Team hub** — invites, roles, shared boards
- **Comments, attachments, email notifications**

The extension syncs team tasks and links out; it does not run cloud agents locally.

---

## Limitations

- Cloud **agent dispatch**, **PR previews**, and **task comments** require opening the task on [mksflow.com](https://mksflow.com/)
- **Send to AI** is best-effort; clipboard fallback is normal when attach commands are unavailable
- **Integrations** (Linear/GitHub/Notion) are Personal-mode projects only
- Switching editors may require rebuilding the SQLite native module (see below)

---

## Supported editors

**Cursor** · **VS Code** / **VSCodium** · **Cline** · **Claude Code** · **Antigravity** / **Windsurf**

---

## Get started

1. Install the extension (VSIX or F5 from source).
2. **Personal** — create a project, open the board; no account needed.
3. **Team** — [Create an account](https://mksflow.com/) → sign in or paste API token → switch board to **Team**.

---

## Install (development)

```bash
npm install
npm install --prefix webview-ui
npm run build
```

**F5** in VS Code/Cursor for Extension Development Host.

```bash
npm run package:vsix   # → mksflow-1.0.1.vsix (includes better-sqlite3 native module)
```

**SQLite ABI mismatch** after switching editors:

```bash
npm run rebuild:electron:detect
MKSFLOW_TARGET_ABI=143 npm run rebuild:electron   # example
```

Reload the window.

---

## Usage

1. Open **MKSFlow** in the activity bar.
2. **Personal** — create a project (or link Linear/GitHub/Notion).
3. Open the **board** from the tree or status bar.
4. Quick Capture, drag columns, timers, **Send to AI** from the task menu.

| Command | Shortcut |
|---------|----------|
| Quick Capture | `Cmd+Shift+T` / `Ctrl+Shift+T` |
| Open Board | *MKSFlow: Open Board* |

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `mksflow.aiProvider` | `auto` | Send to AI host |
| `mksflow.apiBaseUrl` | `https://mksflow.com/api/v1` | Cloud API (Team mode) |
| `mksflow.gitIntegration` | `true` | Git changed files on tasks |
| `mksflow.showTimerInStatusBar` | `true` | Timer in status bar |
| `mksflow.linear.autoSync` | `true` | Linear auto-sync |
| `mksflow.github.autoSync` | `true` | GitHub auto-sync |
| `mksflow.notion.autoSync` | `true` | Notion auto-sync |

Full list: **Settings → MKSFlow**.

---

## Architecture

```
Extension (IDE)                   mksflow.com
├── Personal SQLite + Kanban        ├── Team boards + agents
├── Send to AI                      ├── PR previews + comments
├── Linear / GitHub / Notion        └── REST API
└── Team sync (assigned tasks) ────►
```

---

## License

MIT — see [LICENSE](LICENSE).

Issues: [github.com/MiranSalehi/mksflow-issues](https://github.com/MiranSalehi/mksflow-issues/issues)
