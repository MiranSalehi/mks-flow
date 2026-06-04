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
        return;
      default:
        return;
    }
  });

  return { postMessage, ...store };
}
