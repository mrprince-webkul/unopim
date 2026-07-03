// DevAnnounce theme engine — 5 handcrafted presets + a custom theme builder.
//
// A theme is a full set of CSS custom properties (HSL triplets) plus a mode
// (dark/light, which toggles the `.dark` class so the design system's
// dark-only utilities keep working). Themes are applied by writing the vars
// onto <html>, persisted in localStorage, and can be built, saved, renamed,
// exported, imported, and shared via a URL hash.

export type ThemeMode = "dark" | "light";
export type Tokens = Record<string, string>;

export interface ThemePreset {
  id: string;
  name: string;
  mode: ThemeMode;
  swatch: string; // a representative accent color for pickers (hex)
  tokens: Tokens;
}

const MIDNIGHT: Tokens = {
  "--background": "222 47% 4%",
  "--foreground": "210 40% 96%",
  "--card": "222 41% 6%",
  "--card-foreground": "210 40% 96%",
  "--popover": "223 45% 5%",
  "--popover-foreground": "210 40% 96%",
  "--primary": "187 94% 53%",
  "--primary-foreground": "222 47% 5%",
  "--secondary": "219 28% 12%",
  "--secondary-foreground": "210 30% 92%",
  "--muted": "220 28% 10%",
  "--muted-foreground": "217 14% 62%",
  "--accent": "219 30% 13%",
  "--accent-foreground": "187 90% 62%",
  "--destructive": "0 68% 52%",
  "--destructive-foreground": "0 0% 98%",
  "--border": "220 26% 13%",
  "--input": "220 26% 14%",
  "--ring": "187 94% 53%",
  "--radius": "0.875rem",
  "--chart-1": "187 94% 53%",
  "--chart-2": "160 84% 45%",
  "--chart-3": "210 98% 62%",
  "--chart-4": "174 72% 50%",
  "--chart-5": "217 14% 62%",
  "--glow": "187 94% 53%",
};

const ARCTIC: Tokens = {
  "--background": "210 45% 98%",
  "--foreground": "222 47% 8%",
  "--card": "0 0% 100%",
  "--card-foreground": "222 47% 8%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "222 47% 8%",
  "--primary": "194 90% 34%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "214 30% 92%",
  "--secondary-foreground": "222 40% 14%",
  "--muted": "214 30% 94%",
  "--muted-foreground": "219 15% 40%",
  "--accent": "192 85% 92%",
  "--accent-foreground": "194 90% 24%",
  "--destructive": "0 74% 46%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "215 25% 87%",
  "--input": "215 25% 87%",
  "--ring": "194 90% 34%",
  "--radius": "0.875rem",
  "--chart-1": "194 90% 38%",
  "--chart-2": "160 84% 33%",
  "--chart-3": "214 95% 50%",
  "--chart-4": "174 72% 38%",
  "--chart-5": "219 15% 50%",
  "--glow": "194 90% 45%",
};

// Recolour a dark base around a new hue for the accent-driven presets.
function darkVariant(over: Record<string, string>): Tokens {
  return { ...MIDNIGHT, ...over };
}

const EMERALD = darkVariant({
  "--background": "170 34% 4%",
  "--card": "168 30% 6%",
  "--popover": "168 32% 5%",
  "--primary": "158 84% 44%",
  "--primary-foreground": "160 60% 6%",
  "--accent": "165 30% 12%",
  "--accent-foreground": "158 84% 60%",
  "--secondary": "168 24% 12%",
  "--muted": "168 24% 10%",
  "--border": "167 24% 13%",
  "--input": "167 24% 14%",
  "--ring": "158 84% 44%",
  "--chart-1": "158 84% 46%",
  "--chart-2": "173 72% 48%",
  "--chart-3": "142 70% 48%",
  "--glow": "158 84% 46%",
});

const CYBER = darkVariant({
  "--background": "222 60% 4%",
  "--card": "221 52% 7%",
  "--popover": "221 55% 6%",
  "--primary": "214 96% 60%",
  "--primary-foreground": "222 60% 6%",
  "--accent": "218 40% 14%",
  "--accent-foreground": "214 96% 70%",
  "--secondary": "219 34% 13%",
  "--ring": "214 96% 60%",
  "--chart-1": "214 96% 62%",
  "--chart-2": "199 94% 56%",
  "--chart-3": "250 90% 66%",
  "--glow": "214 96% 60%",
});

const SUNSET = darkVariant({
  "--background": "260 30% 5%",
  "--card": "258 26% 8%",
  "--popover": "258 28% 7%",
  "--primary": "22 94% 56%",
  "--primary-foreground": "20 60% 8%",
  "--accent": "20 40% 14%",
  "--accent-foreground": "30 96% 66%",
  "--secondary": "258 20% 14%",
  "--muted": "258 20% 11%",
  "--border": "258 20% 15%",
  "--input": "258 20% 16%",
  "--ring": "22 94% 56%",
  "--chart-1": "22 94% 58%",
  "--chart-2": "340 82% 60%",
  "--chart-3": "45 94% 56%",
  "--glow": "22 94% 56%",
});

export const PRESETS: ThemePreset[] = [
  { id: "midnight", name: "Midnight", mode: "dark", swatch: "#22d3ee", tokens: MIDNIGHT },
  { id: "arctic", name: "Arctic", mode: "light", swatch: "#0891b2", tokens: ARCTIC },
  { id: "emerald", name: "Emerald", mode: "dark", swatch: "#10d18e", tokens: EMERALD },
  { id: "cyber", name: "Cyber Blue", mode: "dark", swatch: "#3b82f6", tokens: CYBER },
  { id: "sunset", name: "Sunset Orange", mode: "dark", swatch: "#f97316", tokens: SUNSET },
];

export const PRESET_MAP: Record<string, ThemePreset> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p]),
);

// --- Custom themes --------------------------------------------------------

export interface CustomTheme {
  id: string;
  name: string;
  base: string; // preset id to start from
  mode: ThemeMode;
  overrides: Tokens; // partial token overrides
}

const ACTIVE_KEY = "da_theme_active";
const CUSTOM_KEY = "da_theme_custom";

export function hexToHsl(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

export function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(/\s+/).map((v) => parseFloat(v));
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function resolveTokens(themeId: string, customs: CustomTheme[]): { tokens: Tokens; mode: ThemeMode } {
  const preset = PRESET_MAP[themeId];
  if (preset) return { tokens: preset.tokens, mode: preset.mode };
  const custom = customs.find((c) => c.id === themeId);
  if (custom) {
    const base = PRESET_MAP[custom.base] ?? PRESET_MAP.midnight;
    return { tokens: { ...base.tokens, ...custom.overrides }, mode: custom.mode };
  }
  return { tokens: PRESET_MAP.midnight.tokens, mode: "dark" };
}

export function applyTokens(tokens: Tokens, mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) el.style.setProperty(k, v);
  el.classList.toggle("dark", mode === "dark");
  el.style.colorScheme = mode;
}

export function loadActive(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}
export function saveActive(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(ACTIVE_KEY, id);
}
export function loadCustoms(): CustomTheme[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveCustoms(list: CustomTheme[]) {
  if (typeof window !== "undefined") localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}
