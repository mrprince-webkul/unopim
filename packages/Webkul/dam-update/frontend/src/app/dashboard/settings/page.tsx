"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { BadgeCheck, Camera, Loader2 } from "lucide-react";

import { FOCUS_RING, Panel, PanelHeader } from "@/components/dashboard/panel";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { uploadsApi, usersApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const urlField = z.string().trim().url("Enter a valid URL").optional().or(z.literal(""));

const schema = z.object({
  full_name: z.string().max(80, "At most 80 characters").optional().or(z.literal("")),
  bio: z.string().max(280, "At most 280 characters").optional().or(z.literal("")),
  github_url: urlField,
  linkedin_url: urlField,
  website_url: urlField,
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/settings");
  }, [loading, user, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", bio: "", github_url: "", linkedin_url: "", website_url: "" },
  });

  useEffect(() => {
    if (user) {
      reset({
        full_name: user.full_name ?? "",
        bio: user.bio ?? "",
        github_url: user.github_url ?? "",
        linkedin_url: user.linkedin_url ?? "",
        website_url: user.website_url ?? "",
      });
    }
  }, [user, reset]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({
        full_name: values.full_name || null,
        bio: values.bio || null,
        github_url: values.github_url || null,
        linkedin_url: values.linkedin_url || null,
        website_url: values.website_url || null,
      });
      setUser(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image must be 25MB or smaller");
      return;
    }
    setAvatarUploading(true);
    try {
      const uploaded = await uploadsApi.upload(file);
      const updated = await usersApi.updateMe({ avatar_url: uploaded.url });
      setUser(updated);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputClass = cn(FOCUS_RING);

  return (
    <div className="container max-w-2xl py-8">
      <Reveal>
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Account</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage your profile and account details.</p>
        </div>
      </Reveal>

      <Reveal>
        <Panel className="mb-6">
          <PanelHeader eyebrow="Profile photo" title="Avatar" />
          <div className="flex items-center gap-4 p-5">
            <label className="group relative cursor-pointer">
              <UserAvatar user={user} className="h-16 w-16 text-lg ring-4 ring-background" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <div>
              <p className="text-sm font-medium text-foreground">
                {avatarUploading ? "Uploading…" : "Change avatar"}
              </p>
              <p className="text-xs text-muted-foreground">PNG or JPG, up to 25MB.</p>
            </div>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.05}>
        <Panel className="mb-6">
          <PanelHeader eyebrow="Public info" title="Profile" description="This information is visible on your public profile." />
          <div className="p-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" placeholder="Ada Lovelace" className={inputClass} {...register("full_name")} />
                {errors.full_name ? <p className="text-xs text-destructive">{errors.full_name.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell the community about yourself"
                  className={inputClass}
                  {...register("bio")}
                />
                {errors.bio ? <p className="text-xs text-destructive">{errors.bio.message}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="github_url">GitHub URL</Label>
                  <Input
                    id="github_url"
                    placeholder="https://github.com/…"
                    className={inputClass}
                    {...register("github_url")}
                  />
                  {errors.github_url ? <p className="text-xs text-destructive">{errors.github_url.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    placeholder="https://linkedin.com/in/…"
                    className={inputClass}
                    {...register("linkedin_url")}
                  />
                  {errors.linkedin_url ? (
                    <p className="text-xs text-destructive">{errors.linkedin_url.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    placeholder="https://…"
                    className={inputClass}
                    {...register("website_url")}
                  />
                  {errors.website_url ? <p className="text-xs text-destructive">{errors.website_url.message}</p> : null}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="gradient" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel>
          <PanelHeader eyebrow="Security" title="Account" />
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-xs font-medium text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verification</span>
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2.5 py-0.5 text-xs font-medium text-emerald-500 dark:text-emerald-400">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Not verified — check the backend logs for the verification link.
                </span>
              )}
            </div>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
