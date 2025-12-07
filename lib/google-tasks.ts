import { GoogleTask, GoogleTaskList, Task, TaskMetadata, Priority } from "@/types";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const METADATA_PREFIX = "<!--gtm:";
const METADATA_SUFFIX = "-->";

// Parse priority from notes field
export function parseTaskMetadata(notes: string | undefined): { priority: Priority; cleanNotes: string } {
  if (!notes) {
    return { priority: 4, cleanNotes: "" };
  }

  const metadataRegex = new RegExp(`${METADATA_PREFIX}(.+?)${METADATA_SUFFIX}`);
  const match = notes.match(metadataRegex);

  if (match) {
    try {
      const metadata: TaskMetadata = JSON.parse(match[1]);
      const cleanNotes = notes.replace(metadataRegex, "").trim();
      return {
        priority: metadata.priority || 4,
        cleanNotes,
      };
    } catch {
      return { priority: 4, cleanNotes: notes };
    }
  }

  return { priority: 4, cleanNotes: notes };
}

// Serialize priority to notes field
export function serializeTaskMetadata(notes: string, priority: Priority): string {
  const metadata: TaskMetadata = { priority };
  const metadataString = `${METADATA_PREFIX}${JSON.stringify(metadata)}${METADATA_SUFFIX}`;
  
  // Remove any existing metadata first
  const cleanNotes = notes.replace(new RegExp(`${METADATA_PREFIX}(.+?)${METADATA_SUFFIX}`), "").trim();
  
  if (priority === 4 && !cleanNotes) {
    return "";
  }
  
  if (priority === 4) {
    return cleanNotes;
  }
  
  return cleanNotes ? `${metadataString}\n${cleanNotes}` : metadataString;
}

// Convert Google Task to our Task type
export function googleTaskToTask(
  googleTask: GoogleTask,
  accountId: string,
  listId: string
): Task {
  const { priority, cleanNotes } = parseTaskMetadata(googleTask.notes);
  return {
    ...googleTask,
    priority,
    notes: cleanNotes,
    accountId,
    listId,
  };
}

// API wrapper class
export class GoogleTasksAPI {
  private accessToken: string;
  private accountId: string;

  constructor(accessToken: string, accountId: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${TASKS_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API request failed");
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Task Lists
  async getTaskLists(): Promise<GoogleTaskList[]> {
    const response = await this.fetch<{ items: GoogleTaskList[] }>("/users/@me/lists");
    return response.items || [];
  }

  async createTaskList(title: string): Promise<GoogleTaskList> {
    return this.fetch<GoogleTaskList>("/users/@me/lists", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async updateTaskList(listId: string, title: string): Promise<GoogleTaskList> {
    return this.fetch<GoogleTaskList>(`/users/@me/lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  }

  async deleteTaskList(listId: string): Promise<void> {
    await this.fetch(`/users/@me/lists/${listId}`, {
      method: "DELETE",
    });
  }

  // Tasks
  async getTasks(listId: string, showCompleted = false): Promise<Task[]> {
    const params = new URLSearchParams({
      maxResults: "100",
      showCompleted: showCompleted.toString(),
      showHidden: "false",
    });

    const response = await this.fetch<{ items: GoogleTask[] }>(
      `/lists/${listId}/tasks?${params}`
    );

    return (response.items || []).map((task) =>
      googleTaskToTask(task, this.accountId, listId)
    );
  }

  async getTask(listId: string, taskId: string): Promise<Task> {
    const googleTask = await this.fetch<GoogleTask>(
      `/lists/${listId}/tasks/${taskId}`
    );
    return googleTaskToTask(googleTask, this.accountId, listId);
  }

  async createTask(
    listId: string,
    data: {
      title: string;
      notes?: string;
      due?: string;
      priority?: Priority;
    }
  ): Promise<Task> {
    const body: Partial<GoogleTask> = {
      title: data.title,
      status: "needsAction",
    };

    if (data.due) {
      body.due = data.due;
    }

    const notes = serializeTaskMetadata(data.notes || "", data.priority || 4);
    if (notes) {
      body.notes = notes;
    }

    const googleTask = await this.fetch<GoogleTask>(`/lists/${listId}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return googleTaskToTask(googleTask, this.accountId, listId);
  }

  async updateTask(
    listId: string,
    taskId: string,
    data: {
      title?: string;
      notes?: string;
      due?: string | null;
      status?: "needsAction" | "completed";
      priority?: Priority;
    }
  ): Promise<Task> {
    // First get the current task to preserve metadata
    const currentTask = await this.getTask(listId, taskId);

    const body: Partial<GoogleTask> = {};

    if (data.title !== undefined) {
      body.title = data.title;
    }

    if (data.status !== undefined) {
      body.status = data.status;
      if (data.status === "completed") {
        body.completed = new Date().toISOString();
      }
    }

    if (data.due !== undefined) {
      body.due = data.due || undefined;
    }

    // Handle notes and priority
    const priority = data.priority ?? currentTask.priority;
    const notes = data.notes ?? currentTask.notes;
    body.notes = serializeTaskMetadata(notes, priority);

    const googleTask = await this.fetch<GoogleTask>(
      `/lists/${listId}/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return googleTaskToTask(googleTask, this.accountId, listId);
  }

  async deleteTask(listId: string, taskId: string): Promise<void> {
    await this.fetch(`/lists/${listId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  }

  async completeTask(listId: string, taskId: string): Promise<Task> {
    return this.updateTask(listId, taskId, { status: "completed" });
  }

  async uncompleteTask(listId: string, taskId: string): Promise<Task> {
    return this.updateTask(listId, taskId, { status: "needsAction" });
  }

  async moveTask(
    fromListId: string,
    toListId: string,
    taskId: string
  ): Promise<Task> {
    // Get the task from the old list
    const task = await this.getTask(fromListId, taskId);

    // Create in new list
    const newTask = await this.createTask(toListId, {
      title: task.title,
      notes: task.notes,
      due: task.due,
      priority: task.priority,
    });

    // Delete from old list
    await this.deleteTask(fromListId, taskId);

    return newTask;
  }
}
