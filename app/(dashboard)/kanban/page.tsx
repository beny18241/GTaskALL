"use client";

import { useCallback, useMemo, useState } from "react";
import { format, addDays, isToday, isTomorrow, startOfDay } from "date-fns";
import { Columns3, Plus, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { PageTransition } from "@/components/page-transition";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { Task, Priority, PRIORITY_COLORS } from "@/types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AddTask } from "@/components/add-task";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DAYS_TO_SHOW = 7;

// Account color palette
const ACCOUNT_COLORS = [
  { border: "border-l-blue-500", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  { border: "border-l-green-500", bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
  { border: "border-l-purple-500", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  { border: "border-l-orange-500", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  { border: "border-l-pink-500", bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400" },
  { border: "border-l-cyan-500", bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400" },
];

function getAccountColor(accountId: string, accounts: any[]) {
  const index = accounts.findIndex((a) => a.id === accountId);
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

interface DraggableTaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  getListTitle: (listId: string) => string;
  accounts: any[];
}

function DraggableTaskCard({
  task,
  onTaskClick,
  onTaskComplete,
  getListTitle,
  accounts,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const accountColor = getAccountColor(task.accountId, accounts);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-card rounded-xl p-4 border-l-4 border-y border-r border-y-border/50 border-r-border/50 cursor-pointer group",
        "hover:shadow-lg hover:border-primary/20 transition-all duration-200",
        "backdrop-blur-sm",
        accountColor.border,
        task.status === "completed" && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        </div>
        <Checkbox
          checked={task.status === "completed"}
          onCheckedChange={(checked) => {
            onTaskComplete(task.id, checked as boolean);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 data-[state=checked]:bg-primary"
        />
        <div className="flex-1 min-w-0" onClick={() => onTaskClick(task)}>
          <p
            className={cn(
              "text-sm font-medium leading-relaxed break-words",
              task.status === "completed" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          {task.notes && (
            <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-3 leading-relaxed break-words">
              {task.notes}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-md",
              task.priority === 1 && "bg-red-500/10 text-red-600 dark:text-red-400",
              task.priority === 2 && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
              task.priority === 3 && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              task.priority === 4 && "bg-gray-500/10 text-gray-600 dark:text-gray-400"
            )}>
              P{task.priority}
            </span>
            <span className="text-xs text-muted-foreground/70 truncate max-w-[150px]">
              {getListTitle(task.listId)}
            </span>
            {accounts.length > 1 && (
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-md",
                accountColor.bg,
                accountColor.text
              )}>
                {accounts.find(a => a.id === task.accountId)?.email.split('@')[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface KanbanColumnProps {
  date: Date;
  dateKey: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onAddTask: (data: { title: string; notes?: string; due?: string; priority: Priority; listId: string }) => void;
  taskLists: any[];
  getListTitle: (listId: string) => string;
  accounts: any[];
}

function KanbanColumn({
  date,
  dateKey,
  tasks,
  onTaskClick,
  onTaskComplete,
  onAddTask,
  taskLists,
  getListTitle,
  accounts,
}: KanbanColumnProps) {
  const dateLabel = useMemo(() => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  }, [date]);

  const isCurrentDay = isToday(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex-shrink-0 w-80 rounded-2xl flex flex-col h-full border backdrop-blur-sm",
        isCurrentDay
          ? "bg-gradient-to-b from-primary/5 via-primary/5 to-background border-primary/30 shadow-md shadow-primary/10"
          : "bg-gradient-to-b from-muted/50 to-background border-border/50",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] transition-transform"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "p-4 pb-3 rounded-t-2xl",
          isCurrentDay && "bg-gradient-to-r from-primary/10 to-transparent"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "text-lg font-bold tracking-tight",
            isCurrentDay && "text-primary"
          )}>
            {dateLabel}
          </h3>
          <div className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full",
            isCurrentDay
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground"
          )}>
            {tasks.length}
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {format(date, "EEEE, MMMM d")}
        </p>
      </div>

      {/* Tasks */}
      <ScrollArea className="flex-1 px-3 py-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="space-y-2.5 min-h-[100px] pb-2">
            {tasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onTaskComplete={onTaskComplete}
                getListTitle={getListTitle}
                accounts={accounts}
              />
            ))}

            {tasks.length === 0 && !isOver && (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground/70 font-medium">No tasks yet</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Click below to add one</p>
              </div>
            )}
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 px-4 border-2 border-dashed border-primary/50 rounded-xl bg-primary/5"
              >
                <p className="text-sm text-primary font-semibold">Drop task here</p>
              </motion.div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add Task Button */}
      <div className="p-3 border-t border-border/50">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">Add task</span>
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
    </motion.div>
  );
}

export default function KanbanPage() {
  const { taskLists, accounts } = useAccountsStore();
  const {
    tasks,
    addTask,
    updateTask,
    removeTask,
    setSelectedTask,
    kanbanAccountFilter,
    setKanbanAccountFilter,
    getKanbanTasks,
  } = useTasksStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate array of dates for columns
  const dates = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(today, i));
  }, []);

  // Group tasks by date with account filter
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, Task[]>();

    dates.forEach((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      groups.set(dateKey, []);
    });

    const filteredTasks = getKanbanTasks();

    filteredTasks
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
  }, [tasks, dates, kanbanAccountFilter, getKanbanTasks]);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const targetDateKey = over.id as string;
      const task = tasks.find((t) => t.id === taskId);

      if (!task) return;

      // Get current task date
      const currentDateKey = task.due
        ? format(startOfDay(new Date(task.due)), "yyyy-MM-dd")
        : null;

      // If dropped in a different column, update the date
      if (currentDateKey !== targetDateKey) {
        const targetDate = dates.find(
          (d) => format(d, "yyyy-MM-dd") === targetDateKey
        );

        if (targetDate) {
          // Set the time to start of day
          const newDueDate = startOfDay(targetDate).toISOString();

          // Optimistic update
          updateTask(taskId, { due: newDueDate });

          try {
            const response = await fetch("/api/tasks", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                listId: task.listId,
                taskId: task.id,
                due: newDueDate,
              }),
            });

            if (!response.ok) throw new Error("Failed to update task");
          } catch (error) {
            console.error("Error updating task date:", error);
            // Revert on error
            updateTask(taskId, { due: task.due });
          }
        }
      }
    },
    [tasks, dates, updateTask]
  );

  const selectedAccount = accounts.find((a) => a.id === kanbanAccountFilter);
  const totalTasks = useMemo(() => {
    let count = 0;
    tasksByDate.forEach((tasks) => {
      count += tasks.length;
    });
    return count;
  }, [tasksByDate]);

  return (
    <PageTransition>
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
                <Columns3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {kanbanAccountFilter && selectedAccount
                    ? `${selectedAccount.name || selectedAccount.email}'s Board`
                    : "Kanban Board"}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                  {totalTasks} {totalTasks === 1 ? "task" : "tasks"} • Drag to reschedule
                </p>
              </div>
            </div>

            {accounts.length > 1 && (
              <Select
                value={kanbanAccountFilter || "all"}
                onValueChange={(value) => setKanbanAccountFilter(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[220px] h-10 border-border/50 hover:border-border transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs text-primary-foreground font-bold">
                        All
                      </div>
                      <span className="font-medium">All Accounts</span>
                    </div>
                  </SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={account.image} />
                          <AvatarFallback className="text-xs">{account.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{account.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 -mx-6 px-6 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50 pointer-events-none" />
            <ScrollArea className="h-full">
              <div className="flex gap-5 pb-6 h-[calc(100vh-200px)]">
                {dates.map((date) => {
                  const dateKey = format(date, "yyyy-MM-dd");
                  const dayTasks = tasksByDate.get(dateKey) || [];

                  return (
                    <KanbanColumn
                      key={dateKey}
                      date={date}
                      dateKey={dateKey}
                      tasks={dayTasks}
                      onTaskClick={handleTaskClick}
                      onTaskComplete={handleTaskComplete}
                      onAddTask={handleAddTask}
                      taskLists={taskLists}
                      getListTitle={getListTitle}
                      accounts={accounts}
                    />
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="h-3" />
            </ScrollArea>
          </div>

          <DragOverlay>
            {activeTask ? (
              <motion.div
                initial={{ scale: 1.05, rotate: 3 }}
                animate={{ scale: 1.05, rotate: 3 }}
                className={cn(
                  "bg-card rounded-xl p-4 shadow-2xl border-l-4 border-y-2 border-r-2 border-y-primary border-r-primary ring-4 ring-primary/20 w-80 backdrop-blur-md",
                  getAccountColor(activeTask.accountId, accounts).border
                )}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-primary" />
                  <Checkbox checked={activeTask.status === "completed"} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{activeTask.title}</p>
                    {activeTask.notes && (
                      <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                        {activeTask.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-md",
                        activeTask.priority === 1 && "bg-red-500/10 text-red-600 dark:text-red-400",
                        activeTask.priority === 2 && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                        activeTask.priority === 3 && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        activeTask.priority === 4 && "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                      )}>
                        P{activeTask.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getListTitle(activeTask.listId)}
                      </span>
                      {accounts.length > 1 && (
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-md",
                          getAccountColor(activeTask.accountId, accounts).bg,
                          getAccountColor(activeTask.accountId, accounts).text
                        )}>
                          {accounts.find(a => a.id === activeTask.accountId)?.email.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </PageTransition>
  );
}
