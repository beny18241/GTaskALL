import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  // Keyboard shortcuts
  quickAddShortcut: string;

  // UI preferences
  showLists: boolean;

  // Actions
  setQuickAddShortcut: (shortcut: string) => void;
  setShowLists: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      quickAddShortcut: "q",
      showLists: true,

      // Actions
      setQuickAddShortcut: (shortcut: string) => set({ quickAddShortcut: shortcut }),
      setShowLists: (show: boolean) => set({ showLists: show }),
    }),
    {
      name: "gtaskall-settings",
    }
  )
);
