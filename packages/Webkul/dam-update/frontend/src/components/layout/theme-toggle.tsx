"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThemeEngine } from "@/components/theme/theme-context";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleMode, mounted } = useThemeEngine();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className={cn("relative overflow-hidden", className)}
      onClick={toggleMode}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all duration-300",
          mounted && isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          mounted && isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0",
        )}
      />
    </Button>
  );
}
