"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, signIn, useSession } from "next-auth/react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Columns3,
  ListChecks,
  ListTodo,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TaskListWithAccount, Account } from "@/types";
import { cn } from "@/lib/utils";
import { useAccountsStore } from "@/lib/stores/accounts-store";
import { useTasksStore } from "@/lib/stores/tasks-store";
import { useTheme } from "next-themes";
import { ListColorPicker } from "@/components/list-color-picker";

interface SidebarProps {
  taskLists: TaskListWithAccount[];
  onAddList?: () => void;
  onRefresh?: () => void;
}

export function Sidebar({ taskLists, onAddList, onRefresh }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { accounts, removeAccount, updateTaskList, isLoading } = useAccountsStore();
  const { clearTasksByAccount } = useTasksStore();
  const { setTheme, resolvedTheme } = useTheme();

  const handleListColorChange = (listId: string, color: string) => {
    updateTaskList(listId, { color });
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleAddAccount = () => {
    // Sign in with a new Google account
    // The prompt=select_account forces account selection
    signIn("google", {
      callbackUrl: "/",
      prompt: "select_account",
    });
  };

  const handleRemoveAccount = (account: Account) => {
    // Don't allow removing the current session account
    if (account.email === session?.user?.email) {
      return;
    }
    setAccountToRemove(account);
  };

  const confirmRemoveAccount = () => {
    if (accountToRemove) {
      clearTasksByAccount(accountToRemove.id);
      removeAccount(accountToRemove.id);
      setAccountToRemove(null);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  // Group task lists by account
  const groupedLists = taskLists.reduce((acc, list) => {
    if (!acc[list.accountId]) {
      acc[list.accountId] = {
        email: list.accountEmail,
        lists: [],
      };
    }
    acc[list.accountId].lists.push(list);
    return acc;
  }, {} as Record<string, { email: string; lists: TaskListWithAccount[] }>);

  const navItems = [
    {
      label: "Today",
      href: "/",
      icon: Sun,
    },
    {
      label: "Upcoming",
      href: "/upcoming",
      icon: CalendarDays,
    },
    {
      label: "Kanban",
      href: "/kanban",
      icon: Columns3,
    },
    {
      label: "All Tasks",
      href: "/all",
      icon: ListChecks,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo and User header */}
      <div className="p-4 space-y-4">
        {/* Logo at top */}
        <div className="flex items-center gap-2 px-1">
          <Image
            src="/logo.svg"
            alt="GTaskALL"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="text-base font-semibold">GTaskALL</span>
        </div>

        {/* User dropdown - smaller and more compact */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-1.5 px-2"
            >
              <Avatar className="h-7 w-7 ring-2 ring-border">
                <AvatarImage src={session?.user?.image} />
                <AvatarFallback className="text-xs">
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium truncate">
                  {session?.user?.name || "User"}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {session?.user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {resolvedTheme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Light mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark mode
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Main nav items */}
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Connected Google Accounts - Modern compact design */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Accounts ({accounts.length})
              </span>
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  title="Refresh all accounts"
                >
                  <RefreshCw className={cn("h-3 w-3", (isRefreshing || isLoading) && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={handleAddAccount}
                  title="Add another Google account"
                >
                  <UserPlus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 px-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="group relative"
                  title={account.email}
                >
                  <Avatar className={cn(
                    "h-8 w-8 ring-2 cursor-pointer transition-all hover:ring-primary",
                    account.email === session?.user?.email
                      ? "ring-primary"
                      : "ring-border"
                  )}>
                    <AvatarImage src={account.image} />
                    <AvatarFallback className="text-xs">
                      {account.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {account.email !== session?.user?.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive p-0"
                      onClick={() => handleRemoveAccount(account)}
                      title="Disconnect account"
                    >
                      <X className="h-2.5 w-2.5 text-destructive-foreground" />
                    </Button>
                  )}
                  {account.email === session?.user?.email && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-sidebar" />
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-accent"
                onClick={handleAddAccount}
                title="Add Google account"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Task lists by account */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lists
              </span>
              {onAddList && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onAddList}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {Object.entries(groupedLists).map(([accountId, { email, lists }]) => (
              <div key={accountId}>
                <button
                  onClick={() => toggleAccount(accountId)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedAccounts.has(accountId) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span className="truncate text-xs">{email}</span>
                  <span className="text-[10px] ml-auto">({lists.length})</span>
                </button>

                {expandedAccounts.has(accountId) && (
                  <div className="ml-3 space-y-1">
                    {lists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-center gap-1 group"
                      >
                        <Link
                          href={`/lists/${list.id}`}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors flex-1",
                            pathname === `/lists/${list.id}`
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent/50"
                          )}
                        >
                          <div
                            className="h-3 w-3 rounded-full border-2 border-white/50"
                            style={{ backgroundColor: list.color || "#64748b" }}
                          />
                          <span className="truncate flex-1">{list.title}</span>
                        </Link>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ListColorPicker
                            value={list.color}
                            onChange={(color) => handleListColorChange(list.id, color)}
                            size="sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {Object.keys(groupedLists).length === 0 && !isLoading && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No task lists yet
              </p>
            )}

            {isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer - simplified */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/privacy"
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">
            © 2025 GTaskALL
          </span>
        </div>
      </div>

      {/* Remove Account Confirmation Dialog */}
      <Dialog open={!!accountToRemove} onOpenChange={() => setAccountToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect {accountToRemove?.email}?
              Tasks from this account will no longer be shown.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveAccount}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
