"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { ShipLogLead, ShipLogEntry } from "@/components/home/ship-log";
import { EmptyShipLog } from "@/components/home/empty-ship-log";
import { announcementsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AnnouncementSort } from "@/lib/types";

const TABS: { key: AnnouncementSort; label: string }[] = [
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
  { key: "popular", label: "Popular" },
];

export function HomeFeed() {
  const [sort, setSort] = useState<AnnouncementSort>("latest");

  const { data, isLoading } = useQuery({
    queryKey: ["home-feed", sort],
    queryFn: () => announcementsApi.list({ sort, size: 12 }),
  });

  const items = data?.items ?? [];
  const [lead, ...rest] = items;

  return (
    <section>
      {/* Editorial masthead — heading left, controls right, hairline rule */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Ship log</p>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-[28px]">
            What developers just shipped
          </h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSort(tab.key)}
              className={cn(
                "rounded-md px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors",
                sort === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 pl-9">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 border-b border-border/50 pb-5">
              <div className="h-3 w-40 animate-pulse rounded bg-secondary/60" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-secondary/60" />
              <div className="h-4 w-full animate-pulse rounded bg-secondary/40" />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div>
            {lead ? <ShipLogLead announcement={lead} /> : null}
            {rest.map((announcement, i) => (
              <ShipLogEntry
                key={announcement.id}
                announcement={announcement}
                index={i}
                isLast={i === rest.length - 1}
              />
            ))}
          </div>
          <Link
            href={`/general?sort=${sort}`}
            className="group mt-8 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 font-mono text-[12px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            View full feed
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </>
      ) : (
        <EmptyShipLog />
      )}
    </section>
  );
}
