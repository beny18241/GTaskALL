import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Account, TaskListWithAccount } from "@/types";

interface AccountsState {
  accounts: Account[];
  activeAccountId: string | null;
  taskLists: TaskListWithAccount[];
  isLoading: boolean;
  
  // Actions
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
  setActiveAccount: (accountId: string | null) => void;
  setTaskLists: (taskLists: TaskListWithAccount[]) => void;
  addTaskList: (taskList: TaskListWithAccount) => void;
  removeTaskList: (listId: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Getters
  getActiveAccount: () => Account | undefined;
  getAccountById: (id: string) => Account | undefined;
  getTaskListsByAccount: (accountId: string) => TaskListWithAccount[];
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      activeAccountId: null,
      taskLists: [],
      isLoading: false,

      setAccounts: (accounts) => set({ accounts }),
      
      addAccount: (account) =>
        set((state) => {
          // Check if account already exists
          const exists = state.accounts.some((a) => a.id === account.id);
          if (exists) {
            // Update existing account
            return {
              accounts: state.accounts.map((a) =>
                a.id === account.id ? account : a
              ),
            };
          }
          return { accounts: [...state.accounts, account] };
        }),

      removeAccount: (accountId) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== accountId),
          taskLists: state.taskLists.filter((t) => t.accountId !== accountId),
          activeAccountId:
            state.activeAccountId === accountId
              ? state.accounts[0]?.id ?? null
              : state.activeAccountId,
        })),

      updateAccount: (accountId, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId ? { ...a, ...updates } : a
          ),
        })),

      setActiveAccount: (accountId) => set({ activeAccountId: accountId }),

      setTaskLists: (taskLists) => set({ taskLists }),

      addTaskList: (taskList) =>
        set((state) => ({
          taskLists: [...state.taskLists, taskList],
        })),

      removeTaskList: (listId) =>
        set((state) => ({
          taskLists: state.taskLists.filter((t) => t.id !== listId),
        })),

      setLoading: (isLoading) => set({ isLoading }),

      getActiveAccount: () => {
        const state = get();
        return state.accounts.find((a) => a.id === state.activeAccountId);
      },

      getAccountById: (id) => {
        return get().accounts.find((a) => a.id === id);
      },

      getTaskListsByAccount: (accountId) => {
        return get().taskLists.filter((t) => t.accountId === accountId);
      },
    }),
    {
      name: "gtm-accounts",
      partialize: (state) => ({
        accounts: state.accounts.map((a) => ({
          ...a,
          // Don't persist tokens in localStorage for security
          accessToken: "",
          refreshToken: "",
        })),
        activeAccountId: state.activeAccountId,
      }),
    }
  )
);
