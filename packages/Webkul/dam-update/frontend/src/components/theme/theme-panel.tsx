"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Palette, Plus, Share2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useThemeEngine } from "@/components/theme/theme-context";
import {
  applyTokens,
  CustomTheme,
  hexToHsl,
  hslToHex,
  PRESET_MAP,
  resolveTokens,
  type Tokens,
} from "@/lib/themes";

const FONTS: { label: string; stack: string }[] = [
  { label: "Default (Geist)", stack: "" },
  { label: "System UI", stack: "ui-sans-serif, system-ui, -apple-system, sans-serif" },
  { label: "Rounded", stack: "'Nunito', ui-rounded, 'Segoe UI', sans-serif" },
  { label: "Mono-forward", stack: "var(--font-geist-mono), ui-monospace, monospace" },
];

interface BuilderState {
  name: string;
  base: string;
  primary: string;
  accent: string;
  background: string;
  card: string;
  radius: number;
  font: string;
}

function tokensFromBuilder(s: BuilderState): Tokens {
  const t: Tokens = {
    "--primary": hexToHsl(s.primary),
    "--ring": hexToHsl(s.primary),
    "--glow": hexToHsl(s.primary),
    "--accent-foreground": hexToHsl(s.primary),
    "--accent": hexToHsl(s.accent),
    "--background": hexToHsl(s.background),
    "--card": hexToHsl(s.card),
    "--popover": hexToHsl(s.card),
    "--radius": `${s.radius}rem`,
  };
  if (s.font) t["--font-geist"] = s.font;
  return t;
}

