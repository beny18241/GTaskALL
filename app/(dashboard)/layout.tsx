"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { TaskDetail } from "@/components/task-detail";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { Task, TaskListWithAccount } from "@/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { taskLists, setTaskLists, setLoading: setAccountsLoading } = useAccountsStore();
  const {
    tasks,
    setTasks,
    addTasks,
    updateTask,
    removeTask,
    selectedTaskId,
    setSelectedTask,
    getSelectedTask,
    setLoading: setTasksLoading,
  } = useTasksStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch task lists and tasks on mount
  useEffect(() => {
    if (session?.accessToken) {
      fetchTaskLists();
    }
  }, [session?.accessToken]);

  const fetchTaskLists = async () => {
    try {
      setAccountsLoading(true);
      const response = await fetch("/api/tasks/lists");
      if (!response.ok) throw new Error("Failed to fetch task lists");
      
      const lists = await response.json();
      
      // Add account info to lists
      const listsWithAccount: TaskListWithAccount[] = lists.map((list: any) => ({
        ...list,
        accountId: session?.user?.id || "",
        accountEmail: session?.user?.email || "",
      }));
      
      setTaskLists(listsWithAccount);
      
      // Fetch tasks for each list
      for (const list of listsWithAccount) {
        await fetchTasksForList(list.id);
      }
    } catch (error) {
      console.error("Error fetching task lists:", error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchTasksForList = async (listId: string) => {
    try {
      const response = await fetch(`/api/tasks?listId=${listId}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      
      const tasks = await response.json();
      addTasks(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleTaskComplete = useCallback(async (taskId: string, completed: boolean) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
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
      // Revert on error
      updateTask(taskId, { status: completed ? "needsAction" : "completed" });
    }
  }, [tasks, updateTask]);

  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    updateTask(taskId, updates);

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: task.listId,
          taskId: task.id,
          ...updates,
        }),
      });

      if (!response.ok) throw new Error("Failed to update task");
    } catch (error) {
      console.error("Error updating task:", error);
    }
  }, [tasks, updateTask]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
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
  }, [tasks, removeTask]);

  const selectedTask = getSelectedTask();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r flex-col">
        <Sidebar taskLists={taskLists} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar taskLists={taskLists} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Tasks</h1>
        </header>

        <div className="flex-1 overflow-hidden">{children}</div>
      </main>

      {/* Task detail panel */}
      <TaskDetail
        task={selectedTask || null}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        onComplete={handleTaskComplete}
        taskLists={taskLists}
      />
    </div>
  );
}
