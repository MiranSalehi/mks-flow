import { useAppStore } from '../store/appStore';
import { useExtensionMessages, useVSCode } from './useVSCode';

export function useAppData() {
  const { postMessage } = useVSCode();
  const store = useAppStore();

  useExtensionMessages((message) => {
    switch (message.type) {
      case 'INIT_DATA':
        store.setProjects(message.projects);
        store.setAllTasks(message.tasks);
        if (useAppStore.getState().boardModeSwitching) {
          store.finishBoardModeSwitch();
        }
        return;
      case 'PROJECTS_UPDATED':
        store.setProjects(message.projects);
        return;
      case 'TASKS_UPDATED':
        store.setAllTasks(message.tasks);
        return;
      case 'TASK_LOGS':
        store.setTaskLogs(message.taskId, message.logs);
        return;
      case 'GIT_FILES':
        store.setGitFiles(message.files);
        return;
      case 'TIMER_TICK':
        store.setElapsed(message.taskId, message.elapsed);
        return;
      case 'AI_PROMPT':
        store.setAiPrompt({ taskId: message.taskId, prompt: message.prompt });
        return;
      case 'AI_CONTEXT_READY':
        store.setAiContext({
          taskId: message.taskId,
          relativePath: message.relativePath,
          contextFilePath: message.contextFilePath,
          chatPrompt: message.chatPrompt,
          markdown: message.markdown,
          providerName: message.providerName,
          attachedToChat: message.attachedToChat,
        });
        return;
      case 'OPEN_TASK':
        store.setSelectedTaskId(message.taskId);
        return;
      case 'WORKSPACE_FILES_PICKED': {
        const state = useAppStore.getState();
        const taskId = state.selectedTaskId;
        if (!taskId || message.files.length === 0) {
          return;
        }

        state.mergeRelatedFiles(taskId, message.files);
        const task = useAppStore.getState().allTasks.find(
          (item) => item.id === taskId,
        );
        if (!task) {
          return;
        }

        postMessage({
          type: 'UPDATE_TASK',
          taskId,
          data: { relatedFiles: task.relatedFiles },
        });
        return;
      }
      case 'ERROR':
        store.setError(message.message);
        if (useAppStore.getState().boardModeSwitching) {
          store.finishBoardModeSwitch();
        }
        return;
      case 'BOARD_MODE':
        store.setBoardMode(message.mode);
        return;
      case 'CLOUD_AUTH_STATE':
        store.setCloudAuthState({
          isAuthenticated: message.isAuthenticated,
          user: message.user,
          lastSyncAt: message.lastSyncAt,
        });
        return;
      case 'CLOUD_SYNC_STATUS':
        store.setSyncStatus(message.status, message.message ?? null);
        return;
      case 'OPEN_LINEAR_SETUP':
        store.setLinearPanelOpen(true);
        return;
      case 'LINEAR_STATE':
        store.setLinearState({
          connected: message.connected,
          organization: message.organization,
          syncStatus: message.syncStatus,
          syncMessage: message.syncMessage,
          lastSyncAt: message.lastSyncAt,
        });
        return;
      case 'LINEAR_TEAMS':
        store.setLinearTeams(message.teams);
        return;
      case 'LINEAR_PROJECT_CONFIG':
        store.setLinearProjectConfig(message.projectId, message.config);
        return;
      case 'LINEAR_SYNC_RESULT':
        if (message.errors.length > 0) {
          store.setError(message.errors.join('; '));
        }
        return;
      case 'OPEN_GITHUB_SETUP':
        store.setGitHubPanelOpen(true);
        return;
      case 'GITHUB_STATE':
        store.setGitHubState({
          connected: message.connected,
          username: message.username,
          syncStatus: message.syncStatus,
          syncMessage: message.syncMessage,
          lastSyncAt: message.lastSyncAt,
        });
        return;
      case 'GITHUB_REPOS':
        store.setGitHubRepos(message.repos);
        return;
      case 'GITHUB_PROJECTS':
        store.setGitHubProjects(message.projects);
        return;
      case 'GITHUB_PROJECT_CONFIG':
        store.setGitHubProjectConfig(message.projectId, message.config);
        return;
      case 'GITHUB_SYNC_RESULT':
        if (message.errors.length > 0) {
          store.setError(message.errors.join('; '));
        }
        return;
      case 'OPEN_NOTION_SETUP':
        store.setNotionPanelOpen(true);
        return;
      case 'NOTION_STATE':
        store.setNotionState({
          connected: message.connected,
          workspaceName: message.workspaceName,
          syncStatus: message.syncStatus,
          syncMessage: message.syncMessage,
          lastSyncAt: message.lastSyncAt,
        });
        return;
      case 'NOTION_DATABASES':
        store.setNotionDatabases(message.databases);
        return;
      case 'NOTION_DATABASE_SCHEMA':
        store.setNotionPropertyMapping(message.mapping);
        return;
      case 'NOTION_PROJECT_CONFIG':
        store.setNotionProjectConfig(message.projectId, message.config);
        return;
      case 'NOTION_SYNC_RESULT':
        if (message.errors.length > 0) {
          store.setError(message.errors.join('; '));
        }
        return;
      case 'CLOUD_ATTACHMENT_URI': {
        const tasks = useAppStore.getState().allTasks.map((task) => {
          if (task.id !== message.taskId) {
            return task;
          }

          return {
            ...task,
            descriptionImages: task.descriptionImages.map((image) =>
              image.id === message.attachmentId
                ? { ...image, uri: message.uri }
                : image,
            ),
          };
        });
        store.setAllTasks(tasks);
        return;
      }
      default:
        return;
    }
  });

  return { postMessage, ...store };
}
