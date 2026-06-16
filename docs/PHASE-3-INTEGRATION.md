# Phase 3 — Extension ↔ Cloud Integration (Complete)

Stabilizes **Team mode** in the Cursor/VS Code extension against **mksflow-cloud** after Phase 2 agent workflow shipped on the web.

## Architecture

```
Extension (IDE)                    Cloud (web + API)
─────────────────                  ─────────────────
Personal → SQLite                  Team projects + tasks
Team → REST sync                   Agent workflow + review + PR
Send to AI → local Cursor chat     (not duplicated in extension)
Open in cloud → browser deep link
```

## Prerequisites

- mksflow-cloud migrated and running (`php artisan serve`)
- Queue worker for agent jobs (`php artisan queue:work`)
- Extension built (`npm run build` in mks-flow)

## Settings

| Setting | Example | Purpose |
|---------|---------|---------|
| `mksflow.apiBaseUrl` | `http://localhost:8000/api/v1` | REST API |
| `mksflow.webAppUrl` | `http://localhost:8000` | Optional; derived from API URL if empty |
| `mksflow.cloudSyncIntervalMs` | `30000` | Poll interval |

Cloud `.env`:

```env
CORS_ALLOWED_ORIGINS=*
# Production: restrict to your app origin + vscode-webview patterns are allowed via config
```

## API token abilities

Profile → **API Tokens** issues tokens with:

- `tasks:read` — list/show tasks, projects, logs, attachments
- `tasks:write` — create/update tasks, status, reorder, attachments
- `agent:read` — diff, history, agent run list
- `agent:dispatch` — prompt, accept/reject, PR (web/clients only)

The extension uses **tasks:read** + **tasks:write** only.

## E2E checklist

### Cloud

- [ ] `php artisan migrate:fresh --seed`
- [ ] `php artisan test --compact`
- [ ] `php artisan serve` + `queue:work`

### Extension

- [ ] F5 → Extension Development Host
- [ ] `mksflow.apiBaseUrl` → localhost
- [ ] Board → **Team** → login (`alice@mksflow.test` / `password`)
- [ ] Tasks appear; drag todo → doing → test
- [ ] **bob**: test → done fails (member); **alice** succeeds
- [ ] Task menu → **Open in cloud** opens `/projects/{id}?task={id}`
- [ ] **Send to AI** opens Cursor chat (local, not cloud agent)
- [ ] Stop `php artisan serve` → offline badge, cached tasks remain
- [ ] Restore API → **Sync now** refreshes

### Agent (web only)

- [ ] From cloud UI: dispatch agent on linked GitHub project task
- [ ] Review diff → accept iteration
- [ ] Extension shows **Review** badge after sync when `waiting_for_user`

## Code map

| Area | Path |
|------|------|
| Cloud URLs | `src/shared/cloudUrls.ts` |
| Cloud task panel | `webview-ui/src/components/Cloud/CloudTaskPanel.tsx` |
| Open in cloud | `OPEN_CLOUD_TASK` in `WebviewMessageHandler.ts` |
| API abilities | `mksflow-cloud/routes/api.php` + `ApiTokenIssuer` |

## Out of scope

- Cloud agent dispatch from extension
- Personal SQLite ↔ cloud bidirectional sync
- Team management inside extension
