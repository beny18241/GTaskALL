"use client";

import { useCallback, useMemo } from "react";
import { format, isToday, isTomorrow, addDays, startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { TaskList } from "@/components/task-list";
import { AddTask } from "@/components/add-task";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { Task, Priority, DayGroup } from "@/types";

export default function UpcomingPage() {
  const { taskLists } = useAccountsStore();
  const {
    tasks,
    getUpcomingTasks,
    addTask,
    updateTask,
    removeTask,
    setSelectedTask,
  } = useTasksStore();

  const upcomingTasks = getUpcomingTasks();

  // Group tasks by day
  const groupedTasks = useMemo(() => {
    const groups: DayGroup[] = [];
    const tasksByDate = new Map<string, Task[]>();

    upcomingTasks.forEach((task) => {
      if (!task.due) return;
      const dateKey = startOfDay(new Date(task.due)).toISOString();
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey)!.push(task);
    });

    // Sort dates and create groups
    const sortedDates = Array.from(tasksByDate.keys()).sort();
    sortedDates.forEach((dateKey) => {
      const date = new Date(dateKey);
      let dateLabel = format(date, "EEEE, MMMM d");
      
      if (isToday(date)) {
        dateLabel = "Today";
      } else if (isTomorrow(date)) {
        dateLabel = "Tomorrow";
      }

      groups.push({
        date,
        dateLabel,
        tasks: tasksByDate.get(dateKey)!,
      });
    });

    return groups;
  }, [upcomingTasks]);

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
          body: JSON.stringify(data),
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
    <div className="h-full flex flex-col p-6 overflow-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <CalendarDays className="h-6 w-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Upcoming</h1>
        </div>
        <p className="text-muted-foreground">Next 7 days</p>
      </div>

      <div className="mb-4">
        <AddTask
          onAdd={handleAddTask}
          taskLists={taskLists}
          defaultListId={taskLists[0]?.id}
        />
      </div>

      {groupedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>No upcoming tasks. Plan ahead! 📅</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedTasks.map((group) => (
            <div key={group.date.toISOString()}>
              <h2 className="text-lg font-semibold mb-2 sticky top-0 bg-background py-2">
                {group.dateLabel}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                </span>
              </h2>
              <TaskList
                tasks={group.tasks}
                onTaskClick={handleTaskClick}
                onTaskComplete={handleTaskComplete}
                onTaskDelete={handleTaskDelete}
                showList
                getListTitle={getListTitle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
