import type { ProjectMode } from '../types';

/** A task board container with mode-specific storage/sync behavior. */
export interface Project {
  id: string;
  name: string;
  description: string;
  mode: ProjectMode;
  /** Hex color for UI identification, e.g. `#007ACC`. */
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a new project. */
export interface CreateProjectDto {
  name: string;
  description?: string;
  mode?: ProjectMode;
  color?: string;
}

/** Partial update payload for an existing project. */
export interface UpdateProjectDto {
  name?: string;
  description?: string;
  mode?: ProjectMode;
  color?: string;
}
