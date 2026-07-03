"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatDate } from "@/lib/utils";
import type { DatePoint } from "@/lib/types";

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
  outline: "none",
};

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export function UserGrowthChart({ data }: { data: DatePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
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
          interval={Math.max(0, Math.floor(data.length / 8))}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v: string) => formatDate(v, "MMM d, yyyy")} />
        <Area
          type="monotone"
          dataKey="count"
          name="New users"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#userGrowthGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PostsPerDayChart({ data }: { data: DatePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
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
        <Bar dataKey="count" name="Posts" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
