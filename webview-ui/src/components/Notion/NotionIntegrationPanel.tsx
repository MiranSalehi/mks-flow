import { useEffect, useMemo, useState } from 'react';
import { Button } from '../shared/Button';
import type {
  NotionDatabase,
  NotionProjectConfig,
  NotionPropertyMapping,
  TaskPriority,
  TaskStatus,
} from '../../types/messages';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../types/messages';

interface NotionIntegrationPanelProps {
  projectId: string;
  projectName: string;
  connected: boolean;
  workspaceName: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  projectConfig: NotionProjectConfig | null;
  databases: NotionDatabase[];
  mapping: NotionPropertyMapping | null;
  onConnect: (token: string) => void;
  onDisconnect: () => void;
  onTestConnection: () => void;
  onLoadDatabases: () => void;
  onLoadSchema: (databaseId: string) => void;
  onLink: (payload: {
    databaseId: string;
    statusMap: Record<string, TaskStatus>;
    priorityMap: Record<string, TaskPriority>;
  }) => void;
  onUnlink: () => void;
  onSyncNow: () => void;
  onClose: () => void;
}

const STATUSES: TaskStatus[] = ['todo', 'doing', 'test', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

export function NotionIntegrationPanel({
  projectName,
  connected,
  workspaceName,
  syncStatus,
  projectConfig,
  databases,
  mapping,
  onConnect,
  onDisconnect,
  onTestConnection,
  onLoadDatabases,
  onLoadSchema,
  onLink,
  onUnlink,
  onSyncNow,
  onClose,
}: NotionIntegrationPanelProps) {
  const [token, setToken] = useState('');
  const [databaseSearch, setDatabaseSearch] = useState('');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState(
    projectConfig?.databaseId ?? '',
  );
  const [statusMap, setStatusMap] = useState<Record<string, TaskStatus>>({});
  const [priorityMap, setPriorityMap] = useState<Record<string, TaskPriority>>(
    {},
  );

  useEffect(() => {
    if (connected) {
      onLoadDatabases();
    }
  }, [connected, onLoadDatabases]);

  useEffect(() => {
    setSelectedDatabaseId(projectConfig?.databaseId ?? '');
  }, [projectConfig]);

  useEffect(() => {
    if (mapping) {
      setStatusMap(mapping.statusMap);
      setPriorityMap(mapping.priorityMap);
    }
  }, [mapping]);

  const linked = Boolean(projectConfig);
  const filteredDatabases = useMemo(() => {
    const query = databaseSearch.trim().toLowerCase();
    if (!query) {
      return databases;
    }
    return databases.filter((db) => db.title.toLowerCase().includes(query));
  }, [databaseSearch, databases]);

  const selectedDatabase = databases.find((db) => db.id === selectedDatabaseId);

  return (
    <div className="linear-panel">
      <div className="linear-panel__header">
        <div>
          <h2>Notion integration</h2>
          <p className="linear-panel__subtitle">
            Sync &quot;{projectName}&quot; with a Notion database.
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {!connected ? (
        <section className="linear-panel__section">
          <label className="linear-panel__label" htmlFor="notion-token">
            Internal integration token
          </label>
          <input
            id="notion-token"
            className="linear-panel__input"
            type="password"
            placeholder="secret_…"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <p className="linear-panel__meta">
            Create an integration at notion.so/my-integrations and share a
            database with it.
          </p>
          <div className="linear-panel__actions">
            <Button
              onClick={() => {
                if (token.trim()) {
                  onConnect(token.trim());
                }
              }}
            >
              Connect Notion
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="linear-panel__section">
            <p className="linear-panel__status">
              Connected as <strong>{workspaceName ?? 'Notion workspace'}</strong>
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

          {linked ? (
            <section className="linear-panel__section">
              <p className="linear-panel__status">
                Linked to <strong>{projectConfig?.databaseTitle}</strong>
                {projectConfig?.lastSyncAt ? (
                  <>
                    {' '}
                    · last synced{' '}
                    {new Date(projectConfig.lastSyncAt).toLocaleString()}
                  </>
                ) : null}
              </p>
              <div className="linear-panel__actions">
                <Button
                  onClick={onSyncNow}
                  disabled={syncStatus === 'syncing'}
                >
                  {syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
                </Button>
                <Button variant="ghost" onClick={onUnlink}>
                  Unlink database
                </Button>
              </div>
            </section>
          ) : (
            <>
              <section className="linear-panel__section">
                <label className="linear-panel__label" htmlFor="notion-db-search">
                  Database
                </label>
                <input
                  id="notion-db-search"
                  className="linear-panel__input"
                  placeholder="Search databases…"
                  value={databaseSearch}
                  onChange={(event) => setDatabaseSearch(event.target.value)}
                />
                <select
                  className="linear-panel__input"
                  value={selectedDatabaseId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setSelectedDatabaseId(id);
                    if (id) {
                      onLoadSchema(id);
                    }
                  }}
                >
                  <option value="">Select a database…</option>
                  {filteredDatabases.map((db) => (
                    <option key={db.id} value={db.id}>
                      {db.icon ? `${db.icon} ` : ''}
                      {db.title}
                    </option>
                  ))}
                </select>
              </section>

              {mapping && selectedDatabase ? (
                <section className="linear-panel__section">
                  <h3 className="linear-panel__label">Property mapping</h3>
                  <p className="linear-panel__meta">
                    Title → {mapping.titleProperty}
                    {mapping.statusProperty
                      ? ` · Status → ${mapping.statusProperty}`
                      : ''}
                    {mapping.priorityProperty
                      ? ` · Priority → ${mapping.priorityProperty}`
                      : ''}
                  </p>

                  {mapping.statusOptions.length > 0 ? (
                    <div className="linear-panel__mapping">
                      <h4>Status mapping</h4>
                      {mapping.statusOptions.map((option) => (
                        <label key={option} className="linear-panel__map-row">
                          <span>{option}</span>
                          <select
                            value={statusMap[option] ?? 'todo'}
                            onChange={(event) =>
                              setStatusMap((current) => ({
                                ...current,
                                [option]: event.target.value as TaskStatus,
                              }))
                            }
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {mapping.priorityOptions.length > 0 ? (
                    <div className="linear-panel__mapping">
                      <h4>Priority mapping</h4>
                      {mapping.priorityOptions.map((option) => (
                        <label key={option} className="linear-panel__map-row">
                          <span>{option}</span>
                          <select
                            value={priorityMap[option] ?? 'medium'}
                            onChange={(event) =>
                              setPriorityMap((current) => ({
                                ...current,
                                [option]: event.target.value as TaskPriority,
                              }))
                            }
                          >
                            {PRIORITIES.map((priority) => (
                              <option key={priority} value={priority}>
                                {PRIORITY_LABELS[priority]}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  <div className="linear-panel__actions">
                    <Button
                      onClick={() =>
                        onLink({
                          databaseId: selectedDatabase.id,
                          statusMap,
                          priorityMap,
                        })
                      }
                    >
                      Link & sync
                    </Button>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
