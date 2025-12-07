"use client";

import { useCallback, useMemo } from "react";
import { format, addDays, isToday, isTomorrow, startOfDay } from "date-fns";
import { Columns3, Plus } from "lucide-react";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { Task, Priority, PRIORITY_COLORS } from "@/types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AddTask } from "@/components/add-task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DAYS_TO_SHOW = 7;

interface KanbanColumnProps {
  date: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onAddTask: (data: { title: string; notes?: string; due?: string; priority: Priority; listId: string }) => void;
  taskLists: any[];
  getListTitle: (listId: string) => string;
}

function KanbanColumn({
  date,
  tasks,
  onTaskClick,
  onTaskComplete,
  onAddTask,
  taskLists,
  getListTitle,
}: KanbanColumnProps) {
  const dateLabel = useMemo(() => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  }, [date]);

  const isCurrentDay = isToday(date);

  return (
    <div
      className={cn(
        "flex-shrink-0 w-72 bg-muted/30 rounded-xl flex flex-col h-full",
        isCurrentDay && "ring-2 ring-primary/50"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "p-3 rounded-t-xl border-b",
          isCurrentDay ? "bg-primary/10" : "bg-muted/50"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn(
              "font-semibold",
              isCurrentDay && "text-primary"
            )}>
              {dateLabel}
            </h3>
            <p className="text-xs text-muted-foreground">
              {format(date, "MMMM d, yyyy")}
            </p>
          </div>
          <span className="text-xs bg-background px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "bg-background rounded-lg p-3 shadow-sm border cursor-pointer",
                "hover:shadow-md transition-shadow",
                task.status === "completed" && "opacity-60"
              )}
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={(checked) => {
                    onTaskComplete(task.id, checked as boolean);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm",
                      task.status === "completed" && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                  {task.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn("text-xs", PRIORITY_COLORS[task.priority])}>
                      P{task.priority}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {getListTitle(task.listId)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Task Button */}
      <div className="p-2 border-t">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              Add task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add task for {dateLabel}</DialogTitle>
            </DialogHeader>
            <AddTask
              onAdd={(data) => onAddTask({ ...data, due: date.toISOString() })}
              taskLists={taskLists}
              defaultListId={taskLists[0]?.id}
              showDatePicker={false}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { taskLists } = useAccountsStore();
  const {
    tasks,
    addTask,
    updateTask,
    removeTask,
    setSelectedTask,
  } = useTasksStore();

  // Generate array of dates for columns
  const dates = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(today, i));
  }, []);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, Task[]>();
    
    dates.forEach((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      groups.set(dateKey, []);
    });

    tasks
      .filter((task) => task.status !== "completed" || isToday(new Date(task.completed || "")))
      .forEach((task) => {
        if (task.due) {
          const taskDate = format(startOfDay(new Date(task.due)), "yyyy-MM-dd");
          if (groups.has(taskDate)) {
            groups.get(taskDate)!.push(task);
          }
        }
      });

    // Sort tasks by priority within each day
    groups.forEach((taskList) => {
      taskList.sort((a, b) => a.priority - b.priority);
    });

    return groups;
  }, [tasks, dates]);

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
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Columns3 className="h-6 w-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Kanban Board</h1>
        </div>
        <p className="text-muted-foreground">
          View your tasks organized by day
        </p>
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="flex gap-4 pb-4 h-[calc(100vh-180px)]">
          {dates.map((date) => {
            const dateKey = format(date, "yyyy-MM-dd");
            const dayTasks = tasksByDate.get(dateKey) || [];
            
            return (
              <KanbanColumn
                key={dateKey}
                date={date}
                tasks={dayTasks}
                onTaskClick={handleTaskClick}
                onTaskComplete={handleTaskComplete}
                onAddTask={handleAddTask}
                taskLists={taskLists}
                getListTitle={getListTitle}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
