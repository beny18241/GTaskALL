"use client";

import { useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { ListTodo } from "lucide-react";
import { TaskList } from "@/components/task-list";
import { AddTask } from "@/components/add-task";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { Task, Priority } from "@/types";

export default function ListPage() {
  const params = useParams();
  const listId = params.listId as string;
  
  const { taskLists } = useAccountsStore();
  const {
    tasks,
    getTasksByList,
    addTask,
    updateTask,
    removeTask,
    setSelectedTask,
  } = useTasksStore();

  const currentList = useMemo(
    () => taskLists.find((l) => l.id === listId),
    [taskLists, listId]
  );

  const listTasks = useMemo(
    () => getTasksByList(listId).sort((a, b) => a.priority - b.priority),
    [getTasksByList, listId]
  );

  const handleAddTask = useCallback(
    async (data: {
      title: string;
      notes?: string;
      due?: string;
      priority: Priority;
      listId: string;
    }) => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            listId, // Override with current list
          }),
        });

        if (!response.ok) throw new Error("Failed to create task");

        const task = await response.json();
        addTask(task);
      } catch (error) {
        console.error("Error creating task:", error);
      }
    },
    [addTask, listId]
  );

  const handleTaskComplete = useCallback(
    async (taskId: string, completed: boolean) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      updateTask(taskId, { status: completed ? "completed" : "needsAction" });

      try {
        const response = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId: task.listId,
            taskId: task.id,
            status: completed ? "completed" : "needsAction",
          }),
        });

        if (!response.ok) throw new Error("Failed to update task");
      } catch (error) {
        console.error("Error updating task:", error);
        updateTask(taskId, { status: completed ? "needsAction" : "completed" });
      }
    },
    [tasks, updateTask]
  );

  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      removeTask(taskId);

      try {
        const response = await fetch(
          `/api/tasks?listId=${task.listId}&taskId=${taskId}`,
          { method: "DELETE" }
        );

        if (!response.ok) throw new Error("Failed to delete task");
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    },
    [tasks, removeTask]
  );

  const handleTaskClick = useCallback(
    (task: Task) => {
      setSelectedTask(task.id);
    },
    [setSelectedTask]
  );

  if (!currentList) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>List not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ListTodo className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">{currentList.title}</h1>
        </div>
        <p className="text-muted-foreground">{currentList.accountEmail}</p>
      </div>

      <div className="mb-4">
        <AddTask
          onAdd={handleAddTask}
          taskLists={taskLists}
          defaultListId={listId}
        />
      </div>

      <TaskList
        tasks={listTasks}
        onTaskClick={handleTaskClick}
        onTaskComplete={handleTaskComplete}
        onTaskDelete={handleTaskDelete}
        emptyMessage="No tasks in this list. Add one above!"
      />
    </div>
  );
}
