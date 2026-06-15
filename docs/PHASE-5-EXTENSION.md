# Phase 5 — Notion Integration (Extension)

## Summary

Phase 5 connects MKSFlow personal projects to **Notion databases** with two-way sync.

## What was added

### Infrastructure
- `src/infrastructure/notion/NotionApiClient.ts` — REST client with rate limiting (~3 req/s)
- `src/infrastructure/notion/NotionTypes.ts` — API and config types
- `src/infrastructure/notion/notionMappers.ts` — property mapping, pull/push transforms
- `src/infrastructure/notion/NotionApiError.ts`
- `src/infrastructure/sync/NotionSyncProvider.ts` — `ISyncProvider` implementation

### Services
- `NotionAuthService` — Internal Integration Token in SecretStorage (`mksflow.notion.token`)
- `NotionConfigService` — per-project database linkage + mapping in globalState
- `NotionSyncService` — connect, link, pull/push, auto-sync
- `notionContextHolder.ts`

### Extension UI / wiring
- Commands: `mksflow.connectNotion`, `mksflow.syncNotion`, `mksflow.disconnectNotion`
- `NotionSyncStatusBar`
- `WebviewMessageHandler` — Notion handlers + push/delete on local mutations
- `NotionIntegrationPanel` — connect → pick database → map properties → sync

### Settings
- `mksflow.notion.syncInterval` (seconds, default 300)
- `mksflow.notion.autoSync` (default true)

## User flow

1. Open board → **Notion** button on a personal project
2. Paste Internal Integration Token → Connect
3. Select a shared database → review auto-detected property mapping
4. Adjust status/priority value maps → **Link & sync**
5. Tasks sync both ways; Notion-linked tasks show **N** badge and ↗ link

## Manual verification

- [ ] Token stored only in SecretStorage
- [ ] Database list loads from `/search`
- [ ] Auto-mapping detects title/status/priority/tags/description
- [ ] Pull imports pages (description from property or blocks)
- [ ] Push creates pages in Notion
- [ ] Status/priority updates sync on task edit
- [ ] Archive on delete (best-effort)
- [ ] Rate limiting avoids 429 on medium databases
- [ ] Disconnect removes linked tasks and config

## Notes

- Auth uses **Internal Integration Token** (not OAuth) per Phase 5 spec
- Description: rich_text property when mapped; otherwise first page blocks flattened to plain text
- Archived Notion pages are filtered on pull
