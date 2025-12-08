import { create } from "zustand";
import { Task, Priority } from "@/types";

export type SortOption = "due-asc" | "due-desc" | "priority-high" | "priority-low" | "created-desc" | "title-asc" | "title-desc";
export type GroupOption = "none" | "date" | "account" | "list" | "priority";
export type DateFilterOption = "all" | "overdue" | "no-date" | "today" | "week" | "custom";

export interface AllTasksFilters {
  search: string;
  accountIds: string[];
  listIds: string[];
  priorities: Priority[];
  status: "all" | "active" | "completed";
  dateFilter: DateFilterOption;
  customDateRange?: { start: Date; end: Date };
  sortBy: SortOption;
  groupBy: GroupOption;
}

interface TasksState {
  tasks: Task[];
  selectedTaskId: string | null;
  showCompleted: boolean;
  isLoading: boolean;
  error: string | null;
  allTasksFilters: AllTasksFilters;
  kanbanAccountFilter: string | null; // null = all accounts

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setSelectedTask: (taskId: string | null) => void;
  toggleShowCompleted: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTasks: () => void;
  clearTasksByAccount: (accountId: string) => void;
  clearTasksByList: (listId: string) => void;
  setAllTasksFilters: (filters: Partial<AllTasksFilters>) => void;
  resetAllTasksFilters: () => void;
  setKanbanAccountFilter: (accountId: string | null) => void;

  // Getters
  getTaskById: (taskId: string) => Task | undefined;
  getTasksByList: (listId: string) => Task[];
  getTasksByAccount: (accountId: string) => Task[];
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getSelectedTask: () => Task | undefined;
  getAllTasks: () => Task[];
  getFilteredTasks: () => Task[];
  getKanbanTasks: () => Task[];
}

const defaultFilters: AllTasksFilters = {
  search: "",
  accountIds: [],
  listIds: [],
  priorities: [],
  status: "all",
  dateFilter: "all",
  sortBy: "due-asc",
  groupBy: "none",
};

export const useTasksStore = create<TasksState>()((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  showCompleted: false,
  isLoading: false,
  error: null,
  allTasksFilters: defaultFilters,
  kanbanAccountFilter: null,

  setTasks: (tasks) => set({ tasks }),

  addTasks: (newTasks) =>
    set((state) => {
      // Merge tasks, avoiding duplicates
      const existingIds = new Set(state.tasks.map((t) => t.id));
      const uniqueNewTasks = newTasks.filter((t) => !existingIds.has(t.id));
      return { tasks: [...state.tasks, ...uniqueNewTasks] };
    }),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTaskId:
        state.selectedTaskId === taskId ? null : state.selectedTaskId,
    })),

  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),

  toggleShowCompleted: () =>
    set((state) => ({ showCompleted: !state.showCompleted })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearTasks: () => set({ tasks: [], selectedTaskId: null }),

  clearTasksByAccount: (accountId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.accountId !== accountId),
    })),

  clearTasksByList: (listId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.listId !== listId),
    })),

  setAllTasksFilters: (filters) =>
    set((state) => ({
      allTasksFilters: { ...state.allTasksFilters, ...filters },
    })),

  resetAllTasksFilters: () =>
    set({ allTasksFilters: defaultFilters }),

  setKanbanAccountFilter: (accountId) =>
    set({ kanbanAccountFilter: accountId }),

  getTaskById: (taskId) => {
    return get().tasks.find((t) => t.id === taskId);
  },

  getTasksByList: (listId) => {
    const state = get();
    return state.tasks.filter(
      (t) =>
        t.listId === listId &&
        (state.showCompleted || t.status !== "completed")
    );
  },

  getTasksByAccount: (accountId) => {
    const state = get();
    return state.tasks.filter(
      (t) =>
        t.accountId === accountId &&
        (state.showCompleted || t.status !== "completed")
    );
  },

  getTodayTasks: () => {
    const state = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return state.tasks
      .filter((t) => {
        if (!state.showCompleted && t.status === "completed") return false;
        if (!t.due) return false;
        const dueDate = new Date(t.due);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate < tomorrow;
      })
      .sort((a, b) => a.priority - b.priority);
  },

  getUpcomingTasks: () => {
    const state = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return state.tasks
      .filter((t) => {
        if (!state.showCompleted && t.status === "completed") return false;
        if (!t.due) return false;
        const dueDate = new Date(t.due);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate < nextWeek;
      })
      .sort((a, b) => {
        // Sort by date first, then by priority
        const dateA = new Date(a.due!).getTime();
        const dateB = new Date(b.due!).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.priority - b.priority;
      });
  },

  getSelectedTask: () => {
    const state = get();
    if (!state.selectedTaskId) return undefined;
    return state.tasks.find((t) => t.id === state.selectedTaskId);
  },

  getAllTasks: () => {
    const state = get();
    return state.tasks.filter((t) =>
      state.showCompleted || t.status !== "completed"
    );
  },

  getFilteredTasks: () => {
    const state = get();
    const filters = state.allTasksFilters;
    let filtered = state.tasks;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          (t.notes && t.notes.toLowerCase().includes(searchLower))
      );
    }

    // Account filter
    if (filters.accountIds.length > 0) {
      filtered = filtered.filter((t) => filters.accountIds.includes(t.accountId));
    }

    // List filter
    if (filters.listIds.length > 0) {
      filtered = filtered.filter((t) => filters.listIds.includes(t.listId));
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      filtered = filtered.filter((t) => filters.priorities.includes(t.priority));
    }

    // Status filter
    if (filters.status === "active") {
      filtered = filtered.filter((t) => t.status !== "completed");
    } else if (filters.status === "completed") {
      filtered = filtered.filter((t) => t.status === "completed");
    }

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filters.dateFilter === "overdue") {
      filtered = filtered.filter((t) => {
        if (!t.due) return false;
        const dueDate = new Date(t.due);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && t.status !== "completed";
      });
    } else if (filters.dateFilter === "no-date") {
      filtered = filtered.filter((t) => !t.due);
    } else if (filters.dateFilter === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter((t) => {
        if (!t.due) return false;
        const dueDate = new Date(t.due);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate < tomorrow;
      });
    } else if (filters.dateFilter === "week") {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      filtered = filtered.filter((t) => {
        if (!t.due) return false;
        const dueDate = new Date(t.due);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate < nextWeek;
      });
    } else if (filters.dateFilter === "custom" && filters.customDateRange) {
      const { start, end } = filters.customDateRange;
      filtered = filtered.filter((t) => {
        if (!t.due) return false;
        const dueDate = new Date(t.due);
        return dueDate >= start && dueDate <= end;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "due-asc":
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        case "due-desc":
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(b.due).getTime() - new Date(a.due).getTime();
        case "priority-high":
          return a.priority - b.priority;
        case "priority-low":
          return b.priority - a.priority;
        case "created-desc":
          return new Date(b.updated).getTime() - new Date(a.updated).getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  },

  getKanbanTasks: () => {
    const state = get();
    let filtered = state.tasks;

    // Apply account filter if set
    if (state.kanbanAccountFilter) {
      filtered = filtered.filter((t) => t.accountId === state.kanbanAccountFilter);
    }

    return filtered;
  },
}));
