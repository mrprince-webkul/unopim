"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatDate } from "@/lib/utils";
import type { DatePoint, EngagementPoint } from "@/lib/types";

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
  outline: "none",
};

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export function WeeklyViewsChart({ data }: { data: DatePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="weeklyViewsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => formatDate(v, "MMM d")}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v: string) => formatDate(v, "MMM d, yyyy")} />
        <Area
          type="monotone"
          dataKey="count"
          name="Views"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#weeklyViewsGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyEngagementChart({ data }: { data: EngagementPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => formatDate(v, "MMM d")}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval={Math.max(0, Math.floor(data.length / 8))}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v: string) => formatDate(v, "MMM d, yyyy")} />
        <Bar dataKey="views" name="Views" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="likes" name="Likes" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="comments" name="Comments" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
