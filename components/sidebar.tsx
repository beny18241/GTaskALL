"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, signIn, useSession } from "next-auth/react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Columns3,
  ListTodo,
  LogOut,
  Plus,
  Settings,
  Sun,
  User,
  UserPlus,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TaskListWithAccount } from "@/types";
import { cn } from "@/lib/utils";
import { useAccountsStore } from "@/lib/stores/accounts-store";

interface SidebarProps {
  taskLists: TaskListWithAccount[];
  onAddList?: () => void;
}

export function Sidebar({ taskLists, onAddList }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

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

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const { accounts, addAccount, removeAccount } = useAccountsStore();

  const handleAddAccount = () => {
    // Sign in with a new Google account
    // The prompt=select_account forces account selection
    signIn("google", {
      callbackUrl: "/",
      prompt: "select_account",
    });
  };

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
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* User header */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
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
                </button>

                {expandedAccounts.has(accountId) && (
                  <div className="ml-3 space-y-1">
                    {lists.map((list) => (
                      <Link
                        key={list.id}
                        href={`/lists/${list.id}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === `/lists/${list.id}`
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        <ListTodo className="h-4 w-4" />
                        <span className="truncate">{list.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {Object.keys(groupedLists).length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No task lists yet
              </p>
            )}
          </div>

          <Separator className="my-4" />

          {/* Accounts Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Google Accounts
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleAddAccount}
                title="Add another Google account"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1">
              {/* Current session account */}
              {session?.user && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={session.user.image} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{session.user.email}</p>
                  </div>
                </div>
              )}

              {/* Other accounts from store */}
              {accounts
                .filter((acc) => acc.email !== session?.user?.email)
                .map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={account.image} />
                      <AvatarFallback>
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{account.email}</p>
                    </div>
                  </div>
                ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground text-xs"
              onClick={handleAddAccount}
            >
              <Plus className="h-3 w-3" />
              Add Google account
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
