import { useCallback, useEffect, useState } from 'react';
import type { GitFiles, Task, TaskLog, TaskPriority } from '../../types/messages';
import { PRIORITY_LABELS } from '../../types/messages';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import { formatElapsed } from '../../hooks/useVSCode';
import { Button } from '../shared/Button';
import { TaskDescriptionField } from './TaskDescriptionField';

interface TaskDetailProps {
  task: Task;
  logs: TaskLog[];
  gitFiles: GitFiles;
  elapsed?: number;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  onDelete: () => void;
  onSendToAi: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onLoadLogs: () => void;
  onLoadGitFiles: () => void;
  onPickFiles: () => void;
}

export function TaskDetail({
  task,
  logs,
  gitFiles,
  elapsed,
  onClose,
  onSave,
  onDelete,
  onSendToAi,
  onStartTimer,
  onStopTimer,
  onLoadLogs,
  onLoadGitFiles,
  onPickFiles,
}: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [tagsText, setTagsText] = useState(task.tags.join(', '));
  const [relatedFilesText, setRelatedFilesText] = useState(
    task.relatedFiles.join('\n'),
  );
  const [criteriaText, setCriteriaText] = useState(
    task.acceptanceCriteria.join('\n'),
  );

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setTagsText(task.tags.join(', '));
    setRelatedFilesText(task.relatedFiles.join('\n'));
    setCriteriaText(task.acceptanceCriteria.join('\n'));
  }, [
    task.id,
    task.title,
    task.description,
    task.priority,
    task.tags.join(','),
    task.relatedFiles.join('\n'),
    task.acceptanceCriteria.join('\n'),
  ]);

  useEffect(() => {
    onLoadLogs();
  }, [task.id, onLoadLogs]);

  const saveCoreFields = useCallback(() => {
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
    });
  }, [description, onSave, priority, title]);

  useDebouncedSave(`${title}\n${description}`, saveCoreFields, 500);

  const saveAll = () => {
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      tags: splitCsv(tagsText),
      relatedFiles: splitLines(relatedFilesText),
      acceptanceCriteria: splitLines(criteriaText),
    });
  };

  const addGitFiles = (files: string[]) => {
    const merged = [...new Set([...splitLines(relatedFilesText), ...files])];
    setRelatedFilesText(merged.join('\n'));
    onSave({ relatedFiles: merged });
  };

  return (
    <aside className="task-detail">
      <header className="task-detail__header">
        <strong>Task Detail</strong>
        <div className="task-detail__header-actions">
          <Button onClick={onSendToAi}>Send to AI</Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </header>
      <div className="task-detail__body">
        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-description">
            Description
          </label>
          <TaskDescriptionField
            taskId={task.id}
            description={description}
            images={task.descriptionImages ?? []}
            onDescriptionChange={setDescription}
          />
        </div>

        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-priority">
            Priority
          </label>
          <select
            id="task-priority"
            className="input"
            value={priority}
            onChange={(event) => {
              const next = event.target.value as TaskPriority;
              setPriority(next);
              onSave({ priority: next });
            }}
          >
            {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((item) => (
              <option key={item} value={item}>
                {PRIORITY_LABELS[item]}
              </option>
            ))}
          </select>
        </div>

        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-tags">
            Tags
          </label>
          <input
            id="task-tags"
            className="input"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            onBlur={() => onSave({ tags: splitCsv(tagsText) })}
            placeholder="comma,separated,tags"
          />
        </div>

        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-files">
            Related Files
          </label>
          <textarea
            id="task-files"
            className="textarea"
            value={relatedFilesText}
            onChange={(event) => setRelatedFilesText(event.target.value)}
            onBlur={() => onSave({ relatedFiles: splitLines(relatedFilesText) })}
            placeholder="One path per line. Folders end with /"
          />
          <Button variant="secondary" onClick={onPickFiles}>
            Pick files or folders from workspace
          </Button>
        </div>

        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-criteria">
            Acceptance Criteria
          </label>
          <textarea
            id="task-criteria"
            className="textarea"
            value={criteriaText}
            onChange={(event) => setCriteriaText(event.target.value)}
            onBlur={() =>
              onSave({ acceptanceCriteria: splitLines(criteriaText) })
            }
          />
        </div>

        <div className="task-detail__section field-group">
          <span className="field-label">Timer</span>
          <div>
            {elapsed !== undefined
              ? formatElapsed(elapsed)
              : formatElapsed(task.timeTracked)}
            {task.timerStartedAt ? (
              <Button variant="secondary" onClick={onStopTimer}>
                Stop
              </Button>
            ) : (
              <Button variant="secondary" onClick={onStartTimer}>
                Start
              </Button>
            )}
          </div>
        </div>

        <div className="task-detail__section field-group">
          <span className="field-label">Git Changed Files</span>
          <div style={{ marginBottom: 8 }}>
            <Button variant="secondary" onClick={onLoadGitFiles}>
              Refresh git files
            </Button>
          </div>
          <div className="list-editor__items">
            {[...gitFiles.modified, ...gitFiles.added, ...gitFiles.deleted].map(
              (file) => (
                <div key={file} className="list-editor__row">
                  <span>{file}</span>
                  <Button variant="ghost" onClick={() => addGitFiles([file])}>
                    Add
                  </Button>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="task-detail__section field-group">
          <span className="field-label">Timeline</span>
          <div className="timeline">
            {logs.map((log) => (
              <div key={log.id} className="timeline__item">
                <div>{log.message}</div>
                <div>{new Date(log.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={saveAll}>Save all</Button>
          <Button variant="secondary" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </aside>
  );
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}
