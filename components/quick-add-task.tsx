"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Flag, List, User, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { parseNaturalLanguageDate, parseAccountTag, cleanTaskText } from "@/lib/utils/date-parser";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { Priority, TaskListWithAccount } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuickAddTaskProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddTask({ isOpen, onClose }: QuickAddTaskProps) {
  const { accounts, taskLists } = useAccountsStore();
  const { addTask } = useTasksStore();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Priority>(4);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parsed data from title
  const [parsedDate, setParsedDate] = useState<{ date: Date | null; matchedText: string | null }>({ date: null, matchedText: null });
  const [parsedAccount, setParsedAccount] = useState<{ accountId: string | null; matchedText: string | null }>({ accountId: null, matchedText: null });

  // Filter task lists by selected account
  const filteredTaskLists = useMemo(() => {
    if (!selectedAccountId) return taskLists;
    return taskLists.filter(list => list.accountId === selectedAccountId);
  }, [taskLists, selectedAccountId]);

  // Initialize with first account and list
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      if (!selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
      if (!selectedListId && filteredTaskLists.length > 0) {
        setSelectedListId(filteredTaskLists[0].id);
      }
    }
  }, [isOpen, accounts, filteredTaskLists, selectedAccountId, selectedListId]);

  // Parse title for natural language dates and account tags
  useEffect(() => {
    if (title) {
      const dateResult = parseNaturalLanguageDate(title);
      setParsedDate(dateResult);

      const accountResult = parseAccountTag(title, accounts);
      setParsedAccount(accountResult);
    } else {
      setParsedDate({ date: null, matchedText: null });
      setParsedAccount({ accountId: null, matchedText: null });
    }
  }, [title, accounts]);

  // Auto-apply parsed date
  useEffect(() => {
    if (parsedDate.date && !dueDate) {
      setDueDate(parsedDate.date);
    }
  }, [parsedDate.date]);

  // Auto-apply parsed account
  useEffect(() => {
    if (parsedAccount.accountId) {
      setSelectedAccountId(parsedAccount.accountId);
      // Reset list selection when account changes
      const accountLists = taskLists.filter(list => list.accountId === parsedAccount.accountId);
      if (accountLists.length > 0) {
        setSelectedListId(accountLists[0].id);
      }
    }
  }, [parsedAccount.accountId, taskLists]);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedListId) return;

    setIsSubmitting(true);

    try {
      // Clean title from date and account tags
      const cleanedTitle = cleanTaskText(title, parsedDate.matchedText, parsedAccount.matchedText);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanedTitle,
          notes: notes || undefined,
          due: dueDate?.toISOString(),
          priority,
          listId: selectedListId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");

      const task = await response.json();
      addTask(task);

      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setDueDate(undefined);
    setPriority(4);
    setParsedDate({ date: null, matchedText: null });
    setParsedAccount({ accountId: null, matchedText: null });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const priorityColors = {
    1: "text-red-500",
    2: "text-orange-500",
    3: "text-blue-500",
    4: "text-gray-500",
  };

  const getAccountAvatar = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return null;

    return (
      <Avatar className="h-5 w-5 border">
        <AvatarImage src={account.image || undefined} alt={account.name || account.email} />
        <AvatarFallback className="text-xs">
          {(account.name || account.email).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Quick Add Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Input */}
          <div>
            <Input
              placeholder="Task name (try: 'Submit report tomorrow #work' or 'Call mom this weekend')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              autoFocus
            />
            {/* Show parsed hints */}
            <div className="flex flex-wrap gap-2 mt-2">
              {parsedDate.date && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parsedDate.date, "MMM d")}
                </Badge>
              )}
              {parsedAccount.accountId && (
                <Badge variant="secondary" className="gap-1">
                  {getAccountAvatar(parsedAccount.accountId)}
                  {accounts.find(a => a.id === parsedAccount.accountId)?.email.split("@")[0]}
                </Badge>
              )}
            </div>
          </div>

          {/* Notes */}
          <Textarea
            placeholder="Description (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px] resize-none"
          />

          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-2">
            {/* Due Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {dueDate ? format(dueDate, "MMM d") : "Due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setDueDate(new Date());
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setDueDate(tomorrow);
                    }}
                  >
                    Tomorrow
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      setDueDate(nextWeek);
                    }}
                  >
                    Next week
                  </Button>
                  {dueDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-500"
                      onClick={() => setDueDate(undefined)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
                <CalendarComponent
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Priority Picker */}
            <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value) as Priority)}>
              <SelectTrigger className="w-[140px]">
                <div className="flex items-center gap-2">
                  <Flag className={cn("h-4 w-4", priorityColors[priority])} />
                  <span>Priority {priority}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-red-500" />
                    Priority 1
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-orange-500" />
                    Priority 2
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-blue-500" />
                    Priority 3
                  </div>
                </SelectItem>
                <SelectItem value="4">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-gray-500" />
                    Priority 4
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Account Picker (if multiple accounts) */}
            {accounts.length > 1 && (
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-[200px]">
                  <div className="flex items-center gap-2">
                    {getAccountAvatar(selectedAccountId)}
                    <span className="truncate">
                      {accounts.find(a => a.id === selectedAccountId)?.email.split("@")[0]}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {getAccountAvatar(account.id)}
                        {account.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* List Picker */}
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span className="truncate">
                    {filteredTaskLists.find(l => l.id === selectedListId)?.title || "Select list"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {filteredTaskLists.map(list => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-muted-foreground">
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
              </kbd>
              {" + "}
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                Enter
              </kbd>
              {" to submit"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !selectedListId || isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
