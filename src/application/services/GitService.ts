import * as vscode from 'vscode';
import type { GitFiles } from '../../domain/types';

const EMPTY_GIT_FILES: GitFiles = {
  modified: [],
  added: [],
  deleted: [],
};

/** Minimal typing for the VS Code built-in Git extension API. */
interface GitChange {
  uri: vscode.Uri;
  status: number;
}

interface GitRepository {
  state: {
    workingTreeChanges: GitChange[];
    indexChanges: GitChange[];
  };
}

interface GitApi {
  repositories: GitRepository[];
}

interface GitExtensionExports {
  getAPI(version: 1): GitApi;
}

/** Git status constants from vscode.git (subset used for classification). */
const GitStatus = {
  INDEX_ADDED: 1,
  MODIFIED: 5,
  DELETED: 6,
  UNTRACKED: 7,
} as const;

/**
 * Read-only git integration using the built-in VS Code Git extension.
 */
export class GitService {
  /**
   * Returns changed files from the first available git repository.
   * Returns empty arrays when git is unavailable.
   */
  async getChangedFiles(): Promise<GitFiles> {
    const gitApi = this.getGitApi();
    if (!gitApi || gitApi.repositories.length === 0) {
      return { ...EMPTY_GIT_FILES };
    }

    const repo = gitApi.repositories[0];
    const changes = [
      ...repo.state.workingTreeChanges,
      ...repo.state.indexChanges,
    ];

    const modified = new Set<string>();
    const added = new Set<string>();
    const deleted = new Set<string>();

    for (const change of changes) {
      const relativePath = vscode.workspace.asRelativePath(change.uri);

      if (
        change.status === GitStatus.UNTRACKED ||
        change.status === GitStatus.INDEX_ADDED
      ) {
        added.add(relativePath);
        continue;
      }

      if (change.status === GitStatus.DELETED) {
        deleted.add(relativePath);
        continue;
      }

      modified.add(relativePath);
    }

    return {
      modified: [...modified].sort(),
      added: [...added].sort(),
      deleted: [...deleted].sort(),
    };
  }

  private getGitApi(): GitApi | undefined {
    const extension = vscode.extensions.getExtension<GitExtensionExports>(
      'vscode.git',
    );

    if (!extension) {
      return undefined;
    }

    if (!extension.isActive) {
      return undefined;
    }

    try {
      return extension.exports.getAPI(1);
    } catch {
      return undefined;
    }
  }
}
