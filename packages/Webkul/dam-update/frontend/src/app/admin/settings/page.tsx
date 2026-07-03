"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, Eye, EyeOff, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FOCUS_RING, Panel, PanelHeader } from "@/components/admin/panel";
import { Reveal } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SiteSetting } from "@/lib/types";

const SHIMMER_BLOCK =
  "rounded-2xl bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

function findSetting(settings: SiteSetting[] | undefined, key: string): SiteSetting | undefined {
  return settings?.find((s) => s.key === key);
}

/** Masked-friendly password/secret input with a reveal toggle. */
function SecretField({
  label,
  placeholder,
  helpText,
  value,
  revealed,
  onToggleReveal,
  onChange,
}: {
  label: string;
  placeholder: string;
  helpText: string;
  value: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("pr-10 font-mono text-[13px]", FOCUS_RING)}
        />
        <button
          type="button"
          onClick={onToggleReveal}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={revealed ? "Hide value" : "Show value"}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// General

const GENERAL_KEYS = [
  "CONFIG_TIMEZONE",
  "CONFIG_DATE_FORMAT",
  "CONFIG_UPLOAD_MAX_MB",
  "CONFIG_STORAGE_PROVIDER",
  "CONFIG_MAINTENANCE_MODE",
  "CONFIG_MAINTENANCE_MESSAGE",
];

const GENERAL_DEFAULTS: Record<string, string> = {
  CONFIG_TIMEZONE: "UTC",
  CONFIG_DATE_FORMAT: "YYYY-MM-DD",
  CONFIG_UPLOAD_MAX_MB: "25",
  CONFIG_STORAGE_PROVIDER: "local",
  CONFIG_MAINTENANCE_MODE: "false",
  CONFIG_MAINTENANCE_MESSAGE: "We will be back shortly. Thanks for your patience.",
};

function GeneralSection({ settings }: { settings: SiteSetting[] }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (values === null) {
      const map: Record<string, string> = {};
      for (const key of GENERAL_KEYS) {
        map[key] = findSetting(settings, key)?.value ?? GENERAL_DEFAULTS[key] ?? "";
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
      toast.success("General settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!values) return <div className={cn(SHIMMER_BLOCK, "h-64 w-full")} />;
  const v = values;
  const maintenanceOn = v.CONFIG_MAINTENANCE_MODE === "true";

  return (
    <div className="space-y-6">
      {maintenanceOn ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Maintenance mode is on</p>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">
              Visitors see the maintenance message below instead of the site. Turn this off to restore access.
            </p>
          </div>
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          eyebrow="General"
          title="Locale & storage"
          description="Timezone, date formatting, uploads, and the storage backend."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-timezone">Timezone</Label>
            <Input
              id="cfg-timezone"
              value={v.CONFIG_TIMEZONE}
              onChange={(e) => setField("CONFIG_TIMEZONE", e.target.value)}
              placeholder="UTC"
              className={FOCUS_RING}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-date-format">Date format</Label>
            <Input
              id="cfg-date-format"
              value={v.CONFIG_DATE_FORMAT}
              onChange={(e) => setField("CONFIG_DATE_FORMAT", e.target.value)}
              placeholder="YYYY-MM-DD"
              className={FOCUS_RING}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-upload-max">Max upload size (MB)</Label>
            <Input
              id="cfg-upload-max"
              type="number"
              min={1}
              value={v.CONFIG_UPLOAD_MAX_MB}
              onChange={(e) => setField("CONFIG_UPLOAD_MAX_MB", e.target.value)}
              className={cn("max-w-[160px]", FOCUS_RING)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-storage-provider">Storage provider</Label>
            <Select
              value={v.CONFIG_STORAGE_PROVIDER}
              onValueChange={(val) => setField("CONFIG_STORAGE_PROVIDER", val)}
            >
              <SelectTrigger id="cfg-storage-provider" className={cn("max-w-[220px]", FOCUS_RING)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local disk</SelectItem>
                <SelectItem value="minio">MinIO</SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          eyebrow="Maintenance"
          title="Maintenance mode"
          description="Take the site offline for visitors while you make changes. Admins keep full access."
        />
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Maintenance mode</p>
              <p className="text-xs text-muted-foreground">
                Non-admins see the message below instead of the site.
              </p>
            </div>
            <Switch
              checked={maintenanceOn}
              onCheckedChange={(checked) => setField("CONFIG_MAINTENANCE_MODE", checked ? "true" : "false")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-maintenance-message">Maintenance message</Label>
            <Textarea
              id="cfg-maintenance-message"
              value={v.CONFIG_MAINTENANCE_MESSAGE}
              onChange={(e) => setField("CONFIG_MAINTENANCE_MESSAGE", e.target.value)}
              placeholder="We will be back shortly. Thanks for your patience."
              className={FOCUS_RING}
            />
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="button" variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mail (SMTP)

const MAIL_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_USE_TLS"];

const MAIL_DEFAULTS: Record<string, string> = {
  SMTP_HOST: "",
  SMTP_PORT: "587",
  SMTP_USER: "",
  SMTP_PASSWORD: "",
  SMTP_FROM: "",
  SMTP_USE_TLS: "true",
};

function MailSection({ settings }: { settings: SiteSetting[] }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (values === null) {
      const map: Record<string, string> = {};
      for (const key of MAIL_KEYS) {
        map[key] = findSetting(settings, key)?.value ?? MAIL_DEFAULTS[key] ?? "";
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
      toast.success("Mail settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!values) return <div className={cn(SHIMMER_BLOCK, "h-64 w-full")} />;
  const v = values;

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          eyebrow="Mail"
          title="SMTP"
          description="Leave host blank to log emails to stdout instead of sending them."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="smtp-host">SMTP host</Label>
            <Input
              id="smtp-host"
              value={v.SMTP_HOST}
              onChange={(e) => setField("SMTP_HOST", e.target.value)}
              placeholder="smtp.sendgrid.net"
              className={cn("font-mono text-[13px]", FOCUS_RING)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-port">Port</Label>
            <Input
              id="smtp-port"
              type="number"
              min={1}
              value={v.SMTP_PORT}
              onChange={(e) => setField("SMTP_PORT", e.target.value)}
              placeholder="587"
              className={cn("max-w-[160px]", FOCUS_RING)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-user">Username</Label>
            <Input
              id="smtp-user"
              value={v.SMTP_USER}
              onChange={(e) => setField("SMTP_USER", e.target.value)}
              placeholder="apikey"
              className={FOCUS_RING}
            />
          </div>
          <SecretField
            label="Password"
            placeholder={v.SMTP_PASSWORD || "Not set"}
            helpText="Masked values stay unchanged unless you type a new password."
            value={v.SMTP_PASSWORD}
            revealed={passwordRevealed}
            onToggleReveal={() => setPasswordRevealed((r) => !r)}
            onChange={(val) => setField("SMTP_PASSWORD", val)}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="smtp-from">From address</Label>
            <Input
              id="smtp-from"
              value={v.SMTP_FROM}
              onChange={(e) => setField("SMTP_FROM", e.target.value)}
              placeholder="DevAnnounce <noreply@devannounce.dev>"
              className={FOCUS_RING}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Use TLS</p>
            <p className="text-xs text-muted-foreground">Encrypt the connection to the SMTP server.</p>
          </div>
          <Switch
            checked={v.SMTP_USE_TLS === "true"}
            onCheckedChange={(checked) => setField("SMTP_USE_TLS", checked ? "true" : "false")}
          />
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="button" variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// News Engine

const NEWS_KEYS = [
  "NEWS_FETCH_ENABLED",
  "NEWS_FETCH_INTERVAL",
  "NEWS_MAX_ARTICLES",
  "AI_SUMMARIZATION_ENABLED",
  "NEWS_AI_TAGS_ENABLED",
  "NEWS_EXCLUDE_CATEGORIES",
  "NEWS_PROMPT_TEMPLATE",
  "NEWS_API_KEY",
  "ANTHROPIC_API_KEY",
];

const NEWS_DEFAULTS: Record<string, string> = {
  NEWS_FETCH_ENABLED: "true",
  NEWS_FETCH_INTERVAL: "daily",
  NEWS_MAX_ARTICLES: "10",
  AI_SUMMARIZATION_ENABLED: "true",
  NEWS_AI_TAGS_ENABLED: "true",
  NEWS_EXCLUDE_CATEGORIES: "",
  NEWS_PROMPT_TEMPLATE:
    "Summarize this article in 2-3 sentences for a developer audience.\n\nTitle: {title}\n\nContent: {content}",
  NEWS_SOURCES: "[]",
  NEWS_API_KEY: "",
  ANTHROPIC_API_KEY: "",
};

interface NewsSource {
  name: string;
  url: string;
  enabled: boolean;
}

function parseNewsSources(raw: string | undefined): NewsSource[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const obj = (item ?? {}) as Record<string, unknown>;
      return {
        name: typeof obj.name === "string" ? obj.name : "",
        url: typeof obj.url === "string" ? obj.url : "",
        enabled: obj.enabled !== false,
      };
    });
  } catch {
    return [];
  }
}

function NewsEngineSection({ settings }: { settings: SiteSetting[] }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (values === null) {
      const map: Record<string, string> = {};
      for (const key of NEWS_KEYS) {
        map[key] = findSetting(settings, key)?.value ?? NEWS_DEFAULTS[key] ?? "";
      }
      setValues(map);
      setSources(parseNewsSources(findSetting(settings, "NEWS_SOURCES")?.value ?? NEWS_DEFAULTS.NEWS_SOURCES));
    }
  }, [settings, values]);

  function setField(key: string, value: string) {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateSource(index: number, patch: Partial<NewsSource>) {
    setSources((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSource() {
    setSources((prev) => [...prev, { name: "", url: "", enabled: true }]);
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!values) return;
    setSaving(true);
    try {
      await adminApi.updateSettings({ ...values, NEWS_SOURCES: JSON.stringify(sources) });
      toast.success("News engine settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!values) return <div className={cn(SHIMMER_BLOCK, "h-64 w-full")} />;
  const v = values;

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          eyebrow="Fetching"
          title="Fetch schedule"
          description="Controls the automated news import job."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-foreground">Automatic fetch</p>
              <p className="text-xs text-muted-foreground">
                Pull new articles from configured sources on a schedule.
              </p>
            </div>
            <Switch
              checked={v.NEWS_FETCH_ENABLED === "true"}
              onCheckedChange={(checked) => setField("NEWS_FETCH_ENABLED", checked ? "true" : "false")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="news-interval">Fetch interval</Label>
            <Select value={v.NEWS_FETCH_INTERVAL} onValueChange={(val) => setField("NEWS_FETCH_INTERVAL", val)}>
              <SelectTrigger id="news-interval" className={FOCUS_RING}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="6h">Every 6 hours</SelectItem>
                <SelectItem value="12h">Every 12 hours</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="news-max-articles">Max articles per run</Label>
            <Input
              id="news-max-articles"
              type="number"
              min={1}
              max={50}
              value={v.NEWS_MAX_ARTICLES}
              onChange={(e) => setField("NEWS_MAX_ARTICLES", e.target.value)}
              className={FOCUS_RING}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="news-exclude">Excluded categories</Label>
            <Input
              id="news-exclude"
              value={v.NEWS_EXCLUDE_CATEGORIES}
              onChange={(e) => setField("NEWS_EXCLUDE_CATEGORIES", e.target.value)}
              placeholder="gaming, sports"
              className={FOCUS_RING}
            />
            <p className="text-xs text-muted-foreground">Comma-separated category names to skip during import.</p>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          eyebrow="AI enrichment"
          title="Summaries & tags"
          description="Uses the active AI provider to enrich imported articles."
        />
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">AI summarization</p>
              <p className="text-xs text-muted-foreground">Write a short summary for each imported article.</p>
            </div>
            <Switch
              checked={v.AI_SUMMARIZATION_ENABLED === "true"}
              onCheckedChange={(checked) => setField("AI_SUMMARIZATION_ENABLED", checked ? "true" : "false")}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">AI tagging</p>
              <p className="text-xs text-muted-foreground">Automatically tag articles by topic.</p>
            </div>
            <Switch
              checked={v.NEWS_AI_TAGS_ENABLED === "true"}
              onCheckedChange={(checked) => setField("NEWS_AI_TAGS_ENABLED", checked ? "true" : "false")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="news-prompt">Summarization prompt</Label>
            <Textarea
              id="news-prompt"
              value={v.NEWS_PROMPT_TEMPLATE}
              onChange={(e) => setField("NEWS_PROMPT_TEMPLATE", e.target.value)}
              className={cn("min-h-[120px] font-mono text-[12.5px]", FOCUS_RING)}
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="rounded bg-secondary px-1 py-0.5 font-mono">{"{title}"}</code> and{" "}
              <code className="rounded bg-secondary px-1 py-0.5 font-mono">{"{content}"}</code> as placeholders.
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          eyebrow="Sources"
          title="News sources"
          description="Feeds polled by the fetch job."
          action={
            <Button type="button" size="sm" variant="outline" onClick={addSource}>
              <Plus className="h-4 w-4" />
              Add source
            </Button>
          }
        />
        <div className="divide-y divide-border">
          {sources.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">No sources configured yet.</p>
          ) : (
            sources.map((source, index) => (
              <div key={index} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Input
                  value={source.name}
                  onChange={(e) => updateSource(index, { name: e.target.value })}
                  placeholder="Source name"
                  aria-label="Source name"
                  className={cn("sm:max-w-[180px]", FOCUS_RING)}
                />
                <Input
                  value={source.url}
                  onChange={(e) => updateSource(index, { url: e.target.value })}
                  placeholder="https://example.com/feed.xml"
                  aria-label="Source URL"
                  className={cn("flex-1 font-mono text-[13px]", FOCUS_RING)}
                />
                <div className="flex items-center justify-between gap-3 sm:justify-start">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.enabled}
                      onCheckedChange={(checked) => updateSource(index, { enabled: checked })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {source.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeSource(index)}
                    aria-label="Remove source"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="API keys" title="Keys" description="Credentials used by the legacy news pipeline." />
        <div className="space-y-5 p-5">
          <SecretField
            label="News API key"
            placeholder={v.NEWS_API_KEY || "Not set"}
            helpText="Optional key for additional article sources via newsapi.org."
            value={v.NEWS_API_KEY}
            revealed={Boolean(revealed.NEWS_API_KEY)}
            onToggleReveal={() => toggleReveal("NEWS_API_KEY")}
            onChange={(val) => setField("NEWS_API_KEY", val)}
          />
          <SecretField
            label="Fallback Claude key"
            placeholder={v.ANTHROPIC_API_KEY || "Not set"}
            helpText="Used only when no provider is configured in the AI Providers engine."
            value={v.ANTHROPIC_API_KEY}
            revealed={Boolean(revealed.ANTHROPIC_API_KEY)}
            onToggleReveal={() => toggleReveal("ANTHROPIC_API_KEY")}
            onChange={(val) => setField("ANTHROPIC_API_KEY", val)}
          />
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p>
              These keys are a fallback for the legacy pipeline. For multi-provider routing, model selection, and
              per-provider usage limits, use the{" "}
              <Link href="/admin/ai" className="font-medium text-primary underline-offset-4 hover:underline">
                AI Providers engine
              </Link>
              .
            </p>
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="button" variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  const {
    data: settings,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["admin", "settings"], queryFn: adminApi.settings });

  return (
    <div className="space-y-6">
      <Reveal>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Configuration</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-foreground">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure platform behavior, outbound mail, and the news pipeline. Each tab saves independently.
          </p>
        </div>
      </Reveal>

      {isLoading ? (
        <div className="space-y-4">
          <div className={cn(SHIMMER_BLOCK, "h-9 w-64")} />
          <div className={cn(SHIMMER_BLOCK, "h-64 w-full")} />
        </div>
      ) : isError || !settings ? (
        <Panel>
          <div className="py-10 text-center text-sm text-muted-foreground">Could not load settings.</div>
        </Panel>
      ) : (
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="mail">Mail (SMTP)</TabsTrigger>
            <TabsTrigger value="news">News Engine</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <GeneralSection settings={settings} />
          </TabsContent>
          <TabsContent value="mail">
            <MailSection settings={settings} />
          </TabsContent>
          <TabsContent value="news">
            <NewsEngineSection settings={settings} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
