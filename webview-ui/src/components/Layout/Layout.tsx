import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { useBoardShortcuts } from '../../hooks/useBoardShortcuts';
import type { BoardMode, TaskStatus, Task } from '../../types/messages';
import { STATUS_LABELS } from '../../types/messages';
import { GitHubIntegrationPanel } from '../GitHub/GitHubIntegrationPanel';
import { NotionIntegrationPanel } from '../Notion/NotionIntegrationPanel';
import { LinearIntegrationPanel } from '../Linear/LinearIntegrationPanel';
import { CloudLoginPanel } from '../Cloud/CloudLoginPanel';
import { TeamModeBar } from '../Cloud/TeamModeBar';
import { BoardModeLoadingOverlay } from './BoardModeLoadingOverlay';
import { AIPromptModal, LegacyAIPromptModal } from '../TaskDetail/AIPromptModal';
import { TaskDetail } from '../TaskDetail/TaskDetail';
import { ProjectList } from '../ProjectList/ProjectList';
import { SearchFilter } from '../SearchFilter/SearchFilter';
import { TaskBoard } from '../TaskBoard/TaskBoard';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { BrandHeader } from './BrandHeader';
import { Sidebar } from './Sidebar';

const PROJECT_COLOR_VARS = [
  'var(--vscode-charts-blue)',
  'var(--vscode-charts-orange)',
  'var(--vscode-charts-green)',
  'var(--vscode-charts-red)',
  'var(--vscode-charts-purple)',
  'var(--vscode-textLink-foreground)',
];

