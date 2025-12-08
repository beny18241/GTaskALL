"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Keyboard, Eye, Save, Check } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { quickAddShortcut, showLists, setQuickAddShortcut, setShowLists } = useSettingsStore();
  const [shortcutInput, setShortcutInput] = useState(quickAddShortcut);
  const [saveMessage, setSaveMessage] = useState("");

  const handleSaveShortcut = () => {
    if (shortcutInput.length === 1) {
      setQuickAddShortcut(shortcutInput.toLowerCase());
      setSaveMessage("Settings saved!");
      setTimeout(() => setSaveMessage(""), 3000);
    } else {
      setSaveMessage("Please enter a single character");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const key = e.key.toLowerCase();

    // Only allow single letter keys
    if (key.length === 1 && key.match(/[a-z]/i)) {
      setShortcutInput(key);
    }
  };

  return (
    <PageTransition>
      <div className="h-full flex flex-col p-6 overflow-auto">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <SettingsIcon className="h-6 w-6 text-gray-500" />
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Customize your GTaskALL experience
            </p>
          </div>

          {/* Keyboard Shortcuts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Customize keyboard shortcuts for quick actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quick-add">Quick Add Task</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Input
                      id="quick-add"
                      value={shortcutInput.toUpperCase()}
                      onKeyDown={handleKeyDown}
                      placeholder="Press a key..."
                      className="font-mono text-center text-lg uppercase"
                      maxLength={1}
                      readOnly
                    />
                  </div>
                  <Button onClick={handleSaveShortcut} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Press this key anywhere in the app to quickly add a task. Currently: <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{quickAddShortcut.toUpperCase()}</kbd>
                  </p>
                  {saveMessage && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {saveMessage}
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Other Shortcuts</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Default keyboard shortcuts
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Submit task in modal</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                      {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Close modal/panel</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* UI Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                UI Preferences
              </CardTitle>
              <CardDescription>
                Customize the appearance of your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Task Lists in Sidebar</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your Google Tasks lists in the sidebar navigation
                  </p>
                </div>
                <Switch
                  checked={showLists}
                  onCheckedChange={setShowLists}
                />
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Application information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Natural Language</span>
                <span className="font-medium">Enabled</span>
              </div>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                GTaskALL - A modern task management app for Google Tasks
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
