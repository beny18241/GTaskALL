"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Flag, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task, PRIORITY_COLORS, Account } from "@/types";
import { cn } from "@/lib/utils";
import { useTasksStore } from "@/lib/stores/tasks-store";

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onClick: () => void;
  showList?: boolean;
  listTitle?: string;
  showAccount?: boolean;
  account?: Account | null;
}

export function TaskItem({
  task,
  onComplete,
  onDelete,
  onClick,
  showList = false,
  listTitle,
  showAccount = false,
  account = null,
}: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = task.status === "completed";

  const handleCheckboxChange = (checked: boolean) => {
    onComplete(task.id, checked);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      layout
      className={cn(
        "group flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
        isCompleted && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center pt-0.5">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded-full h-5 w-5 border-2",
            task.priority === 1 && "border-red-500 data-[state=checked]:bg-red-500",
            task.priority === 2 && "border-orange-500 data-[state=checked]:bg-orange-500",
            task.priority === 3 && "border-blue-500 data-[state=checked]:bg-blue-500",
            task.priority === 4 && "border-gray-400 data-[state=checked]:bg-gray-400"
          )}
        />
      </div>

      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className={cn("text-sm font-medium", isCompleted && "line-through text-muted-foreground")}>
          {task.title}
        </div>

        {task.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {task.notes}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1">
          {task.due && (
            <span
              className={cn(
                "text-xs flex items-center gap-1",
                new Date(task.due) < new Date() && !isCompleted
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due), "MMM d")}
            </span>
          )}
          {showList && listTitle && (
            <span className="text-xs text-muted-foreground">
              {listTitle}
            </span>
          )}
          {showAccount && account && (
            <Avatar className="h-4 w-4 border border-border" title={account.email}>
              <AvatarImage src={account.image || undefined} alt={account.name || account.email} />
              <AvatarFallback className="text-[8px]">
                {(account.name || account.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              Edit task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
