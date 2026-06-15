import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../types/messages';
import { COLUMN_SUBTITLES, STATUS_LABELS } from '../../types/messages';
import { Button } from '../shared/Button';
import { ColumnIcon } from './ColumnIcon';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  elapsedByTaskId: Record<string, number>;
  readOnly?: boolean;
  onAddTask: () => void;
  onOpenTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onReadyForTest: (taskId: string) => void;
  onApproveTask: (taskId: string) => void;
  onRevertToTodo: (taskId: string) => void;
  onRevertToDoing: (taskId: string) => void;
  onSendToAi: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskColumn({
  status,
  title,
  tasks,
  elapsedByTaskId,
  readOnly = false,
  onAddTask,
  onOpenTask,
  onStartTask,
  onReadyForTest,
  onApproveTask,
  onRevertToTodo,
  onRevertToDoing,
  onSendToAi,
  onDeleteTask,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const displayTitle = title || STATUS_LABELS[status];

  return (
    <div className="task-board__column-wrap">
      <section
        ref={setNodeRef}
        className={`task-column kcol-${status} ${isOver ? 'task-column--over' : ''}`}
      >
        <div className="task-column__stripe" aria-hidden />

        <div className="task-column__header">
          <span className="task-column__icon-wrap" aria-hidden>
            <ColumnIcon status={status} />
          </span>
          <div className="task-column__heading">
            <div className="task-column__title-row">
              <h2 className="task-column__title">{displayTitle}</h2>
              <span className="task-column__count">{tasks.length}</span>
            </div>
            <p className="task-column__subtitle">{COLUMN_SUBTITLES[status]}</p>
          </div>
          {!readOnly ? (
            <Button
              variant="ghost"
              className="task-column__add"
              onClick={onAddTask}
              title="Add task"
              aria-label="Add task"
            >
              +
            </Button>
          ) : null}
        </div>

        <div className="task-column__divider" aria-hidden />

        <div className="task-column__dropzone">
          <div className="task-column__glow" aria-hidden />
          <div className="task-column__body">
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  elapsed={elapsedByTaskId[task.id]}
                  onOpen={() => onOpenTask(task.id)}
                  onStart={() => onStartTask(task.id)}
                  onReadyForTest={() => onReadyForTest(task.id)}
                  onApprove={() => onApproveTask(task.id)}
                  onRevertToTodo={() => onRevertToTodo(task.id)}
                  onRevertToDoing={() => onRevertToDoing(task.id)}
                  onSendToAi={() => onSendToAi(task.id)}
                  onDelete={() => onDeleteTask(task.id)}
                  allowDelete={!readOnly}
                />
              ))}
            </SortableContext>

            {tasks.length === 0 ? (
              <div className="task-column__empty">
                <svg
                  className="task-column__empty-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="task-column__empty-title">No tasks yet</p>
                <p className="task-column__empty-hint">Drop cards here</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
