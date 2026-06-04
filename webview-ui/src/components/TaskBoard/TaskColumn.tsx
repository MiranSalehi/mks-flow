import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../types/messages';
import { Button } from '../shared/Button';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  elapsedByTaskId: Record<string, number>;
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

const COLUMN_ICONS: Record<TaskStatus, string> = {
  todo: '○',
  doing: '◐',
  test: '◎',
  done: '✓',
};

export function TaskColumn({
  status,
  title,
  tasks,
  elapsedByTaskId,
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
  const columnIcon = COLUMN_ICONS[status];

  return (
    <section
      ref={setNodeRef}
      className={`task-column task-column--${status} ${
        isOver ? 'task-column--over' : ''
      }`}
    >
      <header className="task-column__header">
        <div className="task-column__title-wrap">
          <span className="task-column__accent" aria-hidden />
          <span className="task-column__icon" aria-hidden>
            {columnIcon}
          </span>
          <span className="task-column__title">{title}</span>
          <span className="task-column__count">{tasks.length}</span>
        </div>
        <Button variant="ghost" className="task-column__add" onClick={onAddTask}>
          + Add
        </Button>
      </header>
      <div className="task-column__body">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="task-column__empty">
              <span className="task-column__empty-icon" aria-hidden>
                {columnIcon}
              </span>
              <span>Drop tasks here</span>
            </div>
          ) : (
            tasks.map((task) => (
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
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
