"use client";

import { signIn } from "next-auth/react";
import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const handleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <CheckSquare className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Google Tasks Manager</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Google Tasks with a beautiful, Todoist-like interface
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 space-y-4">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your Google account to access your tasks
            </p>
          </div>

          <Button
            onClick={handleSignIn}
            className="w-full h-12 text-base gap-3"
            size="lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            We&apos;ll request access to your Google Tasks to sync your data
          </p>
        </div>

        <div className="mt-8 text-center">
          <h3 className="font-semibold mb-4">Features</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-card">
              <p className="font-medium">📅 Today View</p>
              <p className="text-muted-foreground text-xs">
                See today&apos;s tasks at a glance
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card">
              <p className="font-medium">📆 Upcoming</p>
              <p className="text-muted-foreground text-xs">
                Plan your week ahead
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card">
              <p className="font-medium">🎯 Priorities</p>
              <p className="text-muted-foreground text-xs">
                P1-P4 priority levels
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card">
              <p className="font-medium">☁️ Sync</p>
              <p className="text-muted-foreground text-xs">
                Real-time Google sync
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
