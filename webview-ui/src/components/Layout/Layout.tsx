import { useCallback, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { useBoardShortcuts } from '../../hooks/useBoardShortcuts';
import type { TaskStatus, Task } from '../../types/messages';
import { AIPromptModal, LegacyAIPromptModal } from '../TaskDetail/AIPromptModal';
import { TaskDetail } from '../TaskDetail/TaskDetail';
import { ProjectList } from '../ProjectList/ProjectList';
import { SearchFilter } from '../SearchFilter/SearchFilter';
import { TaskBoard } from '../TaskBoard/TaskBoard';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { Sidebar } from './Sidebar';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  test: 'Test',
  done: 'Done',
};

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
    togglePriorityFilter,
    toggleTagFilter,
    clearFilters,
    setAiPrompt,
    setAiContext,
    setError,
  } = useAppData();

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
        <ProjectList
          projects={projects}
          selectedProjectId={selectedProjectId}
          collapsed={sidebarCollapsed}
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

        <header className="layout__header layout__header--sticky">
          <Button variant="ghost" onClick={toggleSidebar}>
            {sidebarCollapsed ? '»' : '«'}
          </Button>
          <div className="layout__header-brand">
            {selectedProject ? (
              <span
                className="layout__project-dot"
                style={{ backgroundColor: selectedProject.color }}
                aria-hidden
              />
            ) : null}
            <h1 className="layout__title layout__title--large">
              {selectedProject?.name ?? 'MKSFlow Board'}
            </h1>
          </div>
          <SearchFilter
            ref={searchInputRef}
            query={searchQuery}
            activePriorities={filters.priorities ?? []}
            availableTags={availableTags}
            activeTags={filters.tags ?? []}
            onQueryChange={setSearchQuery}
            onTogglePriority={togglePriorityFilter}
            onToggleTag={toggleTagFilter}
            onClear={clearFilters}
          />
          {selectedProjectId ? (
            <Button
              variant="secondary"
              onClick={() =>
                postMessage({
                  type: 'EXPORT_PROJECT',
                  projectId: selectedProjectId,
                })
              }
            >
              Export
            </Button>
          ) : null}
        </header>

        <div className="layout__content">
          {!selectedProjectId ? (
            <div className="empty-state">
              Create a project or use Quick Capture to get started.
            </div>
          ) : (
            <TaskBoard
              tasks={tasks}
              elapsedByTaskId={elapsedByTaskId}
              onMoveTask={(taskId, toStatus) =>
                postMessage({ type: 'MOVE_TASK', taskId, toStatus })
              }
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
            />
          )}
        </div>
      </main>

      {selectedTask ? (
        <TaskDetail
          task={selectedTask}
          logs={taskLogs}
          gitFiles={gitFiles}
          elapsed={elapsedByTaskId[selectedTask.id]}
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
