import type { Project } from '../../types/messages';

interface ProjectItemProps {
  project: Project;
  active: boolean;
  onSelect: () => void;
  onRequestDelete?: () => void;
}

export function ProjectItem({
  project,
  active,
  onSelect,
  onRequestDelete,
}: ProjectItemProps) {
  return (
    <button
      type="button"
      className={`project-item ${active ? 'project-item--active' : ''}`}
      onClick={onSelect}
      onContextMenu={(event) => {
        if (!onRequestDelete) {
          return;
        }
        event.preventDefault();
        onRequestDelete();
      }}
    >
      <span
        className="project-item__dot"
        style={{ backgroundColor: project.color }}
      />
      <span className="project-item__name">{project.name}</span>
    </button>
  );
}
