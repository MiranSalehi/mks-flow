# Phase 2 — Extension ↔ MKSFlow Cloud

Connects the VS Code/Cursor extension to **mksflow-cloud** while keeping **Personal mode** (local SQLite) unchanged.

## Architecture

```
Personal mode  →  SQLite (Phase 1, unchanged)
Team mode      →  https://mksflow.com/api/v1  (Bearer Sanctum token)
                  cache in extension globalState
                  token in SecretStorage
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mksflow.apiBaseUrl` | `https://mksflow.com/api/v1` | Cloud API base URL |
| `mksflow.cloudSyncIntervalMs` | `30000` | Polling interval (min 10000) |

For local development against `mksflow-cloud`:

```json
{
  "mksflow.apiBaseUrl": "http://localhost:8000/api/v1"
}
```

## User flow

1. Open **MKSFlow Board**
2. Toggle **Team** in the top bar (loading overlay while switching)
3. Sign in with your mksflow.com account
4. See team projects and **all tasks** in those projects (same as the web board)
5. Move tasks through the board (status changes sync to the cloud)
6. Edit task fields, attach/view/delete media, use Markdown description editor
7. **Send to AI** works on cloud tasks (context lists cloud attachment names/ids)

Team mode does **not** allow creating/deleting projects or tasks, or local timers — manage those on the web app.

## Local end-to-end test

### 1. Start cloud API

```bash
cd ../mksflow-cloud
php artisan serve
```

Ensure database is migrated and seeded (`php artisan migrate:fresh --seed`).

### 2. Point extension at localhost

In VS Code/Cursor settings (workspace or user):

```json
"mksflow.apiBaseUrl": "http://localhost:8000/api/v1"
```

### 3. Run extension

```bash
cd mks-flow
npm run build
```

Press **F5** (Extension Development Host).

### 4. Verify

| Step | Expected |
|------|----------|
| Personal mode | Local CRUD still works |
| Personal → Team switch | Full-board loading overlay, then team data |
| Team login as `bob@mksflow.test` / `password` | Team tasks appear |
| Upload image/video on task | Gallery + lightbox preview |
| Delete attachment on task | Removed from cloud + UI |
| bob: test → done | Error (member cannot approve) |
| Login as `alice@mksflow.test` | Owner can approve test → done |
| Send to AI on cloud task with media | Prompt lists attachment names |
| Stop `php artisan serve` | Offline badge, cached tasks remain |
| Sync now (when API back) | Data refreshes |

## Code map (extension)

| Path | Role |
|------|------|
| `src/infrastructure/cloud/CloudApiClient.ts` | HTTP client (incl. attachments) |
| `src/infrastructure/cloud/cloudMappers.ts` | API → webview DTOs |
| `src/infrastructure/cloud/cloudAttachmentUtils.ts` | Attachment markdown parse/merge |
| `src/infrastructure/cloud/cloudMediaLimits.ts` | Upload size validation |
| `src/application/services/CloudAuthService.ts` | Login, SecretStorage |
| `src/application/services/CloudSyncService.ts` | Pull, cache, polling |
| `src/application/services/CloudTaskService.ts` | Status, update, attach, delete media |
| `src/presentation/webview/WebviewMessageHandler.ts` | Mode routing |
| `src/presentation/webview/cloudTaskSerialization.ts` | Attachment fetch + cache |
| `webview-ui/src/components/Cloud/` | Login + mode bar UI |
| `webview-ui/src/components/Layout/BoardModeLoadingOverlay.tsx` | Tab switch loading |

## API endpoints used

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /projects?mode=team`
- `GET /tasks` (team project tasks; filtered client-side to synced projects)
- `PUT /tasks/{id}`, `PATCH /tasks/{id}/status`, `PATCH /tasks/{id}/reorder`
- `GET /tasks/{id}/logs`
- `GET /tasks/{id}/attachments/{attachmentId}` — download media
- `POST /tasks/{id}/attachments` — upload (`multipart` field `file`)
- `DELETE /tasks/{id}/attachments/{attachmentId}` — remove media

## Out of scope (future)

- Tree view for cloud tasks
- Cloud personal project sync with local SQLite
- Team management UI inside the extension
