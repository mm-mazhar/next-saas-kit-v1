// app/layout.tsx

import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { JsonLd } from '@/components/JsonLd'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/ToastProvider'
import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { Inter } from 'next/font/google'
import Script from 'next/script'

import './globals.css'

import { ThemeInitializer } from '@/components/ThemeInitializer'
import {
  APP_DESCRIPTION,
  APP_SLOGAN,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_THEME_MODE,
  KEYWORDS_LST,
  LOCALE,
  NEXT_PUBLIC_SITE_NAME,
  SITE_URL,
  SOCIAL_HANDLES,
} from '@/lib/constants'

const inter = Inter({ subsets: ['latin'] })

// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// })

// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// })

export const metadata: Metadata = {
  // ✅ Sets the canonical URL for your site. Crucial for SEO.
  metadataBase: new URL(SITE_URL),

  // ✅ Creates a dynamic title template. `%s` is replaced by page-specific titles.
  title: {
    default: `${NEXT_PUBLIC_SITE_NAME} - ${APP_SLOGAN}`,
    template: `%s | ${NEXT_PUBLIC_SITE_NAME}`,
  },

  // ✅ Uses your existing description constant.
  description: APP_DESCRIPTION,

  // SEO and author information
  keywords: KEYWORDS_LST,
  authors: [{ name: `${NEXT_PUBLIC_SITE_NAME} Team`, url: SITE_URL }],
  creator: NEXT_PUBLIC_SITE_NAME,
  publisher: NEXT_PUBLIC_SITE_NAME,

  // Robots meta tag
  robots: {
    index: true,
    follow: true,
  },

  // Open Graph (for Facebook, LinkedIn, etc.)
  openGraph: {
    type: 'website',
    locale: LOCALE,
    url: SITE_URL,
    title: {
      default: `${NEXT_PUBLIC_SITE_NAME} - ${APP_SLOGAN}`,
      template: `%s | ${NEXT_PUBLIC_SITE_NAME}`,
    },
    description: APP_DESCRIPTION,
    siteName: NEXT_PUBLIC_SITE_NAME,
    // CRITICAL: Add a default Open Graph image.
    images: [
      {
        url: '/og.png', // This should be in your /public directory
        width: 1200,
        height: 630,
        alt: `${NEXT_PUBLIC_SITE_NAME} - ${APP_SLOGAN}`,
      },
    ],
  },

  // Twitter (for sharing on X)
  twitter: {
    card: 'summary_large_image',
    title: {
      default: `${NEXT_PUBLIC_SITE_NAME} - ${APP_SLOGAN}`,
      template: `%s | ${NEXT_PUBLIC_SITE_NAME}`,
    },
    description: APP_DESCRIPTION,
    // CRITICAL: Add the same image for Twitter cards.
    images: ['/og.png'],
    creator: SOCIAL_HANDLES.twitter,
  },

  // Icons and manifest for PWA/browser tabs
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: `/site.webmanifest`, // Relative URL is fine when metadataBase is set
}

type ThemeSettings = {
  colorScheme: string | null
  themePreference: 'light' | 'dark' | 'system' | null
}

async function getData(userId: string): Promise<ThemeSettings | null> {
  noStore()
  if (!userId) return null
  try {
    const rows = await prisma.$queryRaw<
      {
        colorScheme: string | null
        themePreference: 'light' | 'dark' | 'system' | null
      }[]
    >`
      SELECT "colorScheme", "themePreference" FROM "User" WHERE "id" = ${userId}
    `
    return rows[0] ?? null
  } catch {
    return null
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const data = await getData(user?.id as string)

  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${inter.className} ${data?.colorScheme ?? DEFAULT_COLOR_SCHEME}`}>
        <Script id='theme-init' strategy='beforeInteractive'>
          {`(function(){try{var k='app-theme';var s=localStorage.getItem(k);var t=s?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t);}catch(e){}})();`}
        </Script>
        <ThemeProvider
          attribute='class'
          defaultTheme={DEFAULT_THEME_MODE}
          storageKey='app-theme'
          enableSystem
          enableColorScheme={false}
          disableTransitionOnChange
        >
          <ToastProvider>
            <JsonLd />
            <ThemeInitializer settings={data} forceFromServer={!!user} />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
