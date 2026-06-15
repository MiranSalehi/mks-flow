import type { Task, TaskStatus } from '../../types/messages';
import { Badge } from '../shared/Badge';

interface TaskCardPreviewProps {
  task: Task;
  columnStatus?: TaskStatus;
  className?: string;
}

/** Static card chrome for drag overlay and drop previews. */
export function TaskCardPreview({
  task,
  columnStatus,
  className = '',
}: TaskCardPreviewProps) {
  const accentStatus = columnStatus ?? task.status;

  return (
    <article
      className={`task-card kcol-${accentStatus} task-card--preview ${className}`.trim()}
    >
      <span className="task-card__accent" aria-hidden />
      <div className="task-card__top">
        <h4 className="task-card__title">{task.title}</h4>
      </div>
      <div className="task-card__meta">
        <Badge variant={task.priority}>{task.priority}</Badge>
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
