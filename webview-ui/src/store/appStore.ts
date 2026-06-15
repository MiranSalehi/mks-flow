import { create } from 'zustand';
import type {
  BoardMode,
  CloudSyncStatus,
  CloudUser,
  GitFiles,
  LinearProjectConfig,
  LinearSyncStatus,
  LinearTeamOption,
  GitHubProject,
  GitHubProjectConfig,
  GitHubRepo,
  GitHubSyncStatus,
  NotionDatabase,
  NotionProjectConfig,
  NotionPropertyMapping,
  NotionSyncStatus,
  Project,
  Task,
  TaskFilters,
  TaskLog,
  TaskPriority,
} from '../types/messages';

interface AppState {
  projects: Project[];
  tasks: Task[];
  allTasks: Task[];
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  sidebarCollapsed: boolean;
  searchQuery: string;
  filters: TaskFilters;
  gitFiles: GitFiles;
  taskLogs: TaskLog[];
  elapsedByTaskId: Record<string, number>;
  aiPrompt: { taskId: string; prompt: string } | null;
  aiContext: {
    taskId: string;
    relativePath: string;
    contextFilePath: string;
    chatPrompt: string;
    markdown?: string;
    providerName?: string;
    attachedToChat?: boolean;
  } | null;
  error: string | null;
  boardMode: BoardMode;
  cloudUser: CloudUser | null;
  cloudAuthenticated: boolean;
  cloudLastSyncAt: string | null;
  syncStatus: CloudSyncStatus;
  syncMessage: string | null;
  boardModeSwitching: boolean;
  boardModeSwitchStartedAt: number | null;
  linearConnected: boolean;
  linearOrganization: string | null;
  linearSyncStatus: LinearSyncStatus;
  linearSyncMessage: string | null;
  linearLastSyncAt: string | null;
  linearTeams: LinearTeamOption[];
  linearProjectConfigs: Record<string, LinearProjectConfig>;
  linearPanelOpen: boolean;
  githubConnected: boolean;
  githubUsername: string | null;
  githubSyncStatus: GitHubSyncStatus;
  githubSyncMessage: string | null;
  githubLastSyncAt: string | null;
  githubRepos: GitHubRepo[];
  githubProjects: GitHubProject[];
  githubProjectConfigs: Record<string, GitHubProjectConfig>;
  githubPanelOpen: boolean;
  notionConnected: boolean;
  notionWorkspaceName: string | null;
  notionSyncStatus: NotionSyncStatus;
  notionSyncMessage: string | null;
  notionLastSyncAt: string | null;
  notionDatabases: NotionDatabase[];
  notionPropertyMapping: NotionPropertyMapping | null;
  notionProjectConfigs: Record<string, NotionProjectConfig>;
  notionPanelOpen: boolean;
  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: Task[]) => void;
  setAllTasks: (tasks: Task[]) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;
  togglePriorityFilter: (priority: TaskPriority) => void;
  setPriorityFilter: (priority: TaskPriority | null) => void;
  toggleTagFilter: (tag: string) => void;
  setTagFilter: (tag: string | null) => void;
  clearFilters: () => void;
  setGitFiles: (files: GitFiles) => void;
  setTaskLogs: (taskId: string, logs: TaskLog[]) => void;
  setElapsed: (taskId: string, elapsed: number) => void;
  setAiPrompt: (payload: { taskId: string; prompt: string } | null) => void;
  setAiContext: (
    payload: {
      taskId: string;
      relativePath: string;
      contextFilePath: string;
      chatPrompt: string;
      markdown?: string;
      providerName?: string;
      attachedToChat?: boolean;
    } | null,
  ) => void;
  setError: (message: string | null) => void;
  setBoardMode: (mode: BoardMode) => void;
  beginBoardModeSwitch: (mode: BoardMode) => void;
  finishBoardModeSwitch: () => void;
  setCloudAuthState: (payload: {
    isAuthenticated: boolean;
    user?: CloudUser;
    lastSyncAt?: string | null;
  }) => void;
  setSyncStatus: (status: CloudSyncStatus, message?: string | null) => void;
  setLinearState: (payload: {
    connected: boolean;
    organization?: string | null;
    syncStatus?: LinearSyncStatus;
    syncMessage?: string | null;
    lastSyncAt?: string | null;
  }) => void;
  setLinearTeams: (teams: LinearTeamOption[]) => void;
  setLinearProjectConfig: (
    projectId: string,
    config: LinearProjectConfig | null,
  ) => void;
  setLinearPanelOpen: (open: boolean) => void;
  setGitHubState: (payload: {
    connected: boolean;
    username?: string | null;
    syncStatus?: GitHubSyncStatus;
    syncMessage?: string | null;
    lastSyncAt?: string | null;
  }) => void;
  setGitHubRepos: (repos: GitHubRepo[]) => void;
  setGitHubProjects: (projects: GitHubProject[]) => void;
  setGitHubProjectConfig: (
    projectId: string,
    config: GitHubProjectConfig | null,
  ) => void;
  setGitHubPanelOpen: (open: boolean) => void;
  setNotionState: (payload: {
    connected: boolean;
    workspaceName?: string | null;
    syncStatus?: NotionSyncStatus;
    syncMessage?: string | null;
    lastSyncAt?: string | null;
  }) => void;
  setNotionDatabases: (databases: NotionDatabase[]) => void;
  setNotionPropertyMapping: (mapping: NotionPropertyMapping | null) => void;
  setNotionProjectConfig: (
    projectId: string,
    config: NotionProjectConfig | null,
  ) => void;
  setNotionPanelOpen: (open: boolean) => void;
  mergeRelatedFiles: (taskId: string, files: string[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  tasks: [],
  allTasks: [],
  selectedProjectId: null,
  selectedTaskId: null,
  sidebarCollapsed: false,
  searchQuery: '',
  filters: {},
  gitFiles: { modified: [], added: [], deleted: [] },
  taskLogs: [],
  elapsedByTaskId: {},
  aiPrompt: null,
  aiContext: null,
  error: null,
  boardMode: 'personal',
  cloudUser: null,
  cloudAuthenticated: false,
  cloudLastSyncAt: null,
  syncStatus: 'idle',
  syncMessage: null,
  boardModeSwitching: false,
  boardModeSwitchStartedAt: null,
  linearConnected: false,
  linearOrganization: null,
  linearSyncStatus: 'idle',
  linearSyncMessage: null,
  linearLastSyncAt: null,
  linearTeams: [],
  linearProjectConfigs: {},
  linearPanelOpen: false,
  githubConnected: false,
  githubUsername: null,
  githubSyncStatus: 'idle',
  githubSyncMessage: null,
  githubLastSyncAt: null,
  githubRepos: [],
  githubProjects: [],
  githubProjectConfigs: {},
  githubPanelOpen: false,
  notionConnected: false,
  notionWorkspaceName: null,
  notionSyncStatus: 'idle',
  notionSyncMessage: null,
  notionLastSyncAt: null,
  notionDatabases: [],
  notionPropertyMapping: null,
  notionProjectConfigs: {},
  notionPanelOpen: false,

  setProjects: (projects) => {
    set({ projects });
    const { selectedProjectId } = get();
    if (!selectedProjectId && projects.length > 0) {
      set({ selectedProjectId: projects[0].id });
    }
    if (
      selectedProjectId &&
      !projects.some((project) => project.id === selectedProjectId)
    ) {
      set({ selectedProjectId: projects[0]?.id ?? null });
    }
  },

  setTasks: (tasks) => set({ tasks }),

  setAllTasks: (tasks) => {
    set({ allTasks: tasks });
    const { selectedProjectId, searchQuery, filters } = get();
    if (!selectedProjectId) {
      set({ tasks: [] });
      return;
    }

    let filtered = tasks.filter((task) => task.projectId === selectedProjectId);

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query),
      );
    }

    if (filters.priorities?.length) {
      filtered = filtered.filter((task) =>
        filters.priorities!.includes(task.priority),
      );
    }

    if (filters.tags?.length) {
      filtered = filtered.filter((task) =>
        filters.tags!.every((tag) => task.tags.includes(tag)),
      );
    }

    set({ tasks: filtered });
  },

  setSelectedProjectId: (id) => {
    set({ selectedProjectId: id, selectedTaskId: null });
    get().setAllTasks(get().allTasks);
  },

  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().setAllTasks(get().allTasks);
  },

  togglePriorityFilter: (priority) => {
    const current = get().filters.priorities ?? [];
    const priorities = current.includes(priority)
      ? current.filter((item) => item !== priority)
      : [...current, priority];
    set({ filters: { ...get().filters, priorities } });
    get().setAllTasks(get().allTasks);
  },

  setPriorityFilter: (priority) => {
    set({
      filters: {
        ...get().filters,
        priorities: priority ? [priority] : undefined,
      },
    });
    get().setAllTasks(get().allTasks);
  },

  toggleTagFilter: (tag) => {
    const current = get().filters.tags ?? [];
    const tags = current.includes(tag)
      ? current.filter((item) => item !== tag)
      : [...current, tag];
    set({ filters: { ...get().filters, tags } });
    get().setAllTasks(get().allTasks);
  },

  setTagFilter: (tag) => {
    set({
      filters: {
        ...get().filters,
        tags: tag ? [tag] : undefined,
      },
    });
    get().setAllTasks(get().allTasks);
  },

  clearFilters: () => {
    set({ searchQuery: '', filters: {} });
    get().setAllTasks(get().allTasks);
  },

  setGitFiles: (files) => set({ gitFiles: files }),

  setTaskLogs: (_taskId, logs) => set({ taskLogs: logs }),

  setElapsed: (taskId, elapsed) =>
    set((state) => ({
      elapsedByTaskId: { ...state.elapsedByTaskId, [taskId]: elapsed },
    })),

  setAiPrompt: (payload) => set({ aiPrompt: payload, aiContext: null }),

  setAiContext: (payload) => set({ aiContext: payload, aiPrompt: null }),

  setError: (message) => set({ error: message }),

  setBoardMode: (mode) => set({ boardMode: mode }),

  beginBoardModeSwitch: (mode) => {
    clearBoardSwitchTimers();

    set({
      boardModeSwitching: true,
      boardModeSwitchStartedAt: Date.now(),
      boardMode: mode,
      selectedTaskId: null,
      error: null,
    });

    boardSwitchSafetyTimer = setTimeout(() => {
      const state = get();
      if (state.boardModeSwitching) {
        set({
          boardModeSwitching: false,
          boardModeSwitchStartedAt: null,
        });
      }
      boardSwitchSafetyTimer = null;
    }, BOARD_SWITCH_TIMEOUT_MS);
  },

  finishBoardModeSwitch: () => {
    const { boardModeSwitchStartedAt, boardModeSwitching } = get();

    if (!boardModeSwitching) {
      return;
    }

    const elapsed = boardModeSwitchStartedAt
      ? Date.now() - boardModeSwitchStartedAt
      : BOARD_SWITCH_MIN_MS;
    const wait = Math.max(0, BOARD_SWITCH_MIN_MS - elapsed);

    if (boardSwitchFinishTimer) {
      clearTimeout(boardSwitchFinishTimer);
    }

    boardSwitchFinishTimer = setTimeout(() => {
      set({
        boardModeSwitching: false,
        boardModeSwitchStartedAt: null,
      });
      boardSwitchFinishTimer = null;
      if (boardSwitchSafetyTimer) {
        clearTimeout(boardSwitchSafetyTimer);
        boardSwitchSafetyTimer = null;
      }
    }, wait);
  },

  setCloudAuthState: ({ isAuthenticated, user, lastSyncAt }) =>
    set({
      cloudAuthenticated: isAuthenticated,
      cloudUser: user ?? null,
      cloudLastSyncAt: lastSyncAt ?? null,
    }),

  setSyncStatus: (status, message = null) =>
    set({ syncStatus: status, syncMessage: message ?? null }),

  setLinearState: ({
    connected,
    organization,
    syncStatus,
    syncMessage,
    lastSyncAt,
  }) =>
    set((state) => ({
      linearConnected: connected,
      linearOrganization:
        organization !== undefined ? organization : state.linearOrganization,
      linearSyncStatus: syncStatus ?? state.linearSyncStatus,
      linearSyncMessage:
        syncMessage !== undefined ? syncMessage : state.linearSyncMessage,
      linearLastSyncAt:
        lastSyncAt !== undefined ? lastSyncAt : state.linearLastSyncAt,
    })),

  setLinearTeams: (teams) => set({ linearTeams: teams }),

  setLinearProjectConfig: (projectId, config) =>
    set((state) => {
      const linearProjectConfigs = { ...state.linearProjectConfigs };
      if (config) {
        linearProjectConfigs[projectId] = config;
      } else {
        delete linearProjectConfigs[projectId];
      }
      return { linearProjectConfigs };
    }),

  setLinearPanelOpen: (open) => set({ linearPanelOpen: open }),

  setGitHubState: ({
    connected,
    username,
    syncStatus,
    syncMessage,
    lastSyncAt,
  }) =>
    set((state) => ({
      githubConnected: connected,
      githubUsername: username !== undefined ? username : state.githubUsername,
      githubSyncStatus: syncStatus ?? state.githubSyncStatus,
      githubSyncMessage:
        syncMessage !== undefined ? syncMessage : state.githubSyncMessage,
      githubLastSyncAt:
        lastSyncAt !== undefined ? lastSyncAt : state.githubLastSyncAt,
    })),

  setGitHubRepos: (repos) => set({ githubRepos: repos }),

  setGitHubProjects: (projects) => set({ githubProjects: projects }),

  setGitHubProjectConfig: (projectId, config) =>
    set((state) => {
      const githubProjectConfigs = { ...state.githubProjectConfigs };
      if (config) {
        githubProjectConfigs[projectId] = config;
      } else {
        delete githubProjectConfigs[projectId];
      }
      return { githubProjectConfigs };
    }),

  setGitHubPanelOpen: (open) => set({ githubPanelOpen: open }),

  setNotionState: ({
    connected,
    workspaceName,
    syncStatus,
    syncMessage,
    lastSyncAt,
  }) =>
    set((state) => ({
      notionConnected: connected,
      notionWorkspaceName:
        workspaceName !== undefined ? workspaceName : state.notionWorkspaceName,
      notionSyncStatus: syncStatus ?? state.notionSyncStatus,
      notionSyncMessage:
        syncMessage !== undefined ? syncMessage : state.notionSyncMessage,
      notionLastSyncAt:
        lastSyncAt !== undefined ? lastSyncAt : state.notionLastSyncAt,
    })),

  setNotionDatabases: (databases) => set({ notionDatabases: databases }),

  setNotionPropertyMapping: (mapping) =>
    set({ notionPropertyMapping: mapping }),

  setNotionProjectConfig: (projectId, config) =>
    set((state) => {
      const notionProjectConfigs = { ...state.notionProjectConfigs };
      if (config) {
        notionProjectConfigs[projectId] = config;
      } else {
        delete notionProjectConfigs[projectId];
      }
      return { notionProjectConfigs };
    }),

  setNotionPanelOpen: (open) => set({ notionPanelOpen: open }),

  mergeRelatedFiles: (taskId, files) => {
    if (files.length === 0) {
      return;
    }

    const { allTasks } = get();
    const task = allTasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    const merged = [...new Set([...task.relatedFiles, ...files])];
    get().setAllTasks(
      allTasks.map((item) =>
        item.id === taskId ? { ...item, relatedFiles: merged } : item,
      ),
    );
  },
}));

const BOARD_SWITCH_MIN_MS = 520;
const BOARD_SWITCH_TIMEOUT_MS = 15000;
let boardSwitchFinishTimer: ReturnType<typeof setTimeout> | null = null;
let boardSwitchSafetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearBoardSwitchTimers(): void {
  if (boardSwitchFinishTimer) {
    clearTimeout(boardSwitchFinishTimer);
    boardSwitchFinishTimer = null;
  }
  if (boardSwitchSafetyTimer) {
    clearTimeout(boardSwitchSafetyTimer);
    boardSwitchSafetyTimer = null;
  }
}

export function getSelectedProject(): Project | undefined {
  const { projects, selectedProjectId } = useAppStore.getState();
  return projects.find((project) => project.id === selectedProjectId);
}

export function getSelectedTask(): Task | undefined {
  const { allTasks, selectedTaskId } = useAppStore.getState();
  return allTasks.find((task) => task.id === selectedTaskId);
}
