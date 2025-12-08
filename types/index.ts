// Google Tasks API Types
export interface GoogleTaskList {
  kind: "tasks#taskList";
  id: string;
  etag: string;
  title: string;
  updated: string;
  selfLink: string;
}

export interface GoogleTask {
  kind: "tasks#task";
  id: string;
  etag: string;
  title: string;
  updated: string;
  selfLink: string;
  parent?: string;
  position: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  links?: Array<{
    type: string;
    description: string;
    link: string;
  }>;
}

// Priority metadata stored in notes field
export interface TaskMetadata {
  priority: Priority;
}

export type Priority = 1 | 2 | 3 | 4;

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-blue-500",
  4: "text-gray-400",
};

export const PRIORITY_BG_COLORS: Record<Priority, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-blue-500",
  4: "bg-gray-400",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Priority 1",
  2: "Priority 2",
  3: "Priority 3",
  4: "Priority 4",
};

// Extended task with parsed priority
export interface Task extends Omit<GoogleTask, "notes"> {
  priority: Priority;
  notes: string;
  accountId: string;
  listId: string;
}

// Account type for multi-account support
export interface Account {
  id: string;
  email: string;
  name: string;
  image?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Task list with account info
export interface TaskListWithAccount extends GoogleTaskList {
  accountId: string;
  accountEmail: string;
  color?: string;
}

// Predefined colors for task lists
export const TASK_LIST_COLORS = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#eab308", label: "Yellow" },
  { value: "#84cc16", label: "Lime" },
  { value: "#22c55e", label: "Green" },
  { value: "#10b981", label: "Emerald" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#a855f7", label: "Purple" },
  { value: "#d946ef", label: "Fuchsia" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f43f5e", label: "Rose" },
  { value: "#64748b", label: "Slate" },
];

// View types
export type ViewType = "today" | "upcoming" | "list";

// Grouped tasks for upcoming view
export interface DayGroup {
  date: Date;
  dateLabel: string;
  tasks: Task[];
}
