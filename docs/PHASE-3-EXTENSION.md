# Phase 3 — Linear Integration

Two-way sync between local MKSFlow projects and Linear issues.

**Status:** Implementation complete (E2E verification deferred — see `mksflow-cloud/UNTESTED-BACKLOG.md`).

## Prerequisites

- Phases 1 and 2 complete
- Linear [Personal API key](https://linear.app/settings/api)

## User flow

1. Open **MKSFlow Board** (Personal mode)
2. Select a project → click **Linear** in the header
3. Paste API key → **Connect Linear**
4. Choose team (+ optional Linear project) → **Link to Linear**
5. Issues import; local task changes push to Linear on save/status change
6. **Sync now** or wait for auto-sync (default 5 minutes)

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mksflow.linear.syncInterval` | `300` | Auto-sync interval (seconds, min 60) |
| `mksflow.linear.autoSync` | `true` | Enable background sync |

API key is stored in **SecretStorage** only (`mksflow.linear.apiKey`).

## Commands

| Command | ID |
|---------|-----|
| Connect Linear | `mksflow.connectLinear` |
| Sync Linear Now | `mksflow.syncLinear` |
| Disconnect Linear | `mksflow.disconnectLinear` |

## Code map

| Path | Role |
|------|------|
| `src/infrastructure/linear/LinearApiClient.ts` | GraphQL client |
| `src/infrastructure/sync/LinearSyncProvider.ts` | `ISyncProvider` |
| `src/application/services/LinearSyncService.ts` | Pull/push, conflicts, auto-sync |
| `src/application/services/LinearAuthService.ts` | API key in SecretStorage |
| `src/application/services/LinearConfigService.ts` | Per-project linkage |
| `webview-ui/src/components/Linear/LinearIntegrationPanel.tsx` | Setup UI |
| `src/presentation/statusbar/LinearSyncStatusBar.ts` | Status bar sync indicator |

## Conflict resolution

Last-write-wins by `updatedAt`. If both sides changed since last sync, **Linear wins** and a task log entry is written.

## Manual verification

- [ ] Connect with valid API key shows organization name
- [ ] Link project imports issues with correct status mapping
- [ ] Create local task → appears in Linear
- [ ] Status change in board → reflects in Linear
- [ ] Change in Linear → reflects after sync
- [ ] Status bar shows last sync time
- [ ] Disconnect removes synced issues from project
