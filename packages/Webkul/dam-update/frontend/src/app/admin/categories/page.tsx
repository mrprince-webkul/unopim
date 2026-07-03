"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOCUS_RING, Panel, PanelHeader, ROW_HOVER_CLASS } from "@/components/admin/panel";
import { Reveal } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import type { Category } from "@/lib/types";

const SHIMMER_LINE =
  "h-14 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";
const DEFAULT_COLOR = "#06b6d4"; // cyan-500

function resolveIcon(name: string): LucideIcon {
  if (!name) return Icons.Layers;
  const key = name.charAt(0).toUpperCase() + name.slice(1);
  const icon = (Icons as unknown as Record<string, LucideIcon>)[key];
  return icon ?? Icons.Layers;
}

function sortByPosition(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

interface CategoryFormState {
  name: string;
  description: string;
  icon: string;
  color: string;
}

function CategoryDialog({
  category,
  onSaved,
  trigger,
}: {
  category?: Category;
  onSaved: () => void;
  trigger: ReactNode;
}) {
  const isEdit = Boolean(category);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CategoryFormState>({
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "",
    color: category?.color ?? DEFAULT_COLOR,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: category?.name ?? "",
        description: category?.description ?? "",
        icon: category?.icon ?? "",
        color: category?.color ?? DEFAULT_COLOR,
      });
    }
  }, [open, category]);

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && category) {
        await adminApi.updateCategory(category.id, {
          name: form.name,
          description: form.description,
          icon: form.icon,
          color: form.color,
        });
        toast.success("Category updated");
      } else {
        await adminApi.createCategory({
          name: form.name,
          description: form.description,
          icon: form.icon,
          color: form.color,
        });
        toast.success("Category created");
      }
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Categories help organize announcements by topic.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="AI & ML"
              className={FOCUS_RING}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description shown on the category page"
              className={FOCUS_RING}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-icon">Icon (lucide name)</Label>
              <Input
                id="cat-icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="sparkles"
                className={FOCUS_RING}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-color">Color</Label>
              <div className="flex items-center gap-2">
                <span
                  className="h-9 w-9 shrink-0 rounded-md ring-1 ring-border"
                  style={{ backgroundColor: form.color }}
                  aria-hidden
                />
                <input
                  id="cat-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="gradient" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryButton({ category, onDone }: { category: Category; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await adminApi.deleteCategory(category.id);
      toast.success("Category deleted");
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{category.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              Announcements in this category will become uncategorized. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryRow({
  category,
  index,
  count,
  onMove,
  onChanged,
  reordering,
}: {
  category: Category;
  index: number;
  count: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onChanged: () => void;
  reordering: boolean;
}) {
  const Icon = resolveIcon(category.icon ?? "");
  const color = category.color ?? "hsl(var(--primary))";
  const isHidden = Boolean(category.is_hidden);
  const isFeatured = Boolean(category.is_featured);

  const toggleMutation = useMutation({
    mutationFn: (body: { is_hidden?: boolean; is_featured?: boolean }) =>
      adminApi.updateCategory(category.id, body),
    onSuccess: (_data, body) => {
      if (body.is_hidden !== undefined) {
        toast.success(body.is_hidden ? "Category hidden" : "Category shown");
      } else if (body.is_featured !== undefined) {
        toast.success(body.is_featured ? "Category featured" : "Category unfeatured");
      }
      onChanged();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    },
  });

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-3 transition-colors",
        ROW_HOVER_CLASS,
        isHidden && "opacity-50",
      )}
    >
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={index === 0 || reordering}
          onClick={() => onMove(index, -1)}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={index === count - 1 || reordering}
          onClick={() => onMove(index, 1)}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-border"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{category.name}</span>
          {isHidden ? (
            <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Hidden
            </span>
          ) : null}
          {isFeatured ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 via-sky-500/15 to-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-700 dark:border-cyan-400/25 dark:text-cyan-300">
              <Star className="h-2.5 w-2.5 fill-current" />
              Featured
            </span>
          ) : null}
        </div>
        <p className="line-clamp-1 text-xs text-muted-foreground">{category.description || "—"}</p>
      </div>

      <div className="hidden shrink-0 text-xs text-muted-foreground sm:block">
        {formatNumber(category.posts_count)} posts
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate({ is_hidden: !isHidden })}
            >
              {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isHidden ? "Show category" : "Hide category"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("h-8 w-8 p-0", isFeatured && "text-primary")}
              disabled={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate({ is_featured: !isFeatured })}
            >
              <Star className={cn("h-3.5 w-3.5", isFeatured && "fill-current")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFeatured ? "Unfeature" : "Feature"}</TooltipContent>
        </Tooltip>

        <CategoryDialog
          category={category}
          onSaved={onChanged}
          trigger={
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <DeleteCategoryButton category={category} onDone={onChanged} />
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const {
    data: categoriesData,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["admin", "categories"], queryFn: adminApi.categories });

  const [ordered, setOrdered] = useState<Category[] | null>(null);

  useEffect(() => {
    if (categoriesData) setOrdered(sortByPosition(categoriesData));
  }, [categoriesData]);

  const reorderMutation = useMutation({
    mutationFn: (order: number[]) => adminApi.reorderCategories(order),
    onSuccess: () => {
      toast.success("Order updated");
      handleChanged();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
      handleChanged();
    },
  });

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  function handleMove(index: number, direction: -1 | 1) {
    if (!ordered) return;
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setOrdered(next);
    reorderMutation.mutate(next.map((c) => c.id));
  }

  const categories = ordered ?? [];

  return (
    <Reveal>
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            eyebrow={`${categories.length} total`}
            title="Categories"
            description="Use the arrows to reorder — this controls display order across the site."
            action={
              <CategoryDialog
                onSaved={handleChanged}
                trigger={
                  <Button type="button" variant="gradient" size="sm">
                    <Plus className="h-4 w-4" />
                    New category
                  </Button>
                }
              />
            }
          />

          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <div className={SHIMMER_LINE} />
                </div>
              ))
            ) : isError || categories.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {isError ? "Couldn't load categories." : "No categories yet."}
              </div>
            ) : (
              categories.map((c, index) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  index={index}
                  count={categories.length}
                  onMove={handleMove}
                  onChanged={handleChanged}
                  reordering={reorderMutation.isPending}
                />
              ))
            )}
          </div>
        </Panel>
      </div>
    </Reveal>
  );
}
