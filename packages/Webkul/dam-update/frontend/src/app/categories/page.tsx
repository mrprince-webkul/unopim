import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers } from "lucide-react";

import { PageHeader, HeaderStats } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { categoriesApi } from "@/lib/api";
import { resolveLucideIcon } from "@/lib/icons";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Translucent variant of any CSS color (hex, hsl(), var()) via color-mix. */
function mix(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof categoriesApi.list>> = [];
  let failed = false;

  try {
    categories = await categoriesApi.list();
  } catch {
    failed = true;
  }

  const totalPosts = categories.reduce((sum, c) => sum + c.posts_count, 0);
  const hasCategories = !failed && categories.length > 0;

  return (
    <div className="container py-8 sm:py-10">
      <PageHeader
        eyebrow="Explore"
        icon={Layers}
        title="Browse by"
        highlight="topic"
        description="From AI and databases to DevOps, security, and open source — jump straight to the announcements you care about."
        actions={
          hasCategories ? (
            <HeaderStats
              items={[
                { label: "Categories", value: String(categories.length) },
                { label: "Posts", value: formatNumber(totalPosts) },
              ]}
            />
          ) : undefined
        }
      />

      <div className="mt-8">
        {failed ? (
          <EmptyState title="Couldn't load categories" description="Something went wrong. Try refreshing the page." />
        ) : categories.length === 0 ? (
          <EmptyState title="No categories yet" description="Categories will show up here once they're created." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = resolveLucideIcon(category.icon);
              const color = category.color ?? "hsl(var(--primary))";
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  style={{ "--cat": color } as CSSProperties}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  {/* faint per-category identity wash */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{ background: `radial-gradient(120% 90% at 100% 0%, ${mix(color, 8)}, transparent 55%)` }}
                  />
                  {/* hover glow + colored border */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      boxShadow: `inset 0 0 0 1px ${mix(color, 45)}, 0 22px 50px -24px ${mix(color, 55)}`,
                      background: `radial-gradient(120% 90% at 100% 0%, ${mix(color, 14)}, transparent 55%)`,
                    }}
                  />
                  {/* top hairline accent */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${mix(color, 55)}, transparent)` }}
                  />

                  <div className="relative flex items-start justify-between">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: mix(color, 14),
                        color,
                        boxShadow: `inset 0 0 0 1px ${mix(color, 22)}`,
                      }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </div>

                  <div className="relative mt-4">
                    <h3 className="font-display text-[17px] font-semibold tracking-tight text-foreground">
                      {category.name}
                    </h3>
                    {category.description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {category.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="relative mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {formatNumber(category.posts_count)} posts
                    </span>
                    <span
                      className="ml-auto inline-flex items-center gap-1 text-xs font-semibold opacity-0 transition-all duration-300 group-hover:opacity-100"
                      style={{ color }}
                    >
                      Explore
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
