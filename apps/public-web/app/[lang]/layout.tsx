import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Bengali } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StickyCta } from "@/components/sticky-cta";
import { LOCALES, hasLocale, localePath, type Locale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/dictionaries";
import { loadDictionary } from "@/lib/i18n/load-dictionary";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist has no Bengali glyphs; the font stack in globals.css falls back to
// this for Bengali text on both language versions.
const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

async function resolveLocale(paramsPromise?: Promise<{ lang?: string }>): Promise<Locale> {
  const resolved = paramsPromise ? await paramsPromise : undefined;
  if (resolved?.lang && hasLocale(resolved.lang)) {
    return resolved.lang;
  }
  return getLocale();
}

export async function generateMetadata(props: LayoutProps<"/[lang]">): Promise<Metadata> {
  const locale = await resolveLocale(props.params);
  const dict = await loadDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: localePath(locale, "/"),
      languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, "/")])),
    },
  };
}

export default async function RootLayout(props: LayoutProps<"/[lang]">) {
  const locale = await resolveLocale(props.params);
  const dict = await loadDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${notoBengali.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <SiteHeader locale={locale} dict={dict} />
        {props.children}
        <SiteFooter locale={locale} dict={dict} />
        <StickyCta locale={locale} dict={dict} />
      </body>
    </html>
  );
}
