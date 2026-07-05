# MKSFlow

<p align="center">
  <img src="media/icon.png" alt="MKSFlow" width="128" height="128" />
</p>

**Ship tasks from your editor** — with cloud AI agents, team approvals, and one-click **Send to AI** in Cursor, VS Code, Cline, Claude Code, and Antigravity.

This repo is the **MKSFlow extension**. The hosted platform lives at **[mksflow.com](https://mksflow.com/)** — web app, REST API, Cursor Cloud agents, PR previews, and Team mode. Same Kanban pipeline everywhere: **To Do → Doing → Test → Done**.

---

## Two surfaces, one pipeline

| | **Extension (IDE)** | **MKSFlow Cloud** |
|---|---|---|
| **Best for** | Capture, board, timer, local work | Agents, team sync, approvals, previews |
| **Data** | SQLite — offline-first (Personal) | Cloud sync via API token (Team) |
| **AI in the IDE** | **Send to AI** — writes `mksflow-tasks/:id.md`, opens your chat host | — |
| **AI in the cloud** | — | **Cursor Cloud agents** — dispatch, diffs, accept/reject, open PR |
| **Collaboration** | Linear / GitHub / Notion sync (Personal projects) | Shared boards, comments, attachments, email alerts |

**Personal mode** — no account required; tasks stay on your machine.  
**Team mode** — sign in from the extension; poll and sync with [mksflow.com](https://mksflow.com/). Only project/team owners approve **Test → Done**.

---

## Workflow

The same four stages on the extension board and the cloud board. Every transition is logged.

| Stage | Extension | Cloud (Team + agents) |
|-------|-----------|------------------------|
| **To Do** | Quick Capture `⌘⇧T` / `Ctrl+Shift+T`, search, create on board | Capture on web; assign to teammates |
| **Doing** | Timer, related git files, **Send to AI** | Run **Cursor Cloud agents** on linked GitHub repos; live progress in task chat |
| **Test** | Drag for review | Review agent diffs; accept/reject iterations; **PR preview** URL when checks pass; owner email alerts |
| **Done** | Export, archive | **Shipped & locked** — no edits or new agent runs; history stays for audit |

### What the cloud adds (beyond sync)

When you use Team mode or work on [mksflow.com](https://mksflow.com/), the platform handles what’s hard to do inside an editor alone:

- **Agent Cloud** — link GitHub + Cursor in your profile; prompt agents from the task panel; threaded chat with markdown, unified diffs, accept/reject gates, stop/revert, and one-click pull requests
- **PR preview environments** — per-PR live URLs (e.g. `pr-12.your-app.preview.mksflow.com`); provision once per repo; auto status when GitHub Actions deploys; torn down when the PR closes
- **Auto Kanban** — dispatch moves a task to **Doing**; a successful agent run moves it to **Test** for owner review
- **Teams** — email invitations, roles, invite codes, shared Kanban, markdown comments, image/video attachments
- **Notifications** — email for assignments, reviews, agent completion/failure, invites, and more
- **Integrations in the IDE** — Linear, GitHub, and Notion stay two-way sync in Personal projects while Team mode talks to the cloud API

You don’t need the cloud for solo offline work. Connect when a project becomes **Team** or when you want agents and previews on GitHub-linked repos.

---

## Features (extension)

### Personal mode

- **Kanban board** — drag & drop across four columns
- **Quick Capture** — `Cmd+Shift+T` / `Ctrl+Shift+T`
- **Task timer** — optional status bar display
- **Markdown descriptions** — rich editor; images stored locally
- **Git awareness** — changed files on a task (read-only)
- **Export** — project to JSON
- **Offline-first** — SQLite; UI assets bundled locally (no CDN)

### Send to AI

Structured prompt from task context (title, description, acceptance criteria, related files):

| Host | Behavior |
|------|----------|
| **Cursor** | Opens Composer with `@` context file |
| **Cline** | Attaches to Cline chat |
| **Claude Code** | Attaches to Claude Code session |
| **Antigravity** | Attaches to Antigravity chat |
| **Clipboard** | Copies prompt only (fallback) |

Set `mksflow.aiProvider` to `auto` (default) or force a host. See `docs/MULTI-IDE-AI.md`.

Same task can also run **cloud agents** on the web — extension and cloud are two surfaces on one pipeline.

### Team mode

- API token from your [mksflow.com](https://mksflow.com/) profile → extension SecretStorage
- Sync projects and tasks; role rules (e.g. only owners approve **Test → Done**)
- `mksflow.apiBaseUrl` — default `https://mksflow.com/api/v1`

### Integrations (Personal projects, in the IDE)

| Integration | Sync |
|-------------|------|
| **Linear** | Two-way issues |
| **GitHub** | Issues, Projects, PRs (cloud adds agent branches & preview deploys on linked repos) |
| **Notion** | Database / board |

Connect from the board header or command palette.

---

## Supported editors

- **Cursor** · **VS Code** / **VSCodium** · **Cline** · **Claude Code** · **Antigravity** / **Windsurf**

---

## Get started

1. Install the extension (VSIX or F5 from source below).
2. **Personal** — create a project and open the board; no account needed.
3. **Team / agents** — [Create a free account](https://mksflow.com/) → API token in Profile → Team project in the extension; link GitHub and Cursor on the web for agent + preview workflows.

---

## Install (development)

```bash
npm install
npm install --prefix webview-ui
npm run build
```

**F5** in VS Code/Cursor for Extension Development Host.

Package: `vsce package` → install `.vsix` via **Extensions → Install from VSIX**.

**SQLite ABI mismatch** after switching editors:

```bash
npm run rebuild:electron:detect
MKSFLOW_TARGET_ABI=143 npm run rebuild:electron   # example
```

Reload the window.

---

## Usage

1. Open **MKSFlow** in the activity bar.
2. Create a **project** (Personal, Team, or Linear/GitHub/Notion).
3. Open the **board** (tree or status bar).
4. Capture tasks, drag columns, start timers, **Send to AI** from the task menu.

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
Extension                         mksflow.com (cloud)
├── Kanban + SQLite (Personal)    ├── Web Kanban + Team mode
├── Send to AI (IDE agents)        ├── Cursor Cloud agents + PR previews
├── Linear / GitHub / Notion      ├── Comments, attachments, email
└── Team sync (API token) ───────►└── REST API (same services as web UI)
```

Internal docs: `docs/PROJECT.md`, `docs/HOW-TO-USE.md`.

---

## License

MIT — see [LICENSE](LICENSE).
