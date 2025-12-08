"use client";

import { TASK_LIST_COLORS } from "@/types";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

interface ListColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  size?: "sm" | "default";
}

export function ListColorPicker({
  value,
  onChange,
  size = "default",
}: ListColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "icon"}
          className={cn(
            "gap-1.5 h-8 w-8",
            size === "sm" && "h-6 w-6"
          )}
        >
          <div
            className={cn(
              "rounded-full border-2 border-white/50",
              size === "sm" ? "h-4 w-4" : "h-5 w-5"
            )}
            style={{ backgroundColor: value || "#64748b" }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="space-y-2">
          <p className="text-sm font-medium">Choose a color</p>
          <div className="grid grid-cols-6 gap-2">
            {TASK_LIST_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => onChange(color.value)}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                  value === color.value
                    ? "border-foreground ring-2 ring-foreground/20"
                    : "border-white/50 hover:border-foreground/50"
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
