"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { File as FileIcon, Loader2, Paperclip, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/empty-state";
import { announcementsApi, categoriesApi, uploadsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { Announcement, AnnouncementInput, AnnouncementStatus, Attachment } from "@/lib/types";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const urlField = z.string().trim().url("Enter a valid URL").optional().or(z.literal(""));

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200, "At most 200 characters"),
  description: z.string().min(1, "Description is required").max(300, "At most 300 characters"),
  content: z.string().min(1, "Content is required"),
  category_id: z.string().optional(),
  github_url: urlField,
  website_url: urlField,
  demo_url: urlField,
  cta_label: z.string().max(40, "At most 40 characters").optional().or(z.literal("")),
  cta_url: urlField,
  publish_date: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

function toDatetimeLocal(iso: string): string {
  try {
    return formatDate(iso, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

/** Titled, rounded-2xl bordered wrapper used to group related fields. */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border/60 pt-5 first:border-t-0 first:pt-0">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

export function AnnouncementForm({ slug }: { slug?: string }) {
  const isEdit = Boolean(slug);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [submitting, setSubmitting] = useState<AnnouncementStatus | null>(null);

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });

  const {
    data: existing,
    isLoading: loadingExisting,
    isError: loadError,
  } = useQuery({
    queryKey: ["announcement", slug],
    queryFn: () => announcementsApi.get(slug as string),
    enabled: isEdit,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      category_id: undefined,
      github_url: "",
      website_url: "",
      demo_url: "",
      cta_label: "",
      cta_url: "",
      publish_date: "",
    },
  });

  // Auth guard.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${isEdit ? `/announcements/${slug}/edit` : "/announcements/new"}`);
    }
  }, [authLoading, user, router, isEdit, slug]);

  // Permission guard for edit mode.
  useEffect(() => {
    if (isEdit && existing && user && !(user.id === existing.author.id || isAdmin)) {
      toast.error("You don't have permission to edit this announcement");
      router.replace(`/announcements/${existing.slug}`);
    }
  }, [isEdit, existing, user, isAdmin, router]);

  // Populate form once the existing announcement loads.
  useEffect(() => {
    if (!existing) return;
    reset({
      title: existing.title,
      description: existing.description,
      content: existing.content,
      category_id: existing.category ? String(existing.category.id) : undefined,
      github_url: existing.github_url ?? "",
      website_url: existing.website_url ?? "",
      demo_url: existing.demo_url ?? "",
      cta_label: existing.cta_label ?? "",
      cta_url: existing.cta_url ?? "",
      publish_date: existing.publish_date ? toDatetimeLocal(existing.publish_date) : "",
    });
    setTags(existing.tags);
    setThumbnailUrl(existing.thumbnail_url);
    setAttachments(existing.attachments);
  }, [existing, reset]);

  const contentValue = watch("content");
  const titleValue = watch("title") ?? "";
  const descriptionValue = watch("description") ?? "";

  function handleContentTab(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;
    const nextValue = `${value.slice(0, start)}  ${value.slice(end)}`;
    setValue("content", nextValue, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 2;
    });
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.includes(t)) return;
    if (tags.length >= 5) {
      toast.error("You can add up to 5 tags");
      return;
    }
    setTags((prev) => [...prev, t]);
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function handleThumbnailChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Thumbnail must be 25MB or smaller");
      return;
    }
    setThumbnailUploading(true);
    try {
      const uploaded = await uploadsApi.upload(file);
      setThumbnailUrl(uploaded.url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Thumbnail upload failed");
    } finally {
      setThumbnailUploading(false);
    }
  }

  async function handleAttachmentsChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      toast.error(`${tooBig.name} exceeds the 25MB limit`);
      return;
    }
    setAttachmentsUploading(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadsApi.upload(f)));
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Attachment upload failed");
    } finally {
      setAttachmentsUploading(false);
    }
  }

  function removeAttachment(id: number) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function onSubmit(values: FormValues, status: AnnouncementStatus) {
    setSubmitting(status);
    try {
      const body: AnnouncementInput = {
        title: values.title,
        description: values.description,
        content: values.content,
        category_id: values.category_id ? Number(values.category_id) : null,
        tags,
        thumbnail_url: thumbnailUrl,
        github_url: values.github_url || null,
        website_url: values.website_url || null,
        demo_url: values.demo_url || null,
        cta_label: values.cta_label || null,
        cta_url: values.cta_url || null,
        status,
        publish_date: values.publish_date ? new Date(values.publish_date).toISOString() : null,
        attachment_ids: attachments.map((a) => a.id),
      };

      const result =
        isEdit && existing
          ? await announcementsApi.update(existing.id, body)
          : await announcementsApi.create(body);

      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["announcement", result.slug] });

      toast.success(
        isEdit ? "Announcement updated" : status === "published" ? "Announcement published" : "Draft saved",
      );
      router.push(`/announcements/${result.slug}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  }

  if (authLoading || (isEdit && loadingExisting)) {
    return (
      <div className="container max-w-3xl space-y-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  if (isEdit && (loadError || !existing)) {
    return (
      <div className="container max-w-3xl py-10">
        <EmptyState title="Announcement not found" description="It may have been removed, or you may not have access." />
      </div>
    );
  }

  if (isEdit && existing && !(user.id === existing.author.id || isAdmin)) {
    return null;
  }

  const existingCategoryDeleted =
    isEdit && existing?.category && !(categories ?? []).some((c) => c.id === existing.category!.id);

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-8">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {isEdit ? "Editing" : "Compose"}
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isEdit ? "Edit announcement" : "New announcement"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isEdit
            ? "Update the details below and save your changes."
            : "Share what you're building with the DevAnnounce community."}
        </p>
      </div>

      <form onSubmit={handleSubmit((v) => onSubmit(v, "published"))} className="space-y-6">
        <FormSection title="Basics" description="The essentials shown on cards, previews, and search results.">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Ship something great" {...register("title")} />
            <div className="flex items-center justify-between">
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              ) : (
                <span />
              )}
              <p className="font-mono text-xs text-muted-foreground">{titleValue.length}/200</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Short description</Label>
            <Textarea
              id="description"
              placeholder="A one or two sentence summary shown on cards and previews"
              className="min-h-[70px]"
              {...register("description")}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              ) : (
                <span />
              )}
              <p className="font-mono text-xs text-muted-foreground">{descriptionValue.length}/300</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category_id">Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCategoryDeleted && existing?.category ? (
                      <SelectItem value={String(existing.category.id)}>{existing.category.name}</SelectItem>
                    ) : null}
                    {(categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs font-medium text-secondary-foreground"
                >
                  #{tag}
                  <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {tags.length < 5 ? (
                <input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput) {
                      addTag(tagInput);
                      setTagInput("");
                    }
                  }}
                  placeholder={tags.length === 0 ? "Type a tag and press Enter" : ""}
                  className="min-w-[120px] flex-1 border-0 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">Up to 5 tags. Press Enter or comma to add.</p>
          </div>
        </FormSection>

        <FormSection title="Content" description="Markdown supported — headings, code blocks, links, and images.">
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                {...register("content")}
                onKeyDown={handleContentTab}
                placeholder="Write your announcement in Markdown…"
                className="min-h-[400px] font-mono text-sm focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-[400px] rounded-xl border border-border p-4">
                {contentValue ? (
                  <Markdown content={contentValue} />
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {errors.content ? <p className="text-xs text-destructive">{errors.content.message}</p> : null}
        </FormSection>

        <FormSection title="Media & attachments" description="A cover image and any files readers can download.">
          <FieldGroup title="Thumbnail">
            {thumbnailUrl ? (
              <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-border">
                <Image src={thumbnailUrl} alt="Thumbnail preview" fill sizes="384px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setThumbnailUrl(null)}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground shadow"
                  aria-label="Remove thumbnail"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 text-sm text-muted-foreground transition-all hover:border-primary/60 hover:text-foreground hover:glow-sm">
                {thumbnailUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {thumbnailUploading ? "Uploading…" : "Upload an image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
              </label>
            )}
          </FieldGroup>

          <FieldGroup title="Attachments">
            {attachments.length > 0 ? (
              <ul className="space-y-2">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{a.original_name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={`Remove ${a.original_name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="flex w-full max-w-sm cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 px-4 py-3 text-sm text-muted-foreground transition-all hover:border-primary/60 hover:text-foreground hover:glow-sm">
              {attachmentsUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              {attachmentsUploading ? "Uploading…" : "Add files (max 25MB each)"}
              <input type="file" multiple className="hidden" onChange={handleAttachmentsChange} />
            </label>
          </FieldGroup>
        </FormSection>

        <FormSection title="Links & CTA" description="Optional resource links and a call-to-action button.">
          <FieldGroup title="Resource links">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="github_url" className="text-xs font-normal text-muted-foreground">
                  GitHub URL
                </Label>
                <Input id="github_url" placeholder="https://github.com/…" {...register("github_url")} />
                {errors.github_url ? <p className="text-xs text-destructive">{errors.github_url.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website_url" className="text-xs font-normal text-muted-foreground">
                  Website URL
                </Label>
                <Input id="website_url" placeholder="https://…" {...register("website_url")} />
                {errors.website_url ? <p className="text-xs text-destructive">{errors.website_url.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo_url" className="text-xs font-normal text-muted-foreground">
                  Demo URL
                </Label>
                <Input id="demo_url" placeholder="https://…" {...register("demo_url")} />
                {errors.demo_url ? <p className="text-xs text-destructive">{errors.demo_url.message}</p> : null}
              </div>
            </div>
          </FieldGroup>

          <FieldGroup title="Call to action">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cta_label" className="text-xs font-normal text-muted-foreground">
                  Button label
                </Label>
                <Input id="cta_label" placeholder="Get started" {...register("cta_label")} />
                {errors.cta_label ? <p className="text-xs text-destructive">{errors.cta_label.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cta_url" className="text-xs font-normal text-muted-foreground">
                  Button URL
                </Label>
                <Input id="cta_url" placeholder="https://…" {...register("cta_url")} />
                {errors.cta_url ? <p className="text-xs text-destructive">{errors.cta_url.message}</p> : null}
              </div>
            </div>
          </FieldGroup>
        </FormSection>

        <FormSection title="Publishing" description="Leave empty to publish immediately, or schedule for later.">
          <div className="space-y-1.5">
            <Label htmlFor="publish_date">Publish date (optional)</Label>
            <Input id="publish_date" type="datetime-local" className="max-w-xs" {...register("publish_date")} />
          </div>
        </FormSection>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={submitting !== null}
            onClick={handleSubmit((v) => onSubmit(v, "draft"))}
          >
            {submitting === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save draft
          </Button>
          <Button type="submit" variant="gradient" disabled={submitting !== null}>
            {submitting === "published" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Publish
          </Button>
        </div>
      </form>
    </div>
  );
}
