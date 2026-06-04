# How To Use These Documents With Cursor

---

## Files In This Package

| File | Purpose |
|---|---|
| `PROJECT.md` | Master document — full architecture, all models, folder structure, tech stack |
| `PHASE-1.md` | Personal Mode — local SQLite, full board UI, timer, quick capture, export |
| `PHASE-2.md` | Team Mode — cloud API, authentication, roles, owner approval |
| `PHASE-3.md` | Linear Integration — two-way sync |
| `PHASE-4.md` | GitHub Integration — Issues, Boards, Pull Requests |
| `PHASE-5.md` | Notion Integration — database board sync |
| `HOW-TO-USE.md` | This file |

---

## How To Start

### Step 1 — Create your project folder
```bash
mkdir mksflow
cd mksflow
```

### Step 2 — Copy all `.md` files into that folder

### Step 3 — Open in Cursor

### Step 4 — Open Composer (Cmd+I / Ctrl+I)

### Step 5 — Paste this as your first message:

```
Read PROJECT.md fully to understand the complete architecture and vision.
Then read PHASE-1.md and implement everything described, step by step.

Rules:
- Do not skip any step
- Do not implement Phase 2, 3, 4, or 5 yet
- Ask me before moving from one step to the next
- Start with Step 1: Project Scaffolding
```

---

## Working Through Phases

### After Phase 1 is complete and tested:
```
Phase 1 is fully working and tested.
Now read PHASE-2.md and implement Team Mode.
Do not change anything from Phase 1 — it must keep working.
```

### After Phase 2:
```
Phase 2 is complete.
Now read PHASE-3.md and implement Linear integration.
```

### And so on for Phase 4 and Phase 5.

---

## Tips For Working With Cursor

**Stay on one step at a time.**
Tell Cursor: "We are on Step 3. Do not move to Step 4 until I confirm."

**Test after every step.**
Press F5 in VS Code/Cursor to run the extension in debug mode.
Test the feature you just built before continuing.

**If Cursor goes off-spec:**
"Stop. Revert that and re-read PHASE-1.md Step 3. Follow it exactly."

**Keep PROJECT.md open.**
Cursor works best when the master document is visible in a tab.

**If you get a build error:**
Paste the full error into Cursor and say:
"Fix this error without changing anything else."

---

## Development Requirements

- Node.js 18+
- npm 9+
- VS Code 1.85+ or Cursor (latest)
- For packaging: `npm install -g @vscode/vsce`

## Quick Start Commands

```bash
# Install extension dependencies
npm install

# Install webview dependencies
cd webview-ui && npm install && cd ..

# Build webview
cd webview-ui && npm run build && cd ..

# Run extension in debug mode
# Press F5 in VS Code / Cursor

# Package for distribution
npm run build
vsce package
```
