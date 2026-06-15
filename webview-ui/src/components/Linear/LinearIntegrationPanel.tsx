import { useState, useEffect } from 'react';
import { Button } from '../shared/Button';
import type { LinearProjectConfig, LinearTeamOption } from '../../types/messages';

interface LinearIntegrationPanelProps {
  projectId: string;
  projectName: string;
  connected: boolean;
  organization: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  projectConfig: LinearProjectConfig | null;
  teams: LinearTeamOption[];
  onConnect: (apiKey: string) => void;
  onDisconnect: () => void;
  onTestConnection: () => void;
  onLoadTeams: () => void;
  onLink: (teamId: string, linearProjectId: string | null) => void;
  onUnlink: () => void;
  onSyncNow: () => void;
  onClose: () => void;
}

export function LinearIntegrationPanel({
  projectId,
  projectName,
  connected,
  organization,
  syncStatus,
  projectConfig,
  teams,
  onConnect,
  onDisconnect,
  onTestConnection,
  onLoadTeams: _onLoadTeams,
  onLink,
  onUnlink,
  onSyncNow,
  onClose,
}: LinearIntegrationPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [teamId, setTeamId] = useState(projectConfig?.linearTeamId ?? '');
  const [linearProjectId, setLinearProjectId] = useState(
    projectConfig?.linearProjectId ?? '',
  );

  useEffect(() => {
    setTeamId(projectConfig?.linearTeamId ?? '');
    setLinearProjectId(projectConfig?.linearProjectId ?? '');
  }, [projectConfig, projectId]);

  const selectedTeam = teams.find((team) => team.id === teamId);
  const linked = Boolean(projectConfig);

  return (
    <div className="linear-panel">
      <div className="linear-panel__header">
        <div>
          <h2>Linear integration</h2>
          <p className="linear-panel__subtitle">
            Sync &quot;{projectName}&quot; with Linear issues (two-way).
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {!connected ? (
        <section className="linear-panel__section">
          <label className="linear-panel__label" htmlFor="linear-api-key">
            Personal API key
          </label>
          <input
            id="linear-api-key"
            className="linear-panel__input"
            type="password"
            placeholder="lin_api_…"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <div className="linear-panel__actions">
            <Button
              onClick={() => {
                if (apiKey.trim()) {
                  onConnect(apiKey.trim());
                }
              }}
            >
              Connect Linear
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="linear-panel__section">
            <p className="linear-panel__status">
              Connected to <strong>{organization ?? 'Linear'}</strong>
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
            <label className="linear-panel__label" htmlFor="linear-team">
              Team
            </label>
            <select
              id="linear-team"
              className="linear-panel__select"
              value={teamId}
              onChange={(event) => {
                setTeamId(event.target.value);
                setLinearProjectId('');
              }}
            >
              <option value="">Select team…</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            <label className="linear-panel__label" htmlFor="linear-project">
              Linear project (optional)
            </label>
            <select
              id="linear-project"
              className="linear-panel__select"
              value={linearProjectId}
              onChange={(event) => setLinearProjectId(event.target.value)}
              disabled={!teamId}
            >
              <option value="">All team issues</option>
              {selectedTeam?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <div className="linear-panel__actions">
              {linked ? (
                <>
                  <Button variant="secondary" onClick={onSyncNow} disabled={syncStatus === 'syncing'}>
                    {syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
                  </Button>
                  <Button variant="ghost" onClick={onUnlink}>
                    Unlink project
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => onLink(teamId, linearProjectId || null)}
                  disabled={!teamId}
                >
                  Link to Linear
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
                Linked to {projectConfig?.linearTeamName}
                {projectConfig?.linearProjectName
                  ? ` / ${projectConfig.linearProjectName}`
                  : ''}
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
