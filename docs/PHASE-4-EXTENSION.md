# Phase 4 — GitHub Integration

Two-way sync for **Issues**, read-only **Pull Requests**, and **Projects v2** board status.

## Prerequisites

- Phases 1–3 complete
- GitHub [Personal Access Token](https://github.com/settings/tokens) with scopes: `repo`, `project`, `read:user`

## User flow

1. Open **MKSFlow Board** (Personal mode)
2. Select a project → click **GitHub**
3. Paste PAT → **Connect GitHub**
4. Choose repository and sync modes (Issues / PRs / Board)
5. **Link to GitHub** — issues import; local changes push via labels
6. PR tasks are read-only; add comments from task detail (when tagged `github-pr`)

## Issue status via labels

| MKSFlow status | GitHub |
|----------------|--------|
| todo | open, no mksflow labels |
| doing | label `mksflow:doing` |
| test | label `mksflow:test` |
| done | issue closed |

## Settings

| Setting | Default |
|---------|---------|
| `mksflow.github.syncInterval` | `300` (seconds) |
| `mksflow.github.autoSync` | `true` |

Token stored in **SecretStorage** only (`mksflow.github.token`).

## Commands

| Command | ID |
|---------|-----|
| Connect GitHub | `mksflow.connectGitHub` |
| Sync GitHub Now | `mksflow.syncGitHub` |
| Disconnect GitHub | `mksflow.disconnectGitHub` |

## Code map

| Path | Role |
|------|------|
| `src/infrastructure/github/GitHubApiClient.ts` | REST + GraphQL |
| `src/infrastructure/sync/GitHubSyncProvider.ts` | `ISyncProvider` (issues) |
| `src/application/services/GitHubSyncService.ts` | Pull/push, PRs, boards |
| `webview-ui/src/components/GitHub/GitHubIntegrationPanel.tsx` | Setup UI |

## Manual verification

- [ ] Connect shows GitHub username
- [ ] Issues pull and push with label sync
- [ ] PRs appear as read-only tasks
- [ ] Board mode updates project v2 status column
- [ ] Status bar shows last sync
- [ ] Disconnect removes synced GitHub tasks