export function ThemePanel() {
  const { activeId, customs, presets, setTheme, saveCustom, deleteCustom } = useThemeEngine();
  const [building, setBuilding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const defaultBuilder = useCallback((): BuilderState => {
    const base = PRESET_MAP[activeId] ? activeId : "midnight";
    const t = PRESET_MAP[base].tokens;
    return {
      name: "My theme",
      base,
      primary: hslToHex(t["--primary"]),
      accent: hslToHex(t["--accent"]),
      background: hslToHex(t["--background"]),
      card: hslToHex(t["--card"]),
      radius: parseFloat(t["--radius"]),
      font: "",
    };
  }, [activeId]);

  const [builder, setBuilder] = useState<BuilderState>(defaultBuilder);

  // Live-preview the builder while it's open.
  useEffect(() => {
    if (!building) return;
    const base = PRESET_MAP[builder.base] ?? PRESET_MAP.midnight;
    applyTokens({ ...base.tokens, ...tokensFromBuilder(builder) }, base.mode);
  }, [building, builder]);

  // Restore the selected theme when the builder closes without saving.
  const closeBuilder = useCallback(() => {
    setBuilding(false);
    const { tokens, mode } = resolveTokens(activeId, customs);
    applyTokens(tokens, mode);
  }, [activeId, customs]);

  const startBuilder = useCallback(() => {
    setBuilder(defaultBuilder());
    setBuilding(true);
  }, [defaultBuilder]);

  function persist() {
    const base = PRESET_MAP[builder.base] ?? PRESET_MAP.midnight;
    const theme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: builder.name.trim() || "Custom theme",
      base: builder.base,
      mode: base.mode,
      overrides: tokensFromBuilder(builder),
    };
    saveCustom(theme);
    setBuilding(false);
    toast.success(`Saved "${theme.name}" — it's now active`);
  }

  function exportTheme(theme: CustomTheme) {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${theme.name.replace(/\s+/g, "-").toLowerCase()}.datheme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function shareTheme(theme: CustomTheme) {
    try {
      const code = btoa(encodeURIComponent(JSON.stringify(theme)));
      const url = `${window.location.origin}/appearance?theme=${code}`;
      navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Could not create share link");
    }
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as CustomTheme;
        if (!parsed.overrides || !parsed.base) throw new Error("bad");
        saveCustom({ ...parsed, id: `custom-${Date.now()}`, name: parsed.name || "Imported theme" });
        toast.success(`Imported "${parsed.name || "theme"}"`);
      } catch {
        toast.error("That file isn't a valid theme export");
      }
    });
    e.target.value = "";
  }

  const allActive = useMemo(() => activeId, [activeId]);

  return (
    <div className="space-y-8">
      {/* Preset themes */}
      <section>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Curated</p>
        <h3 className="mt-1 font-display text-lg font-semibold text-foreground">Themes</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {presets.map((p) => {
            const active = allActive === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setTheme(p.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5",
                  active ? "border-primary shadow-[0_0_0_1px_hsl(var(--glow)/0.4),0_12px_40px_-16px_hsl(var(--glow)/0.5)]" : "border-border hover:border-primary/40",
                )}
              >
                <div
                  className="mb-3 h-16 w-full rounded-lg border border-black/20"
                  style={{
                    background: `hsl(${p.tokens["--background"]})`,
                  }}
                >
                  <div className="flex h-full items-end gap-1 p-2">
                    <span className="h-2 w-8 rounded-full" style={{ background: `hsl(${p.tokens["--primary"]})` }} />
                    <span className="h-2 w-4 rounded-full" style={{ background: `hsl(${p.tokens["--muted-foreground"]})` }} />
                    <span className="h-2 w-3 rounded-full" style={{ background: `hsl(${p.tokens["--chart-2"]})` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  {active ? <Check className="h-4 w-4 text-primary" /> : null}
                </div>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {p.mode}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Saved custom themes */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Yours</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-foreground">Custom themes</h3>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
            <Button variant="gradient" size="sm" onClick={startBuilder}>
              <Plus className="h-3.5 w-3.5" /> New theme
            </Button>
          </div>
        </div>

        {customs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No custom themes yet. Build one from any preset with the color studio.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customs.map((c) => {
              const active = allActive === c.id;
              const bg = c.overrides["--background"] ?? PRESET_MAP[c.base]?.tokens["--background"];
              const primary = c.overrides["--primary"] ?? PRESET_MAP[c.base]?.tokens["--primary"];
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-2xl border p-3 transition-colors",
                    active ? "border-primary" : "border-border",
                  )}
                >
                  <button className="flex w-full items-center gap-3 text-left" onClick={() => setTheme(c.id)}>
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black/20"
                      style={{ background: `hsl(${bg})` }}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ background: `hsl(${primary})` }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {active ? "Active" : `from ${PRESET_MAP[c.base]?.name ?? c.base}`}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => shareTheme(c)}>
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => exportTheme(c)}>
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => deleteCustom(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Builder */}
      {building ? (
        <section className="rounded-2xl border border-primary/30 bg-card p-5">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Color studio</h3>
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
              live preview
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Theme name</Label>
              <Input value={builder.name} onChange={(e) => setBuilder((b) => ({ ...b, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Base</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={builder.base}
                onChange={(e) => {
                  const base = PRESET_MAP[e.target.value];
                  setBuilder((b) => ({
                    ...b,
                    base: e.target.value,
                    primary: hslToHex(base.tokens["--primary"]),
                    accent: hslToHex(base.tokens["--accent"]),
                    background: hslToHex(base.tokens["--background"]),
                    card: hslToHex(base.tokens["--card"]),
                    radius: parseFloat(base.tokens["--radius"]),
                  }));
                }}
              >
                {Object.values(PRESET_MAP).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mode})
                  </option>
                ))}
              </select>
            </div>

            {(
              [
                ["Primary", "primary"],
                ["Accent", "accent"],
                ["Background", "background"],
                ["Surface / card", "card"],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={builder[key]}
                    onChange={(e) => setBuilder((b) => ({ ...b, [key]: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent"
                  />
                  <Input
                    value={builder[key]}
                    onChange={(e) => setBuilder((b) => ({ ...b, [key]: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>Corner radius — {builder.radius.toFixed(3)}rem</Label>
              <input
                type="range"
                min={0}
                max={1.75}
                step={0.025}
                value={builder.radius}
                onChange={(e) => setBuilder((b) => ({ ...b, radius: parseFloat(e.target.value) }))}
                className="w-full accent-[hsl(var(--primary))]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Font family</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={builder.font}
                onChange={(e) => setBuilder((b) => ({ ...b, font: e.target.value }))}
              >
                {FONTS.map((f) => (
                  <option key={f.label} value={f.stack}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <Button variant="gradient" size="sm" onClick={persist}>
              <Check className="h-3.5 w-3.5" /> Save & apply
            </Button>
            <Button variant="ghost" size="sm" onClick={closeBuilder}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
