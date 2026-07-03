"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Github, Image as ImageIcon, Linkedin, Loader2, Mail, Twitter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FOCUS_RING, Panel, PanelHeader } from "@/components/admin/panel";
import { Reveal, RevealItem, RevealStagger } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SiteSetting } from "@/lib/types";

const SHIMMER_BLOCK =
  "rounded-2xl bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

const THEME_OPTIONS = [
  { value: "midnight", label: "Midnight" },
  { value: "arctic", label: "Arctic" },
  { value: "emerald", label: "Emerald" },
  { value: "cyber", label: "Cyber Blue" },
  { value: "sunset", label: "Sunset Orange" },
];

const DEFAULTS: Record<string, string> = {
  BRAND_APP_NAME: "DevAnnounce",
  BRAND_BROWSER_TITLE: "DevAnnounce — Ship it. Announce it.",
  BRAND_TAGLINE: "Ship it. Announce it.",
  BRAND_HERO_TAGLINE: "A real-time changelog for everything the community builds.",
  BRAND_LOGO_URL: "",
  BRAND_LOGIN_LOGO_URL: "",
  BRAND_FAVICON_URL: "",
  BRAND_LOGIN_BG_URL: "",
  BRAND_FOOTER_TEXT: "Built for developers who ship.",
  BRAND_COPYRIGHT: "© DevAnnounce",
  BRAND_SOCIAL_GITHUB: "",
  BRAND_SOCIAL_TWITTER: "",
  BRAND_SOCIAL_LINKEDIN: "",
  BRAND_CONTACT_EMAIL: "",
  THEME_DEFAULT: "midnight",
  THEME_ALLOW_CUSTOM: "true",
};

const BRANDING_KEYS = Object.keys(DEFAULTS);

function findSetting(settings: SiteSetting[] | undefined, key: string): SiteSetting | undefined {
  return settings?.find((s) => s.key === key);
}

/** URL/path field with a small live thumbnail of the referenced asset. */
function AssetField({
  id,
  label,
  helpText,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  helpText: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-configured, arbitrary/unallowlisted URL
            <img
              src={value}
              alt=""
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("flex-1 font-mono text-[13px]", FOCUS_RING)}
        />
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}

