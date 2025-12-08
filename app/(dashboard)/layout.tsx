"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { ImperativePanelHandle } from "react-resizable-panels";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Sidebar } from "@/components/sidebar";
import { TaskDetail } from "@/components/task-detail";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { Task, TaskListWithAccount, Account } from "@/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const hasInitialized = useRef(false);
  
  const { 
    accounts,
    taskLists, 
    addAccount,
    addTaskLists,
    setLoading: setAccountsLoading 
  } = useAccountsStore();
  
  const {
    tasks,
    setTasks,
    addTasks,
    clearTasks,
    updateTask,
    removeTask,
    selectedTaskId,
    setSelectedTask,
    getSelectedTask,
  } = useTasksStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Save current session as account and fetch all data
  useEffect(() => {
    if (session?.accessToken && session?.user && !hasInitialized.current) {
      hasInitialized.current = true;
      
      // Save current session as an account
      const currentAccount: Account = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      };
      
      addAccount(currentAccount);
      
      // Fetch data from all accounts
      fetchAllAccountsData();
    }
  }, [session]);

  // Re-fetch when accounts change
  useEffect(() => {
    if (accounts.length > 0 && hasInitialized.current) {
      fetchAllAccountsData();
    }
  }, [accounts.length]);

  const refreshAccountToken = async (account: Account): Promise<Account | null> => {
    try {
      const response = await fetch("/api/accounts/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: account.refreshToken }),
      });

      if (!response.ok) {
        console.error(`Failed to refresh token for ${account.email}`);
        return null;
      }

      const { accessToken, expiresAt } = await response.json();
      return { ...account, accessToken, expiresAt };
    } catch (error) {
      console.error(`Error refreshing token for ${account.email}:`, error);
      return null;
    }
  };

  const fetchAccountData = async (account: Account) => {
    let currentAccount = account;

    // Check if token is expired
    if (Date.now() >= account.expiresAt * 1000) {
      const refreshed = await refreshAccountToken(account);
      if (!refreshed) {
        console.error(`Could not refresh token for ${account.email}`);
        return;
      }
      currentAccount = refreshed;
      addAccount(refreshed); // Update stored account with new token
    }

    try {
      // Fetch task lists for this account
      const listsResponse = await fetch("/api/accounts/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: currentAccount.accessToken,
          accountId: currentAccount.id,
        }),
      });

      if (!listsResponse.ok) {
        const error = await listsResponse.json();
        if (error.code === "TOKEN_EXPIRED") {
          // Try refreshing once more
          const refreshed = await refreshAccountToken(currentAccount);
          if (refreshed) {
            addAccount(refreshed);
            return fetchAccountData(refreshed);
          }
        }
        throw new Error(error.error);
      }

      const lists = await listsResponse.json();
      
      // Add account info to lists
      const listsWithAccount: TaskListWithAccount[] = lists.map((list: any) => ({
        ...list,
        accountId: currentAccount.id,
        accountEmail: currentAccount.email,
      }));

      addTaskLists(listsWithAccount);

      // Fetch tasks for each list
      for (const list of listsWithAccount) {
        const tasksResponse = await fetch("/api/accounts/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: currentAccount.accessToken,
            accountId: currentAccount.id,
            listId: list.id,
          }),
        });

        if (tasksResponse.ok) {
          const tasks = await tasksResponse.json();
          addTasks(tasks);
        }
      }
    } catch (error) {
      console.error(`Error fetching data for ${account.email}:`, error);
    }
  };

  const fetchAllAccountsData = async () => {
    setAccountsLoading(true);
    clearTasks();

    // Get the latest accounts from the store
    const currentAccounts = useAccountsStore.getState().accounts;
    
    // Fetch data for all accounts in parallel
    await Promise.all(currentAccounts.map(fetchAccountData));

    setAccountsLoading(false);
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

  const toggleSidebar = useCallback(() => {
    if (sidebarRef.current) {
      if (isSidebarCollapsed) {
        sidebarRef.current.expand();
      } else {
        sidebarRef.current.collapse();
      }
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  }, [isSidebarCollapsed]);

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
      {/* Mobile sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar
            taskLists={taskLists}
            onRefresh={fetchAllAccountsData}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop layout with resizable panels */}
      <div className="hidden md:flex flex-1 relative">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar Panel */}
          <ResizablePanel
            ref={sidebarRef}
            defaultSize={16}
            minSize={13}
            maxSize={25}
            collapsible={true}
            collapsedSize={0}
            onCollapse={() => setIsSidebarCollapsed(true)}
            onExpand={() => setIsSidebarCollapsed(false)}
          >
            <aside className="h-screen border-r flex flex-col">
              <Sidebar
                taskLists={taskLists}
                onRefresh={fetchAllAccountsData}
              />
            </aside>
          </ResizablePanel>

          {/* Resize Handle */}
          <ResizableHandle className="w-1 bg-border hover:bg-primary/20 active:bg-primary/30 transition-colors" />

          {/* Main Content Panel */}
          <ResizablePanel defaultSize={84}>
            <main className="h-screen flex flex-col overflow-hidden relative">
              {/* Sidebar Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="absolute top-4 left-4 z-10 h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-accent"
                title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
              {children}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile layout */}
      <main className="flex-1 flex flex-col md:hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-4 p-4 border-b">
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
