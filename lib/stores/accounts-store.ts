import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Account, TaskListWithAccount } from "@/types";

interface AccountsState {
  accounts: Account[];
  taskLists: TaskListWithAccount[];
  isLoading: boolean;
  
  // Actions
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
  setTaskLists: (taskLists: TaskListWithAccount[]) => void;
  addTaskLists: (taskLists: TaskListWithAccount[]) => void;
  removeTaskListsByAccount: (accountId: string) => void;
  setLoading: (loading: boolean) => void;
  clearAll: () => void;
  
  // Getters
  getAccountById: (id: string) => Account | undefined;
  getAccountByEmail: (email: string) => Account | undefined;
  getTaskListsByAccount: (accountId: string) => TaskListWithAccount[];
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      taskLists: [],
      isLoading: false,

      setAccounts: (accounts) => set({ accounts }),
      
      addAccount: (account) =>
        set((state) => {
          // Check if account already exists by email
          const existingIndex = state.accounts.findIndex(
            (a) => a.email === account.email
          );
          if (existingIndex !== -1) {
            // Update existing account with new tokens
            const newAccounts = [...state.accounts];
            newAccounts[existingIndex] = {
              ...newAccounts[existingIndex],
              ...account,
            };
            return { accounts: newAccounts };
          }
          return { accounts: [...state.accounts, account] };
        }),

      removeAccount: (accountId) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== accountId),
          taskLists: state.taskLists.filter((t) => t.accountId !== accountId),
        })),

      updateAccount: (accountId, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId ? { ...a, ...updates } : a
          ),
        })),

      setTaskLists: (taskLists) => set({ taskLists }),

      addTaskLists: (newTaskLists) =>
        set((state) => {
          // Remove existing lists for the same account, then add new ones
          const accountIds = new Set(newTaskLists.map((t) => t.accountId));
          const filteredLists = state.taskLists.filter(
            (t) => !accountIds.has(t.accountId)
          );
          return { taskLists: [...filteredLists, ...newTaskLists] };
        }),

      removeTaskListsByAccount: (accountId) =>
        set((state) => ({
          taskLists: state.taskLists.filter((t) => t.accountId !== accountId),
        })),

      setLoading: (isLoading) => set({ isLoading }),

      clearAll: () => set({ accounts: [], taskLists: [] }),

      getAccountById: (id) => {
        return get().accounts.find((a) => a.id === id);
      },

      getAccountByEmail: (email) => {
        return get().accounts.find((a) => a.email === email);
      },

      getTaskListsByAccount: (accountId) => {
        return get().taskLists.filter((t) => t.accountId === accountId);
      },
    }),
    {
      name: "gtm-accounts",
      // Store accounts with tokens for multi-account support
      partialize: (state) => ({
        accounts: state.accounts,
      }),
    }
  )
);
