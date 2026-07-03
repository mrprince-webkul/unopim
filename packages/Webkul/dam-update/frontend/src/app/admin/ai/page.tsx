"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Pencil, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FOCUS_RING, Panel, PanelHeader } from "@/components/admin/panel";
import { Reveal, RevealItem, RevealStagger } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AIProvider, AIStatus } from "@/lib/types";

const SHIMMER_BLOCK =
  "rounded-2xl bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

type ProviderType = AIProvider["provider_type"];

const PROVIDER_TYPE_META: Record<ProviderType, { label: string; description: string; badgeClass: string }> = {
  openai_compatible: {
    label: "OpenAI-compatible",
    description: "Any OpenAI-style Chat Completions API — OpenAI, Groq, Together, local llama.cpp servers, etc.",
    badgeClass: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  },
  anthropic: {
    label: "Anthropic",
    description: "Claude models via Anthropic's native Messages API.",
    badgeClass: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  },
  gemini: {
    label: "Gemini",
    description: "Google Gemini models via the Generative Language API.",
    badgeClass: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  },
};

function TypeBadge({ type }: { type: ProviderType }) {
  const meta = PROVIDER_TYPE_META[type];
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-wider", meta.badgeClass)}>
      {meta.label}
    </Badge>
  );
}

/** Password field with a masked-value placeholder and a reveal toggle, matching the Settings page pattern. */
function ApiKeyField({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("pr-10 font-mono text-[13px]", FOCUS_RING)}
      />
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={revealed ? "Hide value" : "Show value"}
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

interface ProviderFormState {
  api_key: string;
  base_url: string;
  model: string;
  temperature: string;
  max_tokens: string;
  timeout: string;
  daily_limit: string;
}

function initialForm(p: AIProvider): ProviderFormState {
  return {
    api_key: "",
    base_url: p.base_url ?? "",
    model: p.model ?? "",
    temperature: String(p.temperature ?? 0),
    max_tokens: String(p.max_tokens ?? 0),
    timeout: String(p.timeout ?? 0),
    daily_limit: String(p.daily_limit ?? 0),
  };
}

function ProviderEditDialog({ provider, onSaved }: { provider: AIProvider; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProviderFormState>(() => initialForm(provider));

  useEffect(() => {
    if (open) setForm(initialForm(provider));
  }, [open, provider]);

  function setField<K extends keyof ProviderFormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const body: Partial<AIProvider> = {
        base_url: form.base_url,
        model: form.model,
        temperature: Number(form.temperature),
        max_tokens: Number(form.max_tokens),
        timeout: Number(form.timeout),
        daily_limit: Number(form.daily_limit),
      };
      if (form.api_key.trim()) body.api_key = form.api_key.trim();
      await adminApi.updateProvider(provider.id, body);
      toast.success(`${provider.name} updated`);
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {provider.name}</DialogTitle>
          <DialogDescription>
            {PROVIDER_TYPE_META[provider.provider_type].label} provider. Leave the API key blank to keep the
            existing key.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`key-${provider.id}`}>API key</Label>
            <ApiKeyField
              id={`key-${provider.id}`}
              value={form.api_key}
              placeholder={provider.has_key ? provider.api_key || "Masked — unchanged" : "Not set"}
              onChange={(v) => setField("api_key", v)}
            />
            <p className="text-xs text-muted-foreground">Masked values stay unchanged unless you type a new key.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`url-${provider.id}`}>Base URL</Label>
            <Input
              id={`url-${provider.id}`}
              value={form.base_url}
              onChange={(e) => setField("base_url", e.target.value)}
              placeholder="https://api.openai.com/v1"
              className={cn("font-mono text-[13px]", FOCUS_RING)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`model-${provider.id}`}>Model</Label>
            <Input
              id={`model-${provider.id}`}
              value={form.model}
              onChange={(e) => setField("model", e.target.value)}
              placeholder="gpt-4o-mini"
              className={cn("font-mono text-[13px]", FOCUS_RING)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={`temp-${provider.id}`}>Temperature</Label>
              <Input
                id={`temp-${provider.id}`}
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={form.temperature}
                onChange={(e) => setField("temperature", e.target.value)}
                className={FOCUS_RING}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`tokens-${provider.id}`}>Max tokens</Label>
              <Input
                id={`tokens-${provider.id}`}
                type="number"
                min={1}
                value={form.max_tokens}
                onChange={(e) => setField("max_tokens", e.target.value)}
                className={FOCUS_RING}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`timeout-${provider.id}`}>Timeout (s)</Label>
              <Input
                id={`timeout-${provider.id}`}
                type="number"
                min={1}
                value={form.timeout}
                onChange={(e) => setField("timeout", e.target.value)}
                className={FOCUS_RING}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`limit-${provider.id}`}>Daily limit</Label>
              <Input
                id={`limit-${provider.id}`}
                type="number"
                min={0}
                value={form.daily_limit}
                onChange={(e) => setField("daily_limit", e.target.value)}
                className={FOCUS_RING}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="gradient" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProviderCard({
  provider,
  usage,
  onChanged,
}: {
  provider: AIProvider;
  usage?: AIStatus["usage"][number];
  onChanged: () => void;
}) {
  const [enabling, setEnabling] = useState(false);
  const [activating, setActivating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);

  async function handleToggleEnabled(checked: boolean) {
    setEnabling(true);
    try {
      await adminApi.updateProvider(provider.id, { enabled: checked });
      toast.success(checked ? `${provider.name} enabled` : `${provider.name} disabled`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setEnabling(false);
    }
  }

  async function handleActivate() {
    setActivating(true);
    try {
      await adminApi.activateProvider(provider.id);
      toast.success(`${provider.name} is now the active AI provider`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setActivating(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminApi.testProvider(provider.id);
      setTestResult(res);
      if (res.ok) toast.success(res.detail || `${provider.name} responded successfully`);
      else toast.error(res.detail || `${provider.name} test failed`);
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Something went wrong";
      setTestResult({ ok: false, detail });
      toast.error(detail);
    } finally {
      setTesting(false);
    }
  }

  const usagePct =
    usage && usage.daily_limit > 0 ? Math.min(100, Math.round((usage.used_today / usage.daily_limit) * 100)) : 0;

  return (
    <RevealItem>
      <div
        className={cn(
          "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/35",
          provider.is_active && "glow border-primary hover:border-primary",
        )}
      >
        {provider.is_active ? (
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
        ) : null}

        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-display text-base font-semibold text-foreground">{provider.name}</h3>
                {provider.is_active ? <Badge variant="gradient">Active</Badge> : null}
              </div>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {provider.model || "No model set"}
              </p>
            </div>
            <Switch checked={provider.enabled} onCheckedChange={handleToggleEnabled} disabled={enabling} />
          </div>

          <TypeBadge type={provider.provider_type} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>API key</span>
            <span
              className={cn(
                "font-mono",
                provider.has_key ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {provider.has_key ? "configured" : "missing"}
            </span>
          </div>

          {usage ? (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Usage today</span>
                <span className="font-mono tabular-nums">
                  {usage.used_today} / {usage.daily_limit > 0 ? usage.daily_limit : "∞"}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          ) : null}

          {testResult ? (
            <p
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs leading-relaxed",
                testResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {testResult.detail}
            </p>
          ) : null}
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <ProviderEditDialog provider={provider} onSaved={onChanged} />
          <Button type="button" size="sm" variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Test
          </Button>
          {!provider.is_active ? (
            <Button type="button" size="sm" variant="gradient" onClick={handleActivate} disabled={activating}>
              {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Activate
            </Button>
          ) : null}
        </div>
      </div>
    </RevealItem>
  );
}

export default function AdminAIPage() {
  const queryClient = useQueryClient();

  const {
    data: providers,
    isLoading: providersLoading,
    isError: providersError,
  } = useQuery({ queryKey: ["admin", "ai", "providers"], queryFn: adminApi.aiProviders });

  const { data: status } = useQuery({ queryKey: ["admin", "ai", "status"], queryFn: adminApi.aiStatus });

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: ["admin", "ai", "providers"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "ai", "status"] });
  }

  const usageByKey = new Map<string, AIStatus["usage"][number]>((status?.usage ?? []).map((u) => [u.key, u]));

  if (providersLoading) {
    return (
      <div className="space-y-6">
        <div className={cn(SHIMMER_BLOCK, "h-24 w-full")} />
        <div className={cn(SHIMMER_BLOCK, "h-40 w-full")} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn(SHIMMER_BLOCK, "h-64 w-full")} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Engine</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-foreground">AI Providers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure and switch between AI providers that power summarization across the platform.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <Panel>
          <PanelHeader
            eyebrow="Engine status"
            title={status?.active_provider ? `Active — ${status.active_provider}` : "No active provider"}
            description={
              status?.active_model
                ? `Serving requests on ${status.active_model}.`
                : "Activate a provider below to power AI summarization."
            }
            action={
              <Badge variant="gradient" className="font-mono text-[11px]">
                {status ? `${status.enabled_count} / ${status.total} enabled` : "…"}
              </Badge>
            }
          />
          <div className="grid gap-4 p-5 pt-4 sm:grid-cols-3">
            {(Object.keys(PROVIDER_TYPE_META) as ProviderType[]).map((type) => (
              <div key={type} className="space-y-1.5">
                <TypeBadge type={type} />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {PROVIDER_TYPE_META[type].description}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </Reveal>

      {providersError || !providers || providers.length === 0 ? (
        <Panel>
          <div className="p-10 text-center text-sm text-muted-foreground">
            {providersError ? "Couldn't load AI providers." : "No AI providers configured."}
          </div>
        </Panel>
      ) : (
        <RevealStagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} usage={usageByKey.get(p.key)} onChanged={handleChanged} />
          ))}
        </RevealStagger>
      )}
    </div>
  );
}
