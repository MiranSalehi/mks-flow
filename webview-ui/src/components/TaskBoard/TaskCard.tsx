import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types/messages';
import { formatElapsed } from '../../hooks/useVSCode';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';

interface TaskCardProps {
  task: Task;
  elapsed?: number;
  onOpen: () => void;
  onStart: () => void;
  onReadyForTest: () => void;
  onApprove: () => void;
  onRevertToTodo: () => void;
  onRevertToDoing: () => void;
  onSendToAi: () => void;
  onDelete: () => void;
}

export function TaskCard({
  task,
  elapsed,
  onOpen,
  onStart,
  onReadyForTest,
  onApprove,
  onRevertToTodo,
  onRevertToDoing,
  onSendToAi,
  onDelete,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      disabled: task.status === 'done',
    });

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const primaryAction = getPrimaryAction(task.status, {
    onOpen,
    onStart,
    onReadyForTest,
    onApprove,
  });

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card task-card--${task.status} ${
        isDragging ? 'task-card--dragging' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="task-card__accent" aria-hidden />
      <div className="task-card__top">
        <h4 className="task-card__title" onDoubleClick={onOpen}>
          {task.title}
        </h4>
        <div className="task-card__menu-wrap" ref={menuRef}>
          <Button
            variant="ghost"
            className="task-card__menu-btn"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((value) => !value);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="More actions"
          >
            ⋯
          </Button>
          {menuOpen ? (
            <div
              className="task-card__menu"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={onOpen}>
                Edit
              </button>
              <button type="button" onClick={onSendToAi}>
                Send to AI
              </button>
              <button type="button" className="task-card__menu-danger" onClick={onDelete}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="task-card__meta">
        <Badge variant={task.priority}>{task.priority}</Badge>
        {task.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
        {task.status === 'doing' && elapsed !== undefined ? (
          <span className="chip chip--timer">▶ {formatElapsed(elapsed)}</span>
        ) : null}
        {task.externalUrl ? (
          <a
            className="link-button"
            href={task.externalUrl}
            target="_blank"
            rel="noreferrer"
            onPointerDown={(event) => event.stopPropagation()}
          >
            ↗
          </a>
        ) : null}
      </div>

      <div className="task-card__actions">
        {task.status === 'doing' ? (
          <button
            type="button"
            className="task-card__back"
            onClick={(event) => {
              event.stopPropagation();
              onRevertToTodo();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            ← Todo
          </button>
        ) : null}
        {task.status === 'test' ? (
          <button
            type="button"
            className="task-card__back"
            onClick={(event) => {
              event.stopPropagation();
              onRevertToDoing();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            ← Doing
          </button>
        ) : null}
        <button
          type="button"
          className={`task-card__primary task-card__primary--${task.status}`}
          onClick={(event) => {
            event.stopPropagation();
            primaryAction.onClick();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span>{primaryAction.label}</span>
          <span className="task-card__primary-arrow" aria-hidden>
            →
          </span>
        </button>
      </div>
    </article>
  );
}

function getPrimaryAction(
  status: Task['status'],
  handlers: {
    onOpen: () => void;
    onStart: () => void;
    onReadyForTest: () => void;
    onApprove: () => void;
  },
): { label: string; onClick: () => void } {
  switch (status) {
    case 'todo':
      return { label: 'Start', onClick: handlers.onStart };
    case 'doing':
      return { label: 'Ready for test', onClick: handlers.onReadyForTest };
    case 'test':
      return { label: 'Approve', onClick: handlers.onApprove };
    default:
      return { label: 'View', onClick: handlers.onOpen };
  }
}
