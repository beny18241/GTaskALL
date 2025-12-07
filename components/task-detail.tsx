"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { PrioritySelect } from "./priority-select";
import { Task, Priority, TaskListWithAccount, PRIORITY_COLORS } from "@/types";
import { cn } from "@/lib/utils";

interface TaskDetailProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string, completed: boolean) => void;
  taskLists: TaskListWithAccount[];
}

export function TaskDetail({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onComplete,
  taskLists,
}: TaskDetailProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Priority>(4);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || "");
      setDueDate(task.due ? new Date(task.due) : undefined);
      setPriority(task.priority);
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;

    onUpdate(task.id, {
      title,
      notes,
      due: dueDate?.toISOString(),
      priority,
    });
  };

  const handleTitleBlur = () => {
    if (task && title !== task.title) {
      handleSave();
    }
  };

  const handleNotesBlur = () => {
    if (task && notes !== task.notes) {
      handleSave();
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setDueDate(date);
    if (task) {
      onUpdate(task.id, { due: date?.toISOString() });
    }
  };

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority);
    if (task) {
      onUpdate(task.id, { priority: newPriority });
    }
  };

  const handleDelete = () => {
    if (task) {
      onDelete(task.id);
      onClose();
    }
  };

  const taskList = task ? taskLists.find((l) => l.id === task.listId) : null;
  const isCompleted = task?.status === "completed";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Task Details</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {task && (
          <div className="space-y-6 mt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => onComplete(task.id, checked as boolean)}
                className={cn(
                  "rounded-full h-5 w-5 border-2 mt-1",
                  task.priority === 1 && "border-red-500 data-[state=checked]:bg-red-500",
                  task.priority === 2 && "border-orange-500 data-[state=checked]:bg-orange-500",
                  task.priority === 3 && "border-blue-500 data-[state=checked]:bg-blue-500",
                  task.priority === 4 && "border-gray-400 data-[state=checked]:bg-gray-400"
                )}
              />
              <div className="flex-1">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className={cn(
                    "border-0 p-0 h-auto text-lg font-medium focus-visible:ring-0",
                    isCompleted && "line-through text-muted-foreground"
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Description
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add a description..."
                  className="w-full min-h-[100px] text-sm resize-none border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Due Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "MMM d, yyyy") : "Set due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                      {dueDate && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => handleDateChange(undefined)}
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Priority
                  </label>
                  <PrioritySelect value={priority} onChange={handlePriorityChange} />
                </div>
              </div>

              {taskList && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    List
                  </label>
                  <p className="text-sm">
                    {taskList.title}
                    <span className="text-muted-foreground ml-2">
                      ({taskList.accountEmail})
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete task
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
