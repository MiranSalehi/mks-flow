import { useState } from 'react';
import { ProjectItem } from './ProjectItem';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import type { Project } from '../../types/messages';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  collapsed: boolean;
  onSelect: (projectId: string) => void;
  onCreate: () => void;
  onDelete: (projectId: string) => void;
}

export function ProjectList({
  projects,
  selectedProjectId,
  collapsed,
  onSelect,
  onCreate,
  onDelete,
}: ProjectListProps) {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  if (collapsed) {
    return (
      <div className="project-list">
        <div className="project-list__header">
          <Button variant="ghost" onClick={onCreate} title="New project">
            +
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="project-list">
        <div className="project-list__header">
          <strong>Projects</strong>
          <Button variant="secondary" onClick={onCreate}>
            New
          </Button>
        </div>
        <div className="project-list__items">
          {projects.length === 0 ? (
            <div className="empty-state">No projects yet</div>
          ) : (
            projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                active={project.id === selectedProjectId}
                onSelect={() => onSelect(project.id)}
                onRequestDelete={() => setProjectToDelete(project)}
              />
            ))
          )}
        </div>
      </div>

      {projectToDelete ? (
        <Modal
          title="Delete project"
          onClose={() => setProjectToDelete(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setProjectToDelete(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onDelete(projectToDelete.id);
                  setProjectToDelete(null);
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p>
            Delete project &quot;{projectToDelete.name}&quot; and all of its tasks?
          </p>
        </Modal>
      ) : null}
    </>
  );
}
