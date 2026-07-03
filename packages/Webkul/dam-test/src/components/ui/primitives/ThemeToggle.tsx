import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ui/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            className="inline-flex"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            className="inline-flex"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
