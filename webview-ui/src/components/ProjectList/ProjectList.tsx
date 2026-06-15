import { useState } from 'react';
import { ProjectItem } from './ProjectItem';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import type { Project } from '../../types/messages';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  collapsed: boolean;
  allowManage?: boolean;
  onSelect: (projectId: string) => void;
  onCreate: () => void;
  onDelete: (projectId: string) => void;
}

export function ProjectList({
  projects,
  selectedProjectId,
  collapsed,
  allowManage = true,
  onSelect,
  onCreate,
  onDelete,
}: ProjectListProps) {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  if (collapsed) {
    return (
      <div className="project-list project-list--collapsed">
        {allowManage ? (
          <Button
            variant="ghost"
            className="project-list__add-rail"
            onClick={onCreate}
            title="New project"
            aria-label="New project"
          >
            +
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="project-list">
        <div className="project-list__header">
          <strong>Projects</strong>
          {allowManage ? (
            <Button variant="secondary" onClick={onCreate}>
              New
            </Button>
          ) : null}
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
                onRequestDelete={
                  allowManage ? () => setProjectToDelete(project) : undefined
                }
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
