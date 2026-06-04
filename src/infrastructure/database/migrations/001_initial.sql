-- Initial schema — applied by DatabaseManager in Step 3

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  mode        TEXT NOT NULL DEFAULT 'personal',
  color       TEXT NOT NULL DEFAULT '#007ACC',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'todo',
  priority            TEXT NOT NULL DEFAULT 'medium',
  tags                TEXT DEFAULT '[]',
  related_files       TEXT DEFAULT '[]',
  acceptance_criteria TEXT DEFAULT '[]',
  time_tracked        INTEGER DEFAULT 0,
  timer_started_at    TEXT DEFAULT NULL,
  external_id         TEXT DEFAULT NULL,
  external_provider   TEXT DEFAULT NULL,
  external_url        TEXT DEFAULT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_logs (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  message     TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
