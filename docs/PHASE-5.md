# Phase 5 — Notion Integration
## Cursor Implementation Prompt

---

## Prerequisites

Phases 1 through 4 must be complete.
Read `PROJECT.md` before proceeding.

---

## Phase 5 Goal

Connect MKSFlow with **Notion databases**.

A developer can:
- Connect their Notion workspace
- Select a Notion Database (board view)
- Pull pages from that database as tasks
- Push tasks created in extension back to Notion
- Sync status changes in both directions

---

## Authentication

Notion uses OAuth2 for workspace-level access.

For Phase 5: **Notion Internal Integration Token** (simpler).
Full OAuth2 in a future version.

Token stored in `vscode.SecretStorage` under `mksflow.notion.token`.

Required capabilities for the integration:
- Read content
- Update content
- Insert content

---

## Notion API Details

- Base URL: `https://api.notion.com/v1`
- Version header: `Notion-Version: 2022-06-28`
- Docs: https://developers.notion.com

---

## NotionSyncProvider

### File: `src/infrastructure/sync/NotionSyncProvider.ts`

Implements `ISyncProvider`.

---

## API Endpoints Used

```
GET  /databases/{database_id}                  Get database schema
POST /databases/{database_id}/query            Query pages (with filters/pagination)
POST /pages                                    Create page (new task)
PATCH /pages/{page_id}                         Update page properties
GET  /pages/{page_id}                          Get page details
POST /blocks/{block_id}/children               Append block (for description)
GET  /blocks/{block_id}/children               Get page content blocks
GET  /search                                   Search databases the integration can access
```

---

## Database Schema Mapping

Notion databases have flexible properties. The extension needs to map Notion properties to task fields.

### Auto-detection
When user connects a Notion database, the extension:
1. Fetches the database schema
2. Auto-detects property types:
   - `Select` or `Status` → map to task status
   - `Select` → map to priority
   - `Multi-select` → map to tags
   - `Title` → task title
   - `Rich text` → description
   - `URL` → externalUrl
3. Shows mapping UI for user to confirm or adjust

### Default Mapping UI

```
Notion Property       →   Task Field
─────────────────────────────────────
"Name" (title)        →   title        [auto]
"Status" (status)     →   status       [select mapping below]
"Priority" (select)   →   priority     [select mapping below]
"Tags" (multi-select) →   tags         [auto]
"Description" (text)  →   description  [auto]
```

### Status Mapping (user-configurable)

```
Notion Status Value    →   Extension Status
"Not Started"          →   todo
"In Progress"          →   doing
"In Review"            →   test
"Done"                 →   done
```

User selects mapping in UI — Notion status names vary per database.

### Priority Mapping (user-configurable)
```
Notion Priority Value  →   Extension Priority
"Low"                  →   low
"Medium"               →   medium
"High"                 →   high
"Urgent"               →   critical
```

---

## Data Flow

### Pull (Notion → Extension)

```typescript
async pullTasks(projectId: string): Promise<ExternalTask[]> {
  // 1. Query Notion database with pagination
  // 2. For each page, extract properties using mapping config
  // 3. Fetch page content blocks for full description
  // 4. Map to ExternalTask[]
  // 5. Store in local DB with externalId = notion page ID
}
```

### Push (Extension → Notion)

```typescript
async pushTask(task: Task): Promise<string> {
  // 1. Map task fields to Notion properties using reverse mapping
  // 2. POST /pages with parent database_id and properties
  // 3. If task.description set: append rich text block to page
  // 4. Return Notion page ID as externalId
}
```

### Update (on status change)

```typescript
async updateTask(task: Task): Promise<void> {
  // 1. Map task.status to Notion status value using mapping config
  // 2. PATCH /pages/{externalId} with new status property
  // 3. Update updatedAt
}
```

---

## Notion API Quirks to Handle

- **Rate limiting:** 3 requests/second — implement request queue with delay
- **Block content:** description is stored as blocks, not a simple property — fetch separately
- **Rich text:** Notion uses rich_text arrays, not plain strings — flatten to plain text when pulling, convert back when pushing
- **Pagination:** use `start_cursor` for pages with 100+ items
- **Archived pages:** filter out archived pages on pull

---

## New Service

### `src/application/services/NotionSyncService.ts`

```typescript
class NotionSyncService {
  connect(token: string): Promise<NotionWorkspace>
  getDatabases(): Promise<NotionDatabase[]>
  getDatabaseSchema(databaseId: string): Promise<NotionSchema>
  autoDetectMapping(schema: NotionSchema): PropertyMapping
  saveMapping(projectId: string, mapping: PropertyMapping): void
  getMapping(projectId: string): PropertyMapping | null

  syncProject(projectId: string, databaseId: string): Promise<SyncResult>
  pullChanges(projectId: string): Promise<SyncResult>
  pushTask(task: Task): Promise<void>

  startAutoSync(projectId: string, intervalMs: number): void
  stopAutoSync(projectId: string): void
}

interface PropertyMapping {
  databaseId: string;
  titleProperty: string;
  statusProperty: string;
  priorityProperty: string;
  tagsProperty: string;
  descriptionProperty: string;
  statusMap: Record<string, TaskStatus>;
  priorityMap: Record<string, TaskPriority>;
}
```

---

## Settings Additions

```json
{
  "mksflow.notion.syncInterval": 300,
  "mksflow.notion.autoSync": true
}
```

---

## Extension Changes

### Project Settings — Notion Integration Tab

Step-by-step setup flow in the webview:

**Step 1 — Connect**
- Integration token input (masked) + "Connect" button
- On success: shows workspace name and icon

**Step 2 — Select Database**
- List of accessible databases (from `/search`)
- Search box to filter
- "Select" button per database

**Step 3 — Map Properties**
- Auto-detected mapping shown
- Dropdowns to adjust each field mapping
- Status mapping: Notion values → our 4 statuses
- Priority mapping: Notion values → our 4 priorities
- "Confirm Mapping" button

**Step 4 — Sync**
- "Sync Now" button
- Shows: pulled X tasks, pushed Y tasks
- Last synced timestamp
- Auto-sync toggle

### TaskCard additions (Notion tasks)
- Notion icon badge (N)
- "Open in Notion" link
- Property values shown as-is from Notion (tags, etc.)

---

## New Commands

| Command | ID | Description |
|---|---|---|
| Connect Notion | `mksflow.connectNotion` | Open Notion connection setup |
| Sync Notion Now | `mksflow.syncNotion` | Manual sync trigger |
| Disconnect Notion | `mksflow.disconnectNotion` | Remove Notion connection |

---

## Phase 5 Quality Checklist

- [ ] Phases 1–4 work with no regression
- [ ] Integration token stored only in SecretStorage
- [ ] Test connection shows Notion workspace name
- [ ] Database list loads from Notion correctly
- [ ] Auto-detect mapping works for common property patterns
- [ ] User can manually adjust all property mappings
- [ ] Pull: Notion pages imported as tasks correctly
- [ ] Pull: description blocks fetched and flattened to plain text
- [ ] Push: task created in extension appears in Notion database
- [ ] Push: description written as Notion rich text block
- [ ] Update: status change syncs to Notion correctly
- [ ] Rate limiting handled (no 429 errors on large databases)
- [ ] Pagination handled (databases with 100+ pages)
- [ ] Archived Notion pages filtered out
- [ ] Auto-sync runs on configured interval
- [ ] Manual sync works
- [ ] "Open in Notion" link works
- [ ] Disconnect removes Notion data cleanly
- [ ] Mapping config persists across extension restarts
