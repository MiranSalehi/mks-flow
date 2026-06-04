/** Extension command identifiers. */
export const COMMANDS = {
  QUICK_CAPTURE: 'mksflow.quickCapture',
  CREATE_PROJECT: 'mksflow.createProject',
  DELETE_PROJECT: 'mksflow.deleteProject',
  CREATE_TASK: 'mksflow.createTask',
  START_TASK: 'mksflow.startTask',
  READY_FOR_TEST: 'mksflow.readyForTest',
  APPROVE_TASK: 'mksflow.approveTask',
  SEND_TO_AI: 'mksflow.sendToAI',
  EDIT_TASK: 'mksflow.editTask',
  DELETE_TASK: 'mksflow.deleteTask',
  OPEN_BOARD: 'mksflow.openBoard',
  EXPORT_PROJECT: 'mksflow.exportProject',
  SEARCH_TASKS: 'mksflow.searchTasks',
} as const;

/** Tree view identifier. */
export const TASK_TREE_VIEW_ID = 'mksflow.taskTree';

/** Webview view type identifier. */
export const WEBVIEW_VIEW_TYPE = 'mksflow.mainPanel';
