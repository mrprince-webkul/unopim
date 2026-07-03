"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { formatDate } from "@/lib/utils";
import type { NewsArticle } from "@/lib/types";

// Brand-safe accent hues — cyan / emerald / sky / teal / blue. Never purple.
const BRAND_HUES = [187, 160, 200, 174, 214];

function accentHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 9973;
  return BRAND_HUES[h % BRAND_HUES.length];
}

function monogram(s: string): string {
  const parts = s.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function CategoryChip({ category, hue, small }: { category: string; hue: number; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-wider backdrop-blur ${
        small ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
      }`}
      style={{
        borderColor: `hsl(${hue} 80% 55% / 0.35)`,
        backgroundColor: `hsl(${hue} 55% 10% / 0.55)`,
        color: `hsl(${hue} 90% 74%)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `hsl(${hue} 85% 60%)` }} />
      {category}
    </span>
  );
}

/** Cover image, or a brand-colored aurora + monogram fallback when there's none. */
function Cover({
  imageUrl,
  title,
  category,
  hue,
  monogramClass = "text-4xl",
}: {
  imageUrl: string | null;
  title: string;
  category: string;
  hue: number;
  monogramClass?: string;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={title}
        fill
        sizes="(max-width: 768px) 40vw, 240px"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
      />
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `radial-gradient(130% 120% at 18% 0%, hsl(${hue} 85% 48% / 0.22), transparent 55%), radial-gradient(120% 130% at 100% 100%, hsl(${(hue + 34) % 360} 85% 48% / 0.15), transparent 55%)`,
      }}
    >
      <div aria-hidden className="absolute inset-0 bg-grid-fine opacity-40" />
      <span
        className={`font-display font-bold tracking-tight transition-transform duration-500 group-hover:scale-110 ${monogramClass}`}
        style={{ color: `hsl(${hue} 80% 62% / 0.32)` }}
      >
        {monogram(category)}
      </span>
    </div>
  );
}

/** Compact news card for the dense 5-up grid — small thumbnail, tight copy. */
export function NewsCard({ article }: { article: NewsArticle }) {
  const { title, summary, image_url, source_url, source_name, category, reading_time } = article;
  const hue = accentHue(category || source_name);

  return (
    <motion.a
      href={source_url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "20% 0px 20% 0px" }}
      transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="card-hover group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Small default thumbnail */}
      <div className="relative h-24 w-full shrink-0 overflow-hidden bg-muted">
        <Cover imageUrl={image_url} title={title} category={category} hue={hue} monogramClass="text-2xl" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <span className="absolute bottom-2 left-2">
          <CategoryChip category={category} hue={hue} small />
        </span>
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100">
          <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>

        <p className="line-clamp-2 text-[11.5px] leading-5 text-muted-foreground">{summary}</p>

        <div className="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-2">
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[7px] font-bold"
            style={{
              backgroundColor: `hsl(${hue} 60% 45% / 0.16)`,
              color: `hsl(${hue} 85% 72%)`,
            }}
          >
            {monogram(source_name)}
          </span>
          <span className="truncate text-[10.5px] font-medium text-foreground/75">{source_name}</span>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">{reading_time}m</span>
        </div>
      </div>
    </motion.a>
  );
}

/** Horizontal editorial card — used two-up as the lead stories on the news index. */
export function FeaturedNewsCard({ article }: { article: NewsArticle }) {
  const { title, summary, image_url, source_url, source_name, category, reading_time, published_at } = article;
  const hue = accentHue(category || source_name);

  return (
    <motion.a
      href={source_url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="card-hover group relative flex overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Compact side image */}
      <div className="relative w-32 shrink-0 overflow-hidden bg-muted sm:w-44">
        <Cover imageUrl={image_url} title={title} category={category} hue={hue} monogramClass="text-4xl" />
        <span className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
        <span className="absolute bottom-2 left-2">
          <CategoryChip category={category} hue={hue} small />
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
        <span className="inline-flex w-fit items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Featured
        </span>

        <h2 className="line-clamp-2 font-display text-base font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
          {title}
        </h2>

        <p className="line-clamp-2 text-[13px] leading-6 text-muted-foreground">{summary}</p>

        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground/75">{source_name}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-muted-foreground/70">{formatDate(published_at)}</span>
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Read
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </motion.a>
  );
}
