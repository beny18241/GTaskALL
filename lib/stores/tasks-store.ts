import { create } from "zustand";
import { Task, Priority } from "@/types";

interface TasksState {
  tasks: Task[];
  selectedTaskId: string | null;
  showCompleted: boolean;
  isLoading: boolean;
  error: string | null;

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
  clearTasksByAccount: (accountId: string) => void;
  clearTasksByList: (listId: string) => void;

  // Getters
  getTaskById: (taskId: string) => Task | undefined;
  getTasksByList: (listId: string) => Task[];
  getTasksByAccount: (accountId: string) => Task[];
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getSelectedTask: () => Task | undefined;
}

export const useTasksStore = create<TasksState>()((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  showCompleted: false,
  isLoading: false,
  error: null,

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

  clearTasksByAccount: (accountId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.accountId !== accountId),
    })),

  clearTasksByList: (listId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.listId !== listId),
    })),

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
}));
