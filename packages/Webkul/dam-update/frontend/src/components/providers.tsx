"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeEngineProvider } from "@/components/theme/theme-context";
import { BrandingProvider, type Branding } from "@/components/branding-context";

export function Providers({
  children,
  defaultTheme = "midnight",
  branding = {},
}: {
  children: ReactNode;
  defaultTheme?: string;
  branding?: Branding;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeEngineProvider defaultTheme={defaultTheme}>
        <BrandingProvider value={branding}>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </AuthProvider>
        </BrandingProvider>
      </ThemeEngineProvider>
    </QueryClientProvider>
  );
}
