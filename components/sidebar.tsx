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
  Eye,
  EyeOff,
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
import { useSettingsStore } from "@/lib/stores/settings-store";
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
  const { showLists, setShowLists } = useSettingsStore();
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
      {/* Logo header */}
      <div className="p-4">
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

          {/* Connected Google Accounts - Improved design */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-semibold text-foreground">
                Accounts
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  title="Refresh all accounts"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", (isRefreshing || isLoading) && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleAddAccount}
                  title="Add another Google account"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1 px-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-2 rounded-lg transition-colors",
                    account.email === session?.user?.email
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent"
                  )}
                >
                  <Avatar className="h-8 w-8 ring-2 ring-border">
                    <AvatarImage src={account.image} />
                    <AvatarFallback className="text-xs font-semibold">
                      {account.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {account.name || account.email.split("@")[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {account.email}
                    </p>
                  </div>
                  {account.email === session?.user?.email ? (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-green-500" title="Active account" />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => handleRemoveAccount(account)}
                      title="Disconnect account"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 border-dashed gap-2"
                onClick={handleAddAccount}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Task lists by account */}
          {showLists && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-semibold text-foreground">
                  Lists
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowLists(false)}
                    title="Hide lists"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </Button>
                  {onAddList && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onAddList}
                      title="Add list"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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
          )}

          {/* Show Lists button when hidden */}
          {!showLists && (
            <div className="px-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowLists(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                Show Lists
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with user menu */}
      <div className="border-t">
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-2.5 px-3"
              >
                <Avatar className="h-8 w-8 ring-2 ring-border">
                  <AvatarImage src={session?.user?.image} />
                  <AvatarFallback className="text-xs">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="px-3 pb-3 flex items-center justify-center gap-3">
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
