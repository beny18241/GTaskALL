"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrioritySelect } from "./priority-select";
import { Priority, TaskListWithAccount } from "@/types";
import { cn } from "@/lib/utils";

interface AddTaskProps {
  onAdd: (data: {
    title: string;
    notes?: string;
    due?: string;
    priority: Priority;
    listId: string;
  }) => void;
  taskLists: TaskListWithAccount[];
  defaultListId?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function AddTask({
  onAdd,
  taskLists,
  defaultListId,
  isExpanded = false,
  onToggleExpand,
}: AddTaskProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Priority>(4);
  const [selectedListId, setSelectedListId] = useState(defaultListId || taskLists[0]?.id || "");
  const [isOpen, setIsOpen] = useState(isExpanded);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedListId) return;

    onAdd({
      title: title.trim(),
      notes: notes.trim() || undefined,
      due: dueDate?.toISOString(),
      priority,
      listId: selectedListId,
    });

    // Reset form
    setTitle("");
    setNotes("");
    setDueDate(undefined);
    setPriority(4);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTitle("");
    setNotes("");
    setDueDate(undefined);
    setPriority(4);
    setIsOpen(false);
    onToggleExpand?.();
  };

  const selectedList = taskLists.find((l) => l.id === selectedListId);

  if (!isOpen && !isExpanded) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          onToggleExpand?.();
        }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-3 space-y-3">
      <Input
        placeholder="Task name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="border-0 p-0 h-auto text-sm font-medium focus-visible:ring-0"
      />

      <Input
        placeholder="Description"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="border-0 p-0 h-auto text-xs text-muted-foreground focus-visible:ring-0"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 text-xs gap-1.5",
                dueDate && "text-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {dueDate ? format(dueDate, "MMM d") : "Due date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <PrioritySelect value={priority} onChange={setPriority} size="sm" />

        {taskLists.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                {selectedList?.title || "Select list"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {taskLists.map((list) => (
                <DropdownMenuItem
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={cn(selectedListId === list.id && "bg-accent")}
                >
                  <span className="truncate">{list.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {list.accountEmail}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim() || !selectedListId}>
          Add task
        </Button>
      </div>
    </form>
  );
}
