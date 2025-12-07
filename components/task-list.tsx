"use client";

import { Task } from "@/types";
import { TaskItem } from "./task-item";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onTaskDelete: (taskId: string) => void;
  showList?: boolean;
  getListTitle?: (listId: string) => string;
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
  showList = false,
  getListTitle,
  emptyMessage = "No tasks",
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onComplete={onTaskComplete}
            onDelete={onTaskDelete}
            showList={showList}
            listTitle={getListTitle?.(task.listId)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
