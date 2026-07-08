import { useCallback, useEffect, useRef, useState } from 'react';
import type { GitFiles, Task, TaskLog, TaskPriority } from '../../types/messages';
import { PRIORITY_LABELS } from '../../types/messages';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import { formatElapsed } from '../../hooks/useVSCode';
import { Button } from '../shared/Button';
import { TaskDescriptionField, type TaskDescriptionFieldHandle } from './TaskDescriptionField';
import { CloudTaskPanel } from '../Cloud/CloudTaskPanel';

interface TaskDetailProps {
  task: Task;
  logs: TaskLog[];
  gitFiles: GitFiles;
  elapsed?: number;
  isCloud?: boolean;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  onDelete: () => void;
  onSendToAi: () => void;
  onOpenInCloud?: () => void;
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
  isCloud = false,
  onClose,
  onSave,
  onDelete,
  onSendToAi,
  onOpenInCloud,
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
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionFieldRef = useRef<TaskDescriptionFieldHandle>(null);
  const isLocked = isCloud && task.status === 'done';

  const clearSaveState = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setIsSaving(false);
  }, []);

  const beginSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      setIsSaving(false);
    }, 15000);
  }, []);

  // Only reset the form when switching tasks — not on every TASKS_UPDATED echo,
  // which would overwrite in-progress typing (especially trailing spaces).
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setTagsText(task.tags.join(', '));
    setRelatedFilesText(task.relatedFiles.join('\n'));
    setCriteriaText(task.acceptanceCriteria.join('\n'));
  }, [task.id]);

  useEffect(() => {
    onLoadLogs();
  }, [task.id, onLoadLogs]);

  useEffect(() => {
    clearSaveState();
  }, [clearSaveState, task.id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data as {
        type?: string;
        tasks?: Task[];
      };

      if (message.type === 'TASKS_UPDATED') {
        const updated = message.tasks?.some((item) => item.id === task.id);
        if (updated) {
          clearSaveState();
        }
        return;
      }

      if (message.type === 'ERROR') {
        clearSaveState();
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [clearSaveState, task.id]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    },
    [],
  );

  const saveCoreFields = useCallback(() => {
    const currentDescription =
      descriptionFieldRef.current?.getDescription() ?? description;

    onSave({
      title,
      description: currentDescription,
      priority,
    });
  }, [description, onSave, priority, title]);

  useDebouncedSave(
    isLocked ? '' : `${title}\n${description}`,
    saveCoreFields,
    500,
  );

  const saveAll = () => {
    const currentDescription =
      descriptionFieldRef.current?.getDescription() ?? description;

    setDescription(currentDescription);
    beginSave();
    onSave({
      title: title.trim(),
      description: currentDescription.trim(),
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
          {!isLocked ? <Button onClick={onSendToAi}>Send to AI</Button> : null}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </header>
      {isCloud && onOpenInCloud ? (
        <CloudTaskPanel
          pullRequestUrl={task.pullRequestUrl}
          agentWorkflowStatus={task.agentWorkflowStatus}
          currentIteration={task.currentIteration}
          onOpenInCloud={onOpenInCloud}
        />
      ) : null}
      <div className="task-detail__body">
        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            className="input"
            value={title}
            disabled={isLocked}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              if (isLocked) {
                return;
              }
              const trimmed = title.trim();
              if (trimmed !== title) {
                setTitle(trimmed);
              }
              onSave({ title: trimmed });
            }}
          />
        </div>

        <div className="task-detail__section field-group">
          <TaskDescriptionField
            ref={descriptionFieldRef}
            taskId={task.id}
            description={description}
            images={task.descriptionImages ?? []}
            mediaUploadEnabled={!isLocked}
            mediaRemoveEnabled={!isLocked}
            readOnly={isLocked}
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
            disabled={isLocked}
            onChange={(event) => {
              if (isLocked) {
                return;
              }
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
            disabled={isLocked}
            onChange={(event) => setTagsText(event.target.value)}
            onBlur={() => {
              if (!isLocked) {
                onSave({ tags: splitCsv(tagsText) });
              }
            }}
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
            disabled={isLocked}
            onChange={(event) => setRelatedFilesText(event.target.value)}
            onBlur={() => {
              if (!isLocked) {
                onSave({ relatedFiles: splitLines(relatedFilesText) });
              }
            }}
            placeholder="One path per line. Folders end with /"
          />
          {!isLocked ? (
            <Button variant="secondary" onClick={onPickFiles}>
              Pick files or folders from workspace
            </Button>
          ) : null}
        </div>

        <div className="task-detail__section field-group">
          <label className="field-label" htmlFor="task-criteria">
            Acceptance Criteria
          </label>
          <textarea
            id="task-criteria"
            className="textarea"
            value={criteriaText}
            disabled={isLocked}
            onChange={(event) => setCriteriaText(event.target.value)}
            onBlur={() => {
              if (!isLocked) {
                onSave({ acceptanceCriteria: splitLines(criteriaText) });
              }
            }}
          />
        </div>

        {!isCloud ? (
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
        ) : null}

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
          <details className="collapsible-panel">
            <summary className="collapsible-panel__summary">
              <span className="collapsible-panel__summary-text">
                <span className="field-label">Timeline</span>
                {logs.length > 0 ? (
                  <span className="collapsible-panel__meta">
                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                  </span>
                ) : null}
              </span>
              <span className="collapsible-panel__chevron" aria-hidden>
                ›
              </span>
            </summary>
            <div className="collapsible-panel__body">
              {logs.length === 0 ? (
                <p className="collapsible-panel__empty">No activity yet.</p>
              ) : (
                <div className="timeline">
                  {logs.map((log) => (
                    <div key={log.id} className="timeline__item">
                      <div>{log.message}</div>
                      <div>{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      <footer className="task-detail__footer">
        {!isLocked ? (
          <Button onClick={saveAll} loading={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        ) : null}
        {!isCloud ? (
          <Button variant="secondary" onClick={onDelete} disabled={isSaving}>
            Delete
          </Button>
        ) : null}
      </footer>
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
