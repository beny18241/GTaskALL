"use client";

import { useCallback, useMemo, useState } from "react";
import { format, isToday, isTomorrow, startOfDay, addDays } from "date-fns";
import { ListChecks, Search, SlidersHorizontal, X } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { TaskList } from "@/components/task-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTasksStore, SortOption, GroupOption, DateFilterOption } from "@/lib/stores/tasks-store";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { Task, Priority } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TaskGroup {
  label: string;
  tasks: Task[];
}

export default function AllTasksPage() {
  const { taskLists, accounts } = useAccountsStore();
  const {
    tasks,
    allTasksFilters,
    setAllTasksFilters,
    resetAllTasksFilters,
    getFilteredTasks,
    updateTask,
    removeTask,
    setSelectedTask,
  } = useTasksStore();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredTasks = useMemo(() => getFilteredTasks(), [getFilteredTasks, allTasksFilters, tasks]);

  // Group tasks based on groupBy setting
  const groupedTasks = useMemo(() => {
    const groups: TaskGroup[] = [];

    if (allTasksFilters.groupBy === "none") {
      return [{ label: "All Tasks", tasks: filteredTasks }];
    }

    if (allTasksFilters.groupBy === "date") {
      const today = startOfDay(new Date());
      const tasksByDate = new Map<string, Task[]>();

      filteredTasks.forEach((task) => {
        let groupKey = "No Date";

        if (task.due) {
          const dueDate = startOfDay(new Date(task.due));
          if (dueDate < today && task.status !== "completed") {
            groupKey = "Overdue";
          } else if (isToday(dueDate)) {
            groupKey = "Today";
          } else if (isTomorrow(dueDate)) {
            groupKey = "Tomorrow";
          } else if (dueDate < addDays(today, 7)) {
            groupKey = "This Week";
          } else {
            groupKey = "Later";
          }
        }

        if (!tasksByDate.has(groupKey)) {
          tasksByDate.set(groupKey, []);
        }
        tasksByDate.get(groupKey)!.push(task);
      });

      const order = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No Date"];
      order.forEach((key) => {
        if (tasksByDate.has(key)) {
          groups.push({ label: key, tasks: tasksByDate.get(key)! });
        }
      });
    } else if (allTasksFilters.groupBy === "account") {
      const tasksByAccount = new Map<string, Task[]>();

      filteredTasks.forEach((task) => {
        const account = accounts.find((a) => a.id === task.accountId);
        const accountName = account?.email || "Unknown";

        if (!tasksByAccount.has(accountName)) {
          tasksByAccount.set(accountName, []);
        }
        tasksByAccount.get(accountName)!.push(task);
      });

      tasksByAccount.forEach((tasks, accountName) => {
        groups.push({ label: accountName, tasks });
      });
    } else if (allTasksFilters.groupBy === "list") {
      const tasksByList = new Map<string, Task[]>();

      filteredTasks.forEach((task) => {
        const list = taskLists.find((l) => l.id === task.listId);
        const listName = list?.title || "Unknown List";

        if (!tasksByList.has(listName)) {
          tasksByList.set(listName, []);
        }
        tasksByList.get(listName)!.push(task);
      });

      tasksByList.forEach((tasks, listName) => {
        groups.push({ label: listName, tasks });
      });
    } else if (allTasksFilters.groupBy === "priority") {
      const priorityLabels = { 1: "Priority 1 (High)", 2: "Priority 2", 3: "Priority 3", 4: "Priority 4 (Low)" };
      const tasksByPriority = new Map<Priority, Task[]>();

      filteredTasks.forEach((task) => {
        if (!tasksByPriority.has(task.priority)) {
          tasksByPriority.set(task.priority, []);
        }
        tasksByPriority.get(task.priority)!.push(task);
      });

      [1, 2, 3, 4].forEach((p) => {
        const priority = p as Priority;
        if (tasksByPriority.has(priority)) {
          groups.push({
            label: priorityLabels[priority],
            tasks: tasksByPriority.get(priority)!
          });
        }
      });
    }

    return groups;
  }, [filteredTasks, allTasksFilters.groupBy, accounts, taskLists]);

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

  const handleSearchChange = (value: string) => {
    setAllTasksFilters({ search: value });
  };

  const handleClearSearch = () => {
    setAllTasksFilters({ search: "" });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (allTasksFilters.accountIds.length > 0) count++;
    if (allTasksFilters.listIds.length > 0) count++;
    if (allTasksFilters.priorities.length > 0) count++;
    if (allTasksFilters.status !== "all") count++;
    if (allTasksFilters.dateFilter !== "all") count++;
    return count;
  }, [allTasksFilters]);

  return (
    <PageTransition>
      <div className="h-full flex flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <ListChecks className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">All Tasks</h1>
          </div>
          <p className="text-muted-foreground">
            {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>

        {/* Search and Controls */}
        <div className="mb-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by title or notes..."
              value={allTasksFilters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {allTasksFilters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Sort, Group, and Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={allTasksFilters.sortBy}
              onValueChange={(value: SortOption) => setAllTasksFilters({ sortBy: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due-asc">Due Date (Oldest)</SelectItem>
                <SelectItem value="due-desc">Due Date (Newest)</SelectItem>
                <SelectItem value="priority-high">Priority (High to Low)</SelectItem>
                <SelectItem value="priority-low">Priority (Low to High)</SelectItem>
                <SelectItem value="created-desc">Recently Updated</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={allTasksFilters.groupBy}
              onValueChange={(value: GroupOption) => setAllTasksFilters({ groupBy: value })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="account">By Account</SelectItem>
                <SelectItem value="list">By List</SelectItem>
                <SelectItem value="priority">By Priority</SelectItem>
              </SelectContent>
            </Select>

            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your task list with advanced filters
                  </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-200px)] mt-6">
                  <div className="space-y-6 pr-4">
                    {/* Status Filter */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Status</Label>
                      <Select
                        value={allTasksFilters.status}
                        onValueChange={(value: "all" | "active" | "completed") =>
                          setAllTasksFilters({ status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tasks</SelectItem>
                          <SelectItem value="active">Active Only</SelectItem>
                          <SelectItem value="completed">Completed Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Date Filter */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Due Date</Label>
                      <Select
                        value={allTasksFilters.dateFilter}
                        onValueChange={(value: DateFilterOption) =>
                          setAllTasksFilters({ dateFilter: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Dates</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="today">Due Today</SelectItem>
                          <SelectItem value="week">Due This Week</SelectItem>
                          <SelectItem value="no-date">No Due Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Account Filter */}
                    {accounts.length > 1 && (
                      <>
                        <div>
                          <Label className="text-base font-semibold mb-3 block">
                            Accounts ({allTasksFilters.accountIds.length} selected)
                          </Label>
                          <div className="space-y-2">
                            {accounts.map((account) => (
                              <div key={account.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`account-${account.id}`}
                                  checked={allTasksFilters.accountIds.includes(account.id)}
                                  onCheckedChange={(checked) => {
                                    const newIds = checked
                                      ? [...allTasksFilters.accountIds, account.id]
                                      : allTasksFilters.accountIds.filter((id) => id !== account.id);
                                    setAllTasksFilters({ accountIds: newIds });
                                  }}
                                />
                                <Label
                                  htmlFor={`account-${account.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {account.email}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Priority Filter */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">
                        Priority ({allTasksFilters.priorities.length} selected)
                      </Label>
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((p) => {
                          const priority = p as Priority;
                          return (
                            <div key={priority} className="flex items-center space-x-2">
                              <Checkbox
                                id={`priority-${priority}`}
                                checked={allTasksFilters.priorities.includes(priority)}
                                onCheckedChange={(checked) => {
                                  const newPriorities = checked
                                    ? [...allTasksFilters.priorities, priority]
                                    : allTasksFilters.priorities.filter((p) => p !== priority);
                                  setAllTasksFilters({ priorities: newPriorities });
                                }}
                              />
                              <Label
                                htmlFor={`priority-${priority}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                Priority {priority}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Clear Filters */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        resetAllTasksFilters();
                        setFiltersOpen(false);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Task Groups */}
        <ScrollArea className="flex-1">
          {groupedTasks.length === 0 || filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No tasks found</p>
              {activeFiltersCount > 0 && (
                <Button
                  variant="link"
                  onClick={resetAllTasksFilters}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {groupedTasks.map((group) => (
                <div key={group.label}>
                  {allTasksFilters.groupBy !== "none" && (
                    <h2 className="text-lg font-semibold mb-2 sticky top-0 bg-background py-2 z-10">
                      {group.label}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </h2>
                  )}
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
        </ScrollArea>
      </div>
    </PageTransition>
  );
}
