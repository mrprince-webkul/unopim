"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Branding = Record<string, string>;

const Ctx = createContext<Branding>({});

export function BrandingProvider({ value, children }: { value: Branding; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBranding() {
  const b = useContext(Ctx);
  return {
    raw: b,
    appName: b.BRAND_APP_NAME || "DevAnnounce",
    tagline: b.BRAND_TAGLINE || "Ship it. Announce it.",
    heroTagline:
      b.BRAND_HERO_TAGLINE || "A real-time changelog for everything the community builds.",
    logoUrl: b.BRAND_LOGO_URL || "",
    footerText: b.BRAND_FOOTER_TEXT || "Built for developers who ship.",
    copyright: b.BRAND_COPYRIGHT || "© DevAnnounce",
    github: b.BRAND_SOCIAL_GITHUB || "",
    twitter: b.BRAND_SOCIAL_TWITTER || "",
    linkedin: b.BRAND_SOCIAL_LINKEDIN || "",
    contactEmail: b.BRAND_CONTACT_EMAIL || "",
    maintenance: b.CONFIG_MAINTENANCE_MODE === "true",
    maintenanceMessage: b.CONFIG_MAINTENANCE_MESSAGE || "",
  };
}
