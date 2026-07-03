import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Manrope } from "next/font/google";

import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { publicSettingsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

async function getBranding(): Promise<Record<string, string>> {
  try {
    return await publicSettingsApi.get();
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  const title = b.BRAND_BROWSER_TITLE || "DevAnnounce — Where developers announce what they build";
  const name = b.BRAND_APP_NAME || "DevAnnounce";
  return {
    title: { default: title, template: `%s · ${name}` },
    description:
      b.BRAND_HERO_TAGLINE ||
      "A dark-mode-first announcement and developer news platform. Ship launches, releases, and the news that matters — in one place.",
    icons: b.BRAND_FAVICON_URL ? { icon: b.BRAND_FAVICON_URL } : undefined,
  };
}

// Applied before first paint to prevent a flash of the wrong theme.
const THEME_BOOT = `
(function(){
  try {
    var P = {
      midnight:{d:1,bg:'222 47% 4%',fg:'210 40% 96%'},
      arctic:{d:0,bg:'210 45% 98%',fg:'222 47% 8%'},
      emerald:{d:1,bg:'170 34% 4%',fg:'210 40% 96%'},
      cyber:{d:1,bg:'222 60% 4%',fg:'210 40% 96%'},
      sunset:{d:1,bg:'260 30% 5%',fg:'210 40% 96%'}
    };
    var id = localStorage.getItem('da_theme_active') || '__DEFAULT__';
    var t = P[id];
    if(!t){
      try{ var cs=JSON.parse(localStorage.getItem('da_theme_custom')||'[]');
        var c=cs.find(function(x){return x.id===id;});
        if(c){ var base=P[c.base]||P.midnight; t={d:c.mode==='dark'?1:0,bg:(c.overrides&&c.overrides['--background'])||base.bg,fg:(c.overrides&&c.overrides['--foreground'])||base.fg}; }
      }catch(e){}
    }
    if(!t) t=P.midnight;
    var el=document.documentElement;
    if(t.d) el.classList.add('dark'); else el.classList.remove('dark');
    el.style.setProperty('--background',t.bg);
    el.style.setProperty('--foreground',t.fg);
    el.style.colorScheme = t.d ? 'dark' : 'light';
  } catch(e){}
})();
`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const branding = await getBranding();
  const defaultTheme = branding.THEME_DEFAULT || "midnight";
  const bootScript = THEME_BOOT.replace("__DEFAULT__", defaultTheme);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className={cn(geist.variable, geistMono.variable, manrope.variable, "font-sans")}>
        <Providers defaultTheme={defaultTheme} branding={branding}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
