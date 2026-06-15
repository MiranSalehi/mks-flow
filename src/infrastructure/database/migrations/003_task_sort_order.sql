-- Per-column manual task ordering within a project

ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE tasks
SET sort_order = (
  SELECT COUNT(*)
  FROM tasks AS newer
  WHERE newer.project_id = tasks.project_id
    AND newer.status = tasks.status
    AND (
      newer.updated_at > tasks.updated_at
      OR (newer.updated_at = tasks.updated_at AND newer.id < tasks.id)
    )
);