export function Layout() {
  const {
    postMessage,
    projects,
    tasks,
    allTasks,
    selectedProjectId,
    selectedTaskId,
    sidebarCollapsed,
    searchQuery,
    filters,
    gitFiles,
    taskLogs,
    elapsedByTaskId,
    aiPrompt,
    aiContext,
    error,
    setSelectedProjectId,
    setSelectedTaskId,
    toggleSidebar,
    setSearchQuery,
    setPriorityFilter,
    setTagFilter,
    clearFilters,
    setAiPrompt,
    setAiContext,
    setError,
    boardMode,
    cloudAuthenticated,
    cloudUser,
    cloudLastSyncAt,
    syncStatus,
    syncMessage,
    boardModeSwitching,
    beginBoardModeSwitch,
    linearConnected,
    linearOrganization,
    linearSyncStatus,
    linearProjectConfigs,
    linearTeams,
    linearPanelOpen,
    setLinearPanelOpen,
    githubConnected,
    githubUsername,
    githubSyncStatus,
    githubRepos,
    githubProjects,
    githubProjectConfigs,
    githubPanelOpen,
    setGitHubPanelOpen,
    notionConnected,
    notionWorkspaceName,
    notionSyncStatus,
    notionDatabases,
    notionPropertyMapping,
    notionProjectConfigs,
    notionPanelOpen,
    setNotionPanelOpen,
  } = useAppData();

  const isTeamMode = boardMode === 'team';
  const showCloudLogin = isTeamMode && !cloudAuthenticated;

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const selectedTask = useMemo(
    () => allTasks.find((task) => task.id === selectedTaskId),
    [allTasks, selectedTaskId],
  );

  const handleSetBoardMode = useCallback(
    (mode: BoardMode) => {
      if (mode === boardMode || boardModeSwitching) {
        return;
      }

      beginBoardModeSwitch(mode);
      postMessage({ type: 'SET_BOARD_MODE', mode });
    },
    [beginBoardModeSwitch, boardMode, boardModeSwitching, postMessage],
  );

  const handleTaskSave = useCallback(
    (data: Partial<Task>) => {
      if (!selectedTaskId) {
        return;
      }
      postMessage({
        type: 'UPDATE_TASK',
        taskId: selectedTaskId,
        data,
      });
    },
    [postMessage, selectedTaskId],
  );

  const handleLoadTaskLogs = useCallback(() => {
    if (!selectedTaskId) {
      return;
    }
    postMessage({ type: 'GET_TASK_LOGS', taskId: selectedTaskId });
  }, [postMessage, selectedTaskId]);

  const handleLoadGitFiles = useCallback(() => {
    postMessage({ type: 'GET_GIT_FILES' });
  }, [postMessage]);

  const availableTags = useMemo(() => {
    if (!selectedProjectId) {
      return [];
    }
    const tags = allTasks
      .filter((task) => task.projectId === selectedProjectId)
      .flatMap((task) => task.tags);
    return [...new Set(tags)].sort();
  }, [allTasks, selectedProjectId]);

  const createProject = () => {
    const name = newProjectName.trim();
    if (!name) {
      return;
    }
    postMessage({
      type: 'CREATE_PROJECT',
      name,
      description: '',
      color: PROJECT_COLOR_VARS[projects.length % PROJECT_COLOR_VARS.length],
    });
    setNewProjectName('');
    setNewProjectOpen(false);
  };

  const addTask = (status: TaskStatus) => {
    if (!selectedProjectId) {
      return;
    }
    setNewTaskTitle('');
    setNewTaskStatus(status);
  };

  useBoardShortcuts({
    selectedProjectId,
    selectedTaskId,
    onFocusSearch: () => searchInputRef.current?.focus(),
    onNewTask: () => addTask('todo'),
    onCloseDetail: () => setSelectedTaskId(null),
  });

  useEffect(() => {
    if (linearPanelOpen && selectedProjectId && !isTeamMode) {
      postMessage({
        type: 'LINEAR_GET_PROJECT_CONFIG',
        projectId: selectedProjectId,
      });
      if (linearConnected) {
        postMessage({ type: 'LINEAR_GET_TEAMS' });
      }
    }
  }, [
    linearPanelOpen,
    selectedProjectId,
    isTeamMode,
    linearConnected,
    postMessage,
  ]);

  useEffect(() => {
    if (githubPanelOpen && selectedProjectId && !isTeamMode) {
      postMessage({
        type: 'GITHUB_GET_PROJECT_CONFIG',
        projectId: selectedProjectId,
      });
      if (githubConnected) {
        postMessage({ type: 'GITHUB_GET_REPOS' });
        postMessage({ type: 'GITHUB_GET_PROJECTS' });
      }
    }
  }, [
    githubPanelOpen,
    selectedProjectId,
    isTeamMode,
    githubConnected,
    postMessage,
  ]);

  useEffect(() => {
    if (notionPanelOpen && selectedProjectId && !isTeamMode) {
      postMessage({
        type: 'NOTION_GET_PROJECT_CONFIG',
        projectId: selectedProjectId,
      });
      if (notionConnected) {
        postMessage({ type: 'NOTION_GET_DATABASES' });
      }
    }
  }, [
    notionPanelOpen,
    selectedProjectId,
    isTeamMode,
    notionConnected,
    postMessage,
  ]);

  const createTask = () => {
    if (!selectedProjectId || !newTaskStatus) {
      return;
    }

    const title = newTaskTitle.trim();
    if (!title) {
      return;
    }

    postMessage({
      type: 'CREATE_TASK',
      projectId: selectedProjectId,
      task: { title, status: newTaskStatus },
    });
    setNewTaskTitle('');
    setNewTaskStatus(null);
  };

  return (
    <div className="layout">
      <aside
        className={`layout__sidebar ${
          sidebarCollapsed ? 'layout__sidebar--collapsed' : ''
        }`}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <BrandHeader collapsed={sidebarCollapsed} />
        <ProjectList
          projects={projects}
          selectedProjectId={selectedProjectId}
          collapsed={sidebarCollapsed}
          allowManage={!isTeamMode}
          onSelect={setSelectedProjectId}
          onCreate={() => setNewProjectOpen(true)}
          onDelete={(projectId) =>
            postMessage({ type: 'DELETE_PROJECT', projectId })
          }
        />
      </aside>

      <main className="layout__main">
        {error ? (
          <div className="error-banner">
            {error}
            <Button variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        ) : null}

        <TeamModeBar
          boardMode={boardMode}
          boardModeSwitching={boardModeSwitching}
          cloudAuthenticated={cloudAuthenticated}
          cloudUser={cloudUser}
          cloudLastSyncAt={cloudLastSyncAt}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          onSetMode={handleSetBoardMode}
          onSyncNow={() => postMessage({ type: 'CLOUD_SYNC_NOW' })}
          onLogout={() => postMessage({ type: 'CLOUD_LOGOUT' })}
          onOpenWebApp={() => postMessage({ type: 'OPEN_CLOUD_WEB_APP' })}
        />

        <header className="layout__header layout__header--sticky">
          <Button variant="ghost" onClick={toggleSidebar}>
            {sidebarCollapsed ? '»' : '«'}
          </Button>
          <div className="layout__header-brand">
            {selectedProject ? (
              <h1 className="layout__title layout__title--large">{selectedProject.name}</h1>
            ) : (
              <h1 className="layout__title layout__title--large">MKSFlow Board</h1>
            )}
          </div>
          <SearchFilter
            ref={searchInputRef}
            query={searchQuery}
            activePriorities={filters.priorities ?? []}
            availableTags={availableTags}
            activeTags={filters.tags ?? []}
            onQueryChange={setSearchQuery}
            onSetPriority={setPriorityFilter}
            onSetTag={setTagFilter}
            onClear={clearFilters}
          />
          {selectedProjectId && !isTeamMode ? (
            <div className="layout__header-actions">
              <Button
                variant="secondary"
                onClick={() => setNotionPanelOpen(true)}
              >
                Notion
              </Button>
              <Button
                variant="secondary"
                onClick={() => setGitHubPanelOpen(true)}
              >
                GitHub
              </Button>
              <Button
                variant="secondary"
                onClick={() => setLinearPanelOpen(true)}
              >
                Linear
              </Button>
              <Button
                className="layout__export-btn"
                onClick={() =>
                  postMessage({
                    type: 'EXPORT_PROJECT',
                    projectId: selectedProjectId,
                  })
                }
              >
                Export
              </Button>
            </div>
          ) : null}
        </header>

        <div
          className={`layout__content${
            boardModeSwitching ? ' layout__content--switching' : ''
          }`}
        >
          {boardModeSwitching ? (
            <BoardModeLoadingOverlay mode={boardMode} />
          ) : showCloudLogin ? (
            <CloudLoginPanel
              onLogin={(email, password) =>
                postMessage({ type: 'CLOUD_LOGIN', email, password })
              }
            />
          ) : !selectedProjectId ? (
            <div className="empty-state">
              {isTeamMode
                ? 'No team projects with tasks assigned to you yet.'
                : 'Create a project or use Quick Capture to get started.'}
            </div>
          ) : (
            <TaskBoard
              tasks={tasks}
              elapsedByTaskId={elapsedByTaskId}
              readOnly={isTeamMode}
              onMoveTask={(taskId, toStatus, insertAt) =>
                postMessage({
                  type: 'MOVE_TASK',
                  taskId,
                  toStatus,
                  insertAt,
                })
              }
              onReorderTasks={(status, taskIds) => {
                if (!selectedProjectId) {
                  return;
                }
                postMessage({
                  type: 'REORDER_TASKS',
                  projectId: selectedProjectId,
                  status,
                  taskIds,
                });
              }}
              onAddTask={addTask}
              onOpenTask={setSelectedTaskId}
              onStartTask={(taskId) =>
                postMessage({ type: 'START_TASK', taskId })
              }
              onReadyForTest={(taskId) =>
                postMessage({ type: 'READY_FOR_TEST', taskId })
              }
              onApproveTask={(taskId) =>
                postMessage({ type: 'APPROVE_TASK', taskId })
              }
              onRevertToTodo={(taskId) =>
                postMessage({ type: 'MOVE_TASK', taskId, toStatus: 'todo' })
              }
              onRevertToDoing={(taskId) =>
                postMessage({ type: 'MOVE_TASK', taskId, toStatus: 'doing' })
              }
              onSendToAi={(taskId) =>
                postMessage({ type: 'SEND_TO_AI', taskId })
              }
              onDeleteTask={(taskId) =>
                postMessage({ type: 'DELETE_TASK', taskId })
              }
              onOpenInCloud={
                isTeamMode
                  ? (projectId, taskId) =>
                      postMessage({
                        type: 'OPEN_CLOUD_TASK',
                        projectId,
                        taskId,
                      })
                  : undefined
              }
            />
          )}
        </div>
      </main>

      {selectedTask ? (
        <TaskDetail
          key={selectedTask.id}
          task={selectedTask}
          logs={taskLogs}
          gitFiles={gitFiles}
          elapsed={elapsedByTaskId[selectedTask.id]}
          isCloud={selectedTask.source === 'cloud'}
          onClose={() => setSelectedTaskId(null)}
          onSave={handleTaskSave}
          onDelete={() => {
            postMessage({ type: 'DELETE_TASK', taskId: selectedTask.id });
            setSelectedTaskId(null);
          }}
          onStartTimer={() =>
            postMessage({ type: 'START_TIMER', taskId: selectedTask.id })
          }
          onStopTimer={() =>
            postMessage({ type: 'STOP_TIMER', taskId: selectedTask.id })
          }
          onLoadLogs={handleLoadTaskLogs}
          onLoadGitFiles={handleLoadGitFiles}
          onPickFiles={() => postMessage({ type: 'PICK_WORKSPACE_FILES' })}
          onSendToAi={() =>
            postMessage({ type: 'SEND_TO_AI', taskId: selectedTask.id })
          }
          onOpenInCloud={
            selectedTask.source === 'cloud'
              ? () =>
                  postMessage({
                    type: 'OPEN_CLOUD_TASK',
                    projectId: selectedTask.projectId,
                    taskId: selectedTask.id,
                  })
              : undefined
          }
        />
      ) : null}

      {aiContext ? (
        <AIPromptModal
          context={aiContext}
          onClose={() => setAiContext(null)}
          onOpenFile={() =>
            postMessage({
              type: 'OPEN_TASK_CONTEXT_FILE',
              taskId: aiContext.taskId,
            })
          }
        />
      ) : null}

      {aiPrompt ? (
        <LegacyAIPromptModal
          prompt={aiPrompt.prompt}
          onClose={() => setAiPrompt(null)}
        />
      ) : null}

      {newProjectOpen ? (
        <Modal
          title="New Project"
          onClose={() => setNewProjectOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setNewProjectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createProject}>Create</Button>
            </>
          }
        >
          <input
            className="input"
            placeholder="Project name"
            value={newProjectName}
            autoFocus
            onChange={(event) => setNewProjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                createProject();
              }
            }}
          />
        </Modal>
      ) : null}

      {linearPanelOpen && selectedProject && !isTeamMode ? (
        <Modal
          title="Integrations"
          onClose={() => setLinearPanelOpen(false)}
        >
          <LinearIntegrationPanel
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            connected={linearConnected}
            organization={linearOrganization}
            syncStatus={linearSyncStatus}
            projectConfig={linearProjectConfigs[selectedProject.id] ?? null}
            teams={linearTeams}
            onConnect={(apiKey) =>
              postMessage({ type: 'LINEAR_CONNECT', apiKey })
            }
            onDisconnect={() => postMessage({ type: 'LINEAR_DISCONNECT' })}
            onTestConnection={() =>
              postMessage({ type: 'LINEAR_TEST_CONNECTION' })
            }
            onLoadTeams={() => postMessage({ type: 'LINEAR_GET_TEAMS' })}
            onLink={(teamId, linearProjectId) =>
              postMessage({
                type: 'LINEAR_LINK_PROJECT',
                projectId: selectedProject.id,
                teamId,
                linearProjectId,
              })
            }
            onUnlink={() =>
              postMessage({
                type: 'LINEAR_UNLINK_PROJECT',
                projectId: selectedProject.id,
              })
            }
            onSyncNow={() =>
              postMessage({
                type: 'LINEAR_SYNC_NOW',
                projectId: selectedProject.id,
              })
            }
            onClose={() => setLinearPanelOpen(false)}
          />
        </Modal>
      ) : null}

      {githubPanelOpen && selectedProject && !isTeamMode ? (
        <Modal title="Integrations" onClose={() => setGitHubPanelOpen(false)}>
          <GitHubIntegrationPanel
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            connected={githubConnected}
            username={githubUsername}
            syncStatus={githubSyncStatus}
            projectConfig={githubProjectConfigs[selectedProject.id] ?? null}
            repos={githubRepos}
            ghProjects={githubProjects}
            onConnect={(token) => postMessage({ type: 'GITHUB_CONNECT', token })}
            onDisconnect={() => postMessage({ type: 'GITHUB_DISCONNECT' })}
            onTestConnection={() =>
              postMessage({ type: 'GITHUB_TEST_CONNECTION' })
            }
            onLink={(payload) =>
              postMessage({
                type: 'GITHUB_LINK_PROJECT',
                projectId: selectedProject.id,
                ...payload,
              })
            }
            onUnlink={() =>
              postMessage({
                type: 'GITHUB_UNLINK_PROJECT',
                projectId: selectedProject.id,
              })
            }
            onSyncNow={() =>
              postMessage({
                type: 'GITHUB_SYNC_NOW',
                projectId: selectedProject.id,
              })
            }
            onClose={() => setGitHubPanelOpen(false)}
          />
        </Modal>
      ) : null}

      {notionPanelOpen && selectedProject && !isTeamMode ? (
        <Modal title="Integrations" onClose={() => setNotionPanelOpen(false)}>
          <NotionIntegrationPanel
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            connected={notionConnected}
            workspaceName={notionWorkspaceName}
            syncStatus={notionSyncStatus}
            projectConfig={notionProjectConfigs[selectedProject.id] ?? null}
            databases={notionDatabases}
            mapping={notionPropertyMapping}
            onConnect={(token) => postMessage({ type: 'NOTION_CONNECT', token })}
            onDisconnect={() => postMessage({ type: 'NOTION_DISCONNECT' })}
            onTestConnection={() =>
              postMessage({ type: 'NOTION_TEST_CONNECTION' })
            }
            onLoadDatabases={() => postMessage({ type: 'NOTION_GET_DATABASES' })}
            onLoadSchema={(databaseId) =>
              postMessage({ type: 'NOTION_GET_DATABASE_SCHEMA', databaseId })
            }
            onLink={(payload) =>
              postMessage({
                type: 'NOTION_LINK_PROJECT',
                projectId: selectedProject.id,
                ...payload,
              })
            }
            onUnlink={() =>
              postMessage({
                type: 'NOTION_UNLINK_PROJECT',
                projectId: selectedProject.id,
              })
            }
            onSyncNow={() =>
              postMessage({
                type: 'NOTION_SYNC_NOW',
                projectId: selectedProject.id,
              })
            }
            onClose={() => setNotionPanelOpen(false)}
          />
        </Modal>
      ) : null}

      {newTaskStatus ? (
        <Modal
          title={`New task in ${STATUS_LABELS[newTaskStatus]}`}
          onClose={() => setNewTaskStatus(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setNewTaskStatus(null)}>
                Cancel
              </Button>
              <Button onClick={createTask}>Create</Button>
            </>
          }
        >
          <input
            className="input"
            placeholder="Task title"
            value={newTaskTitle}
            autoFocus
            onChange={(event) => setNewTaskTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                createTask();
              }
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