function HeaderPreview({ appName, tagline, logoUrl }: { appName: string; tagline: string; logoUrl: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex h-12 items-center gap-2.5 border-b border-border bg-card px-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-configured, arbitrary/unallowlisted URL
          <img
            src={logoUrl}
            alt=""
            className="h-6 w-6 rounded-md object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 via-sky-500 to-emerald-500 font-display text-[11px] font-bold text-white">
            {(appName || "D").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="font-display text-[14px] font-bold tracking-tight text-foreground">
          {appName || "DevAnnounce"}
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Preview
        </span>
      </div>
      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground">{tagline || "Ship it. Announce it."}</p>
      </div>
    </div>
  );
}

export default function AdminBrandingPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["admin", "settings"], queryFn: adminApi.settings });

  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && values === null) {
      const map: Record<string, string> = {};
      for (const key of BRANDING_KEYS) {
        map[key] = findSetting(settings, key)?.value ?? DEFAULTS[key] ?? "";
      }
      setValues(map);
    }
  }, [settings, values]);

  function setField(key: string, value: string) {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!values) return;
    setSaving(true);
    try {
      await adminApi.updateSettings(values);
      toast.success("Branding updated — changes are live");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || values === null) {
    return (
      <div className="space-y-4">
        <div className={cn(SHIMMER_BLOCK, "h-40 w-full")} />
        <div className={cn(SHIMMER_BLOCK, "h-40 w-full")} />
        <div className={cn(SHIMMER_BLOCK, "h-56 w-full")} />
      </div>
    );
  }

  const v = values;

  return (
    <div className="space-y-6">
      <Reveal>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Branding</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-foreground">Brand identity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Controls the name, logo, and voice shown across the site. Saved changes apply immediately, with no
            redeploy required.
          </p>
        </div>
      </Reveal>

      <RevealStagger className="space-y-6">
        <RevealItem>
          <Panel>
            <PanelHeader
              eyebrow="Live preview"
              title="Header preview"
              description="How the app name and tagline read in the site header."
            />
            <div className="p-5">
              <HeaderPreview appName={v.BRAND_APP_NAME} tagline={v.BRAND_TAGLINE} logoUrl={v.BRAND_LOGO_URL} />
            </div>
          </Panel>
        </RevealItem>

        <RevealItem>
          <Panel>
            <PanelHeader
              eyebrow="Identity"
              title="Name & voice"
              description="The app name and taglines used across headers, browser tabs, and hero sections."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="app-name">App name</Label>
                <Input
                  id="app-name"
                  value={v.BRAND_APP_NAME}
                  onChange={(e) => setField("BRAND_APP_NAME", e.target.value)}
                  placeholder="DevAnnounce"
                  className={FOCUS_RING}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="browser-title">Browser tab title</Label>
                <Input
                  id="browser-title"
                  value={v.BRAND_BROWSER_TITLE}
                  onChange={(e) => setField("BRAND_BROWSER_TITLE", e.target.value)}
                  placeholder="DevAnnounce — Ship it. Announce it."
                  className={FOCUS_RING}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={v.BRAND_TAGLINE}
                  onChange={(e) => setField("BRAND_TAGLINE", e.target.value)}
                  placeholder="Ship it. Announce it."
                  className={FOCUS_RING}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hero-tagline">Hero tagline</Label>
                <Input
                  id="hero-tagline"
                  value={v.BRAND_HERO_TAGLINE}
                  onChange={(e) => setField("BRAND_HERO_TAGLINE", e.target.value)}
                  placeholder="A real-time changelog for everything the community builds."
                  className={FOCUS_RING}
                />
              </div>
            </div>
          </Panel>
        </RevealItem>

        <RevealItem>
          <Panel>
            <PanelHeader
              eyebrow="Assets"
              title="Logos & images"
              description="Paths or URLs to brand imagery. Upload files to storage first, then paste the URL here."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <AssetField
                id="logo-url"
                label="Header logo"
                helpText="Shown in the app sidebar and header."
                placeholder="/logo.svg"
                value={v.BRAND_LOGO_URL}
                onChange={(val) => setField("BRAND_LOGO_URL", val)}
              />
              <AssetField
                id="login-logo-url"
                label="Login screen logo"
                helpText="Shown above the login and register forms."
                placeholder="/logo.svg"
                value={v.BRAND_LOGIN_LOGO_URL}
                onChange={(val) => setField("BRAND_LOGIN_LOGO_URL", val)}
              />
              <AssetField
                id="favicon-url"
                label="Favicon"
                helpText="Browser tab icon."
                placeholder="/favicon.ico"
                value={v.BRAND_FAVICON_URL}
                onChange={(val) => setField("BRAND_FAVICON_URL", val)}
              />
              <AssetField
                id="login-bg-url"
                label="Login background"
                helpText="Background image for the login screen."
                placeholder="/login-bg.jpg"
                value={v.BRAND_LOGIN_BG_URL}
                onChange={(val) => setField("BRAND_LOGIN_BG_URL", val)}
              />
            </div>
          </Panel>
        </RevealItem>

        <RevealItem>
          <Panel>
            <PanelHeader eyebrow="Footer & legal" title="Footer" description="Text shown in the site footer." />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="footer-text">Footer text</Label>
                <Input
                  id="footer-text"
                  value={v.BRAND_FOOTER_TEXT}
                  onChange={(e) => setField("BRAND_FOOTER_TEXT", e.target.value)}
                  placeholder="Built for developers who ship."
                  className={FOCUS_RING}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="copyright">Copyright line</Label>
                <Input
                  id="copyright"
                  value={v.BRAND_COPYRIGHT}
                  onChange={(e) => setField("BRAND_COPYRIGHT", e.target.value)}
                  placeholder="© DevAnnounce"
                  className={FOCUS_RING}
                />
              </div>
            </div>
          </Panel>
        </RevealItem>

        <RevealItem>
          <Panel>
            <PanelHeader
              eyebrow="Social & contact"
              title="Links"
              description="Shown in the footer and other contact surfaces."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="social-github" className="inline-flex items-center gap-1.5">
                  <Github className="h-3.5 w-3.5" /> GitHub
                </Label>
                <Input
                  id="social-github"
                  value={v.BRAND_SOCIAL_GITHUB}
                  onChange={(e) => setField("BRAND_SOCIAL_GITHUB", e.target.value)}
                  placeholder="https://github.com/devannounce"
                  className={FOCUS_RING}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="social-twitter" className="inline-flex items-center gap-1.5">
                  <Twitter className="h-3.5 w-3.5" /> Twitter / X
                </Label>
                <Input
                  id="social-twitter"
                  value={v.BRAND_SOCIAL_TWITTER}
                  onChange={(e) => setField("BRAND_SOCIAL_TWITTER", e.target.value)}
                  placeholder="https://twitter.com/devannounce"
                  className={FOCUS_RING}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="social-linkedin" className="inline-flex items-center gap-1.5">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </Label>
                <Input
                  id="social-linkedin"
                  value={v.BRAND_SOCIAL_LINKEDIN}
                  onChange={(e) => setField("BRAND_SOCIAL_LINKEDIN", e.target.value)}
                  placeholder="https://linkedin.com/company/devannounce"
                  className={FOCUS_RING}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Contact email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={v.BRAND_CONTACT_EMAIL}
                  onChange={(e) => setField("BRAND_CONTACT_EMAIL", e.target.value)}
                  placeholder="hello@devannounce.dev"
                  className={FOCUS_RING}
                />
              </div>
            </div>
          </Panel>
        </RevealItem>

        <RevealItem>
          <Panel>
            <PanelHeader
              eyebrow="Theme defaults"
              title="Default theme"
              description="Sets the theme new visitors see before they pick their own."
            />
            <div className="space-y-5 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="theme-default">Default theme</Label>
                <Select value={v.THEME_DEFAULT} onValueChange={(val) => setField("THEME_DEFAULT", val)}>
                  <SelectTrigger id="theme-default" className={cn("max-w-[220px]", FOCUS_RING)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Allow custom themes</p>
                  <p className="text-xs text-muted-foreground">
                    Let signed-in users build and save a custom theme of their own.
                  </p>
                </div>
                <Switch
                  checked={v.THEME_ALLOW_CUSTOM === "true"}
                  onCheckedChange={(checked) => setField("THEME_ALLOW_CUSTOM", checked ? "true" : "false")}
                />
              </div>
            </div>
          </Panel>
        </RevealItem>
      </RevealStagger>

      <div className="glass sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-x border-t border-border px-5 py-4">
        <p className="max-w-md text-xs text-muted-foreground">
          Changes apply immediately across the site. No redeploy required.
        </p>
        <Button type="button" variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}
