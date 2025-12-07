"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Plus, Trash2, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Account } from "@/types";
import { cn } from "@/lib/utils";

interface AccountManagerProps {
  accounts: Account[];
  currentAccount: Account | null;
  onRemoveAccount: (accountId: string) => void;
  onSwitchAccount: (accountId: string) => void;
}

export function AccountManager({
  accounts,
  currentAccount,
  onRemoveAccount,
  onSwitchAccount,
}: AccountManagerProps) {
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const handleAddAccount = () => {
    // Sign in with a new Google account
    // The prompt=select_account forces account selection
    signIn("google", { 
      callbackUrl: "/",
      prompt: "select_account"
    });
  };

  const handleRemoveAccount = () => {
    if (accountToRemove) {
      onRemoveAccount(accountToRemove.id);
      setAccountToRemove(null);
      setIsRemoveDialogOpen(false);
    }
  };

  const confirmRemoveAccount = (account: Account) => {
    setAccountToRemove(account);
    setIsRemoveDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Accounts
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleAddAccount}
            title="Add another Google account"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group",
                currentAccount?.id === account.id
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/50"
              )}
              onClick={() => onSwitchAccount(account.id)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={account.image} />
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{account.email}</p>
              </div>
              {accounts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmRemoveAccount(account);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleAddAccount}
        >
          <Plus className="h-4 w-4" />
          Add account
        </Button>
      </div>

      {/* Remove Account Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {accountToRemove?.email}? 
              All tasks from this account will be hidden from your views.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveAccount}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
