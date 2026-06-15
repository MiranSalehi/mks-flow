# Phase 2 — Team Mode
## Cursor Implementation Prompt

---

## Prerequisites

Phase 1 must be fully complete and tested before starting Phase 2.
Read `PROJECT.md` and `PHASE-1.md` before proceeding.

---

## Phase 2 Goal

Add a **Team Mode** alongside Personal Mode.
Personal Mode must continue working exactly as before — untouched.

---

## What Changes in Phase 2

### Two components (may live in separate repos):
1. **Backend API** — implemented in **`mksflow-cloud`** (Laravel 13 + MySQL + Sanctum). Production API: `https://mksflow.com/api/v1`
2. **Extension Team Mode** — this repo connects to that API (see **`PHASE-2-EXTENSION.md`**)

> The original Node.js/Hono/PostgreSQL sketch below is **historical**. Use `mksflow-cloud` as the source of truth for API shapes and business rules.

---

## New Domain Models

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;       // short random code, expires in 7 days
  createdAt: Date;
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

// Task additions for Phase 2:
interface Task {
  // ... all Phase 1 fields remain unchanged
  assignedTo: string | null;     // userId
  teamId: string | null;         // null = personal task
  createdBy: string | null;      // userId
}
```

---

## Backend API

### Tech Stack
- **Runtime:** Node.js 20+
- **Framework:** Hono (lightweight, fast)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access token 15min + refresh token 7 days)
- **Deploy target:** Railway / Render / Fly.io

### Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  password   TEXT NOT NULL,         -- bcrypt hashed
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES users(id),
  invite_code TEXT UNIQUE NOT NULL,
  invite_expires_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Projects (cloud version)
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES users(id),
  color       TEXT DEFAULT '#007ACC',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (cloud version)
CREATE TABLE tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'todo',
  priority            TEXT NOT NULL DEFAULT 'medium',
  tags                JSONB DEFAULT '[]',
  related_files       JSONB DEFAULT '[]',
  acceptance_criteria JSONB DEFAULT '[]',
  assigned_to         UUID REFERENCES users(id),
  created_by          UUID NOT NULL REFERENCES users(id),
  time_tracked        INTEGER DEFAULT 0,
  external_id         TEXT,
  external_provider   TEXT,
  external_url        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Task Logs
CREATE TABLE task_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  from_status TEXT,
  to_status   TEXT NOT NULL,
  message     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

```
# Auth
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login → returns access + refresh tokens
POST   /api/auth/refresh           Refresh access token
POST   /api/auth/logout            Invalidate refresh token
GET    /api/auth/me                Get current user

# Teams
POST   /api/teams                  Create team
GET    /api/teams/:id              Get team details
POST   /api/teams/:id/invite       Regenerate invite code
POST   /api/teams/join             Join team via invite code { inviteCode }
GET    /api/teams/:id/members      List members
DELETE /api/teams/:id/members/:uid Remove member (owner only)

# Projects
GET    /api/projects               Get all projects for current user
POST   /api/projects               Create project
PUT    /api/projects/:id           Update project
DELETE /api/projects/:id           Delete project

# Tasks
GET    /api/tasks?projectId=&assignedTo=&status=    Get tasks (filtered)
POST   /api/tasks                  Create task
PUT    /api/tasks/:id              Update task
PATCH  /api/tasks/:id/status       Update status (role validated)
DELETE /api/tasks/:id              Delete task
GET    /api/tasks/:id/logs         Get task logs
```

### Role Validation Rules (enforced server-side)

```
Test → Done:   only team owner allowed
Update task:   only assigned member or owner
Delete member: only owner
Delete project: only owner
```

---

## Extension Changes

### Mode Toggle
In webview sidebar, show a toggle:
```
● Personal    ○ Team
```

Personal mode uses SQLite (exactly as Phase 1).
Team mode connects to the cloud API.

### Authentication Flow (Team Mode)
1. User clicks "Team Mode"
2. Show Login / Register form in webview
3. On success: store `accessToken` and `refreshToken` in `vscode.SecretStorage`
4. All API calls use `Authorization: Bearer {accessToken}`
5. On 401 response: auto-refresh using refreshToken
6. On refresh failure: prompt re-login
7. Never store tokens in settings or logs

### Sync Strategy
- Team mode data comes from API only (not SQLite)
- Auto-sync every 30 seconds via polling
- Manual "Sync Now" button always visible
- Offline: show last cached data with "⚠ Offline" badge
- Cache stored in extension's globalState (not SQLite)

### Approve Task Permission (Team Mode)
Only team owner sees the "Approve Task" button.
Server also validates this — client restriction is UX only.

---

## New UI Screens

### Login / Register Screen
- Toggle between Login and Register
- Email + Password fields
- Show validation errors inline
- "Forgot password" link (future)

### Team Management Screen
- Team name and invite code (with copy button and expiry countdown)
- "Regenerate invite code" button
- Members list with role badges
- "Remove member" button (owner only)
- "Leave team" button (members only)

### TaskCard additions
- Assigned user avatar / initials badge
- "Approve" button visible only to team owner
- External sync indicator

### TaskBoard additions
- "My Tasks" / "All Tasks" toggle
- Member filter dropdown (owner sees all)
- "Assigned to me" highlighted with subtle border

---

## Docker Setup

Generate:
- `backend/Dockerfile`
- `docker-compose.yml` for local development (API + PostgreSQL)
- `.env.example` with all required environment variables

### Required env vars
```
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
PORT=3000
CORS_ORIGIN=
```

---

## Phase 2 Quality Checklist

- [ ] Personal Mode works exactly as Phase 1 — no regression
- [ ] User can register and login
- [ ] Tokens stored only in SecretStorage
- [ ] Token refresh works automatically
- [ ] User can create a team
- [ ] Owner can generate and share invite code
- [ ] Member can join via invite code
- [ ] Owner can assign tasks to members
- [ ] Member sees only their assigned tasks
- [ ] Member can move tasks: Todo → Doing → Test
- [ ] Member CANNOT approve Test → Done
- [ ] Owner CAN approve Test → Done
- [ ] Server validates all role rules independently
- [ ] Auto-sync every 30 seconds works
- [ ] Offline mode shows cached data with badge
- [ ] Docker setup runs locally with one command
