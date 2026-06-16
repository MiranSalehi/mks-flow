import { useEffect, useMemo, useState } from 'react';
import { Button } from '../shared/Button';
import {
  STATUSES,
  type LinearProjectConfig,
  type LinearTeamOption,
  type TaskStatus,
} from '../../types/messages';

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
  onLink: (
    teamId: string,
    linearProjectId: string | null,
    stateToStatus: Record<string, TaskStatus>,
  ) => void;
  onUnlink: () => void;
  onSyncNow: () => void;
  onClose: () => void;
}

function buildDefaultMappings(
  team: LinearTeamOption | undefined,
): Record<string, TaskStatus> {
  if (!team) {
    return {};
  }

  return Object.fromEntries(
    team.states.map((state) => [
      state.id,
      state.mappedStatus ?? 'todo',
    ]),
  ) as Record<string, TaskStatus>;
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
  onLoadTeams,
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
  const [stateMappings, setStateMappings] = useState<
    Record<string, TaskStatus>
  >({});

  const selectedTeam = teams.find((team) => team.id === teamId);
  const linked = Boolean(projectConfig);

  useEffect(() => {
    setTeamId(projectConfig?.linearTeamId ?? '');
    setLinearProjectId(projectConfig?.linearProjectId ?? '');
  }, [projectConfig, projectId]);

  useEffect(() => {
    if (linked && projectConfig?.stateToStatus) {
      setStateMappings(projectConfig.stateToStatus);
      return;
    }

    setStateMappings(buildDefaultMappings(selectedTeam));
  }, [linked, projectConfig?.stateToStatus, selectedTeam, teamId]);

  const mappingRows = useMemo(() => {
    if (linked && projectConfig?.stateToStatus) {
      const team = teams.find((item) => item.id === projectConfig.linearTeamId);
      return Object.entries(projectConfig.stateToStatus).map(
        ([stateId, status]) => ({
          stateId,
          stateName:
            team?.states.find((state) => state.id === stateId)?.name ?? stateId,
          status,
        }),
      );
    }

    return (selectedTeam?.states ?? []).map((state) => ({
      stateId: state.id,
      stateName: state.name,
      status: stateMappings[state.id] ?? state.mappedStatus ?? 'todo',
    }));
  }, [linked, projectConfig, selectedTeam, stateMappings, teams]);

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
          <p className="linear-panel__meta">
            Create a key at linear.app → Settings → API.
          </p>
          <div className="linear-panel__actions">
            <Button
              onClick={() => {
                if (apiKey.trim()) {
                  onConnect(apiKey.trim());
                  setApiKey('');
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
              <Button variant="secondary" onClick={onLoadTeams}>
                Refresh teams
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
              disabled={linked}
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
              disabled={!teamId || linked}
              onChange={(event) => setLinearProjectId(event.target.value)}
            >
              <option value="">All team issues</option>
              {selectedTeam?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {mappingRows.length > 0 ? (
              <div className="linear-panel__mapping">
                <h4>Status mapping</h4>
                <p className="linear-panel__meta">
                  Map each Linear workflow state to a board column. Adjust if
                  your team uses custom state names.
                </p>
                {mappingRows.map((row) => (
                  <label
                    key={row.stateId}
                    className="linear-panel__map-row"
                    htmlFor={`linear-state-${row.stateId}`}
                  >
                    <span>{row.stateName}</span>
                    <select
                      id={`linear-state-${row.stateId}`}
                      className="linear-panel__select"
                      value={row.status}
                      disabled={linked}
                      onChange={(event) =>
                        setStateMappings((current) => ({
                          ...current,
                          [row.stateId]: event.target.value as TaskStatus,
                        }))
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
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
                  onClick={() =>
                    onLink(teamId, linearProjectId || null, stateMappings)
                  }
                  disabled={!teamId || mappingRows.length === 0}
                >
                  Link to Linear
                </Button>
              )}
            </div>

            {projectConfig?.lastSyncAt ? (
              <p className="linear-panel__meta">
                Last synced:{' '}
                {new Date(projectConfig.lastSyncAt).toLocaleString()}
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
