"use client";

import { Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Priority, PRIORITY_COLORS, PRIORITY_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface PrioritySelectProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  size?: "sm" | "default";
}

export function PrioritySelect({
  value,
  onChange,
  size = "default",
}: PrioritySelectProps) {
  const priorities: Priority[] = [1, 2, 3, 4];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "default"}
          className={cn("gap-1.5", PRIORITY_COLORS[value])}
        >
          <Flag className={cn("h-4 w-4", size === "sm" && "h-3 w-3")} />
          {size !== "sm" && <span className="text-xs">P{value}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {priorities.map((priority) => (
          <DropdownMenuItem
            key={priority}
            onClick={() => onChange(priority)}
            className={cn(
              "flex items-center gap-2",
              value === priority && "bg-accent"
            )}
          >
            <Flag className={cn("h-4 w-4", PRIORITY_COLORS[priority])} />
            <span>{PRIORITY_LABELS[priority]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
