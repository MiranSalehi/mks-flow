import { useEffect, useState } from 'react';
import { Button } from '../shared/Button';
import type {
  GitHubProject,
  GitHubProjectConfig,
  GitHubRepo,
  GitHubSyncMode,
} from '../../types/messages';

interface GitHubIntegrationPanelProps {
  projectId: string;
  projectName: string;
  connected: boolean;
  username: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  projectConfig: GitHubProjectConfig | null;
  repos: GitHubRepo[];
  ghProjects: GitHubProject[];
  onConnect: (token: string) => void;
  onDisconnect: () => void;
  onTestConnection: () => void;
  onLink: (payload: {
    repoFullName: string;
    owner: string;
    repo: string;
    syncModes: GitHubSyncMode[];
    ghProjectId: string | null;
  }) => void;
  onUnlink: () => void;
  onSyncNow: () => void;
  onClose: () => void;
}

export function GitHubIntegrationPanel({
  projectName,
  connected,
  username,
  syncStatus,
  projectConfig,
  repos,
  ghProjects,
  onConnect,
  onDisconnect,
  onTestConnection,
  onLink,
  onUnlink,
  onSyncNow,
  onClose,
}: GitHubIntegrationPanelProps) {
  const [token, setToken] = useState('');
  const [repoFullName, setRepoFullName] = useState(projectConfig?.repoFullName ?? '');
  const [syncIssues, setSyncIssues] = useState(
    projectConfig?.syncModes.includes('issues') ?? true,
  );
  const [syncPrs, setSyncPrs] = useState(
    projectConfig?.syncModes.includes('prs') ?? false,
  );
  const [syncBoard, setSyncBoard] = useState(
    projectConfig?.syncModes.includes('board') ?? false,
  );
  const [ghProjectId, setGhProjectId] = useState(projectConfig?.ghProjectId ?? '');

  useEffect(() => {
    setRepoFullName(projectConfig?.repoFullName ?? '');
    setSyncIssues(projectConfig?.syncModes.includes('issues') ?? true);
    setSyncPrs(projectConfig?.syncModes.includes('prs') ?? false);
    setSyncBoard(projectConfig?.syncModes.includes('board') ?? false);
    setGhProjectId(projectConfig?.ghProjectId ?? '');
  }, [projectConfig]);

  const linked = Boolean(projectConfig);
  const selectedRepo = repos.find((repo) => repo.fullName === repoFullName);

  const buildSyncModes = (): GitHubSyncMode[] => {
    const modes: GitHubSyncMode[] = [];
    if (syncIssues) {
      modes.push('issues');
    }
    if (syncPrs) {
      modes.push('prs');
    }
    if (syncBoard) {
      modes.push('board');
    }
    return modes.length > 0 ? modes : ['issues'];
  };

  return (
    <div className="linear-panel">
      <div className="linear-panel__header">
        <div>
          <h2>GitHub integration</h2>
          <p className="linear-panel__subtitle">
            Sync &quot;{projectName}&quot; with GitHub issues, PRs, or Projects v2.
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {!connected ? (
        <section className="linear-panel__section">
          <label className="linear-panel__label" htmlFor="github-token">
            Personal access token
          </label>
          <input
            id="github-token"
            className="linear-panel__input"
            type="password"
            placeholder="ghp_…"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <p className="linear-panel__meta">
            Scopes: repo, project, read:user
          </p>
          <div className="linear-panel__actions">
            <Button
              onClick={() => {
                if (token.trim()) {
                  onConnect(token.trim());
                }
              }}
            >
              Connect GitHub
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="linear-panel__section">
            <p className="linear-panel__status">
              Connected as <strong>@{username}</strong>
            </p>
            <div className="linear-panel__actions">
              <Button variant="secondary" onClick={onTestConnection}>
                Test connection
              </Button>
              <Button variant="ghost" onClick={onDisconnect}>
                Disconnect
              </Button>
            </div>
          </section>

          <section className="linear-panel__section">
            <label className="linear-panel__label" htmlFor="github-repo">
              Repository
            </label>
            <select
              id="github-repo"
              className="linear-panel__select"
              value={repoFullName}
              onChange={(event) => setRepoFullName(event.target.value)}
            >
              <option value="">Select repository…</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.fullName}>
                  {repo.fullName}
                </option>
              ))}
            </select>

            <fieldset className="github-sync-modes">
              <legend className="linear-panel__label">Sync</legend>
              <label>
                <input
                  type="checkbox"
                  checked={syncIssues}
                  onChange={(event) => setSyncIssues(event.target.checked)}
                />{' '}
                Issues (two-way)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={syncPrs}
                  onChange={(event) => setSyncPrs(event.target.checked)}
                />{' '}
                Pull requests (read-only)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={syncBoard}
                  onChange={(event) => setSyncBoard(event.target.checked)}
                />{' '}
                Project board (status columns)
              </label>
            </fieldset>

            {syncBoard ? (
              <>
                <label className="linear-panel__label" htmlFor="github-project">
                  GitHub Project (v2)
                </label>
                <select
                  id="github-project"
                  className="linear-panel__select"
                  value={ghProjectId}
                  onChange={(event) => setGhProjectId(event.target.value)}
                >
                  <option value="">Select project…</option>
                  {ghProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <div className="linear-panel__actions">
              {linked ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={onSyncNow}
                    disabled={syncStatus === 'syncing'}
                  >
                    {syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
                  </Button>
                  <Button variant="ghost" onClick={onUnlink}>
                    Unlink project
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    if (!selectedRepo) {
                      return;
                    }
                    onLink({
                      repoFullName: selectedRepo.fullName,
                      owner: selectedRepo.owner,
                      repo: selectedRepo.name,
                      syncModes: buildSyncModes(),
                      ghProjectId: ghProjectId || null,
                    });
                  }}
                  disabled={!selectedRepo}
                >
                  Link to GitHub
                </Button>
              )}
            </div>

            {projectConfig?.lastSyncAt ? (
              <p className="linear-panel__meta">
                Last synced: {new Date(projectConfig.lastSyncAt).toLocaleString()}
              </p>
            ) : null}
            {linked ? (
              <p className="linear-panel__meta">
                Linked to {projectConfig?.repoFullName}
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
