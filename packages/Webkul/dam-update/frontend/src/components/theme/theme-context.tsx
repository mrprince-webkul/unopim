"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  applyTokens,
  CustomTheme,
  loadActive,
  loadCustoms,
  PRESETS,
  resolveTokens,
  saveActive,
  saveCustoms,
} from "@/lib/themes";

interface ThemeEngine {
  activeId: string;
  customs: CustomTheme[];
  presets: typeof PRESETS;
  mounted: boolean;
  setTheme: (id: string) => void;
  toggleMode: () => void;
  saveCustom: (theme: CustomTheme) => void;
  deleteCustom: (id: string) => void;
  isDark: boolean;
}

const Ctx = createContext<ThemeEngine | null>(null);

export function ThemeEngineProvider({
  children,
  defaultTheme = "midnight",
}: {
  children: ReactNode;
  defaultTheme?: string;
}) {
  const [activeId, setActiveId] = useState(defaultTheme);
  const [customs, setCustoms] = useState<CustomTheme[]>([]);
  const [mounted, setMounted] = useState(false);

  // First paint: hydrate stored preferences and apply them.
  useEffect(() => {
    const storedCustoms = loadCustoms();
    const stored = loadActive() || defaultTheme;
    setCustoms(storedCustoms);
    setActiveId(stored);
    const { tokens, mode } = resolveTokens(stored, storedCustoms);
    applyTokens(tokens, mode);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = useCallback((id: string, list: CustomTheme[]) => {
    const { tokens, mode } = resolveTokens(id, list);
    applyTokens(tokens, mode);
  }, []);

  const setTheme = useCallback(
    (id: string) => {
      setActiveId(id);
      saveActive(id);
      apply(id, customs);
    },
    [apply, customs],
  );

  const toggleMode = useCallback(() => {
    const { mode } = resolveTokens(activeId, customs);
    setTheme(mode === "dark" ? "arctic" : "midnight");
  }, [activeId, customs, setTheme]);

  const saveCustom = useCallback(
    (theme: CustomTheme) => {
      setCustoms((prev) => {
        const next = prev.some((c) => c.id === theme.id)
          ? prev.map((c) => (c.id === theme.id ? theme : c))
          : [...prev, theme];
        saveCustoms(next);
        // apply immediately if it's the active/edited theme
        const { tokens, mode } = resolveTokens(theme.id, next);
        applyTokens(tokens, mode);
        saveActive(theme.id);
        setActiveId(theme.id);
        return next;
      });
    },
    [],
  );

  const deleteCustom = useCallback(
    (id: string) => {
      setCustoms((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveCustoms(next);
        return next;
      });
      if (activeId === id) setTheme("midnight");
    },
    [activeId, setTheme],
  );

  const isDark = useMemo(() => resolveTokens(activeId, customs).mode === "dark", [activeId, customs]);

  const value: ThemeEngine = {
    activeId,
    customs,
    presets: PRESETS,
    mounted,
    setTheme,
    toggleMode,
    saveCustom,
    deleteCustom,
    isDark,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useThemeEngine(): ThemeEngine {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useThemeEngine must be used within ThemeEngineProvider");
  return ctx;
}
