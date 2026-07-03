"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Palette } from "lucide-react";

import { ThemePanel } from "@/components/theme/theme-panel";
import { useThemeEngine } from "@/components/theme/theme-context";
import { Reveal } from "@/components/motion";
import type { CustomTheme } from "@/lib/themes";

function ShareImporter() {
  const params = useSearchParams();
  const { saveCustom } = useThemeEngine();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const code = params.get("theme");
    if (!code) return;
    done.current = true;
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(code))) as CustomTheme;
      if (parsed.overrides && parsed.base) {
        saveCustom({ ...parsed, id: `custom-${Date.now()}`, name: parsed.name || "Shared theme" });
        toast.success(`Applied shared theme "${parsed.name || "theme"}"`);
        window.history.replaceState({}, "", "/appearance");
      }
    } catch {
      toast.error("That shared theme link is invalid");
    }
  }, [params, saveCustom]);

  return null;
}

export default function AppearancePage() {
  return (
    <div className="container max-w-5xl py-8">
      <Suspense fallback={null}>
        <ShareImporter />
      </Suspense>
      <Reveal>
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.08] text-primary">
            <Palette className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Personalize</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Appearance
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a curated theme, or build, save, export and share your own.
            </p>
          </div>
        </div>
      </Reveal>
      <ThemePanel />
    </div>
  );
}
