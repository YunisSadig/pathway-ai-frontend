import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "@/components/account/session-provider";
import { SavedProvider } from "@/components/saved/saved-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipLink } from "@/components/layout/skip-link";
import { LanguageProvider } from "@/lib/i18n";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LegacyStorageCleanup } from "@/components/shared/legacy-storage-cleanup";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <LanguageProvider>
            <LegacyStorageCleanup />
            <SkipLink />
            <SessionProvider>
              <SavedProvider>
                <SiteHeader />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <SiteFooter />
              </SavedProvider>
            </SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
