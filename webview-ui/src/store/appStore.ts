import { create } from 'zustand';
import type {
  GitFiles,
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
  } | null;
  error: string | null;
  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: Task[]) => void;
  setAllTasks: (tasks: Task[]) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;
  togglePriorityFilter: (priority: TaskPriority) => void;
  toggleTagFilter: (tag: string) => void;
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
    } | null,
  ) => void;
  setError: (message: string | null) => void;
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

  toggleTagFilter: (tag) => {
    const current = get().filters.tags ?? [];
    const tags = current.includes(tag)
      ? current.filter((item) => item !== tag)
      : [...current, tag];
    set({ filters: { ...get().filters, tags } });
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

export function getSelectedProject(): Project | undefined {
  const { projects, selectedProjectId } = useAppStore.getState();
  return projects.find((project) => project.id === selectedProjectId);
}

export function getSelectedTask(): Task | undefined {
  const { allTasks, selectedTaskId } = useAppStore.getState();
  return allTasks.find((task) => task.id === selectedTaskId);
}
