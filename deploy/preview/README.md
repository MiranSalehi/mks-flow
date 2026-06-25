# MKSFlow preview (shared VPS hosting)

This repository is a **VS Code / Cursor extension** (TypeScript + Webpack) with a **React 18 + Vite** webview UI. Preview hosting serves the **built Kanban webview** in a browser on port **8080** so reviewers can load the UI shell without installing the extension.

The VS Code extension host is not included in this image. Full task data and commands require running the extension in Cursor/VS Code (F5 debug or installed `.vsix`).

## Prerequisites

- Docker with Compose v2
- Node 20+ (only if building outside Docker)

## Local run

```bash
cp .env.preview.example .env.preview
# Edit .env.preview with slot/DB placeholders for your environment.

docker compose -f docker-compose.preview.yml up --build
```

Compose publishes the app as `127.0.0.1:<dynamic>:8080`. Find the mapped port:

```bash
docker compose -f docker-compose.preview.yml ps
```

Open `http://127.0.0.1:<port>/` in a browser.

## Healthcheck

| Path | Expected |
|------|----------|
| `/health` | `200` with body `ok` |

Compose and the image use `curl -f http://localhost:8080/health`.

## Build steps (inside image)

1. `npm ci --prefix webview-ui`
2. `npm run build --prefix webview-ui` → outputs static assets to `dist/webview/`

Extension webpack build (`npm run build:extension`) is **not** part of preview; it is only needed for packaging the VS Code extension.

## Migrations and seeds

| Component | Database | Migrations in preview? |
|-----------|----------|----------------------|
| Extension (local) | SQLite (`better-sqlite3`) | SQL files in `src/infrastructure/database/migrations/` run when the extension starts in the IDE — **not** in this preview container |
| Team cloud API | MySQL (`mksflow-cloud`, separate repo) | **Not** run by this image; `DB_*` env vars are documented for MKSFlow deploy contract and future sync preview |

Do not run migrations against production databases from preview slots.

## Environment variables

See `.env.preview.example`. Required by the MKSFlow preview contract:

- `PREVIEW_URL`, `PREVIEW_SLOT`, `APP_URL`
- `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

This preview server does not connect to MySQL in phase 1; values are injected at deploy for platform consistency.

## Validate compose file

```bash
docker compose -f docker-compose.preview.yml config
```
