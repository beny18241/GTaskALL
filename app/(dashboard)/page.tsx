"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Sun } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { TaskList } from "@/components/task-list";
import { AddTask } from "@/components/add-task";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { Task, Priority } from "@/types";

export default function TodayPage() {
  const { taskLists } = useAccountsStore();
  const {
    tasks,
    getTodayTasks,
    addTask,
    updateTask,
    removeTask,
    setSelectedTask,
  } = useTasksStore();

  const todayTasks = getTodayTasks();
  const today = new Date();

  const handleAddTask = useCallback(
    async (data: {
      title: string;
      notes?: string;
      due?: string;
      priority: Priority;
      listId: string;
    }) => {
      try {
        // Set due to today if not specified
        const dueDate = data.due || new Date().toISOString();

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            due: dueDate,
          }),
        });

        if (!response.ok) throw new Error("Failed to create task");

        const task = await response.json();
        addTask(task);
      } catch (error) {
        console.error("Error creating task:", error);
      }
    },
    [addTask]
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

  const getListTitle = useCallback(
    (listId: string) => {
      const list = taskLists.find((l) => l.id === listId);
      return list?.title || "";
    },
    [taskLists]
  );

  return (
    <PageTransition>
      <div className="h-full flex flex-col p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Sun className="h-6 w-6 text-yellow-500" />
            <h1 className="text-2xl font-bold">Today</h1>
          </div>
          <p className="text-muted-foreground">
            {format(today, "EEEE, MMMM d")}
          </p>
        </div>

        <div className="mb-4">
          <AddTask
            onAdd={handleAddTask}
            taskLists={taskLists}
            defaultListId={taskLists[0]?.id}
          />
        </div>

        <TaskList
          tasks={todayTasks}
          onTaskClick={handleTaskClick}
          onTaskComplete={handleTaskComplete}
          onTaskDelete={handleTaskDelete}
          showList
          getListTitle={getListTitle}
          emptyMessage="No tasks due today. Enjoy your day! 🎉"
        />
      </div>
    </PageTransition>
  );
}
