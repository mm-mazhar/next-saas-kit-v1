// app/layout.tsx

import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { Inter } from 'next/font/google'
// import HeaderSubComponent from './components/HeaderSubComp'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

import {
  APP_DESCRIPTION,
  APP_SLOGAN,
  KEYWORDS_LST,
  LOCALE,
  NEXT_PUBLIC_SITE_NAME,
  SITE_URL,
  TWITTER_ID,
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

// // ===================================================================
// // PASTE THE CONSOLE LOG HERE
// // ===================================================================
// console.log('--- CHECKING CONSTANTS IN LAYOUT.TSX ---')
// console.log({
//   APP_DESCRIPTION,
//   APP_SLOGAN,
//   KEYWORDS_LST,
//   LOCALE,
//   NEXT_PUBLIC_SITE_NAME,
//   SITE_URL,
//   TWITTER_ID,
// })
// // ===================================================================

export const metadata: Metadata = {
  title: `${NEXT_PUBLIC_SITE_NAME} - ${APP_SLOGAN}`,
  description: `${APP_DESCRIPTION}`,
  keywords: KEYWORDS_LST,
  authors: [{ name: `${NEXT_PUBLIC_SITE_NAME} Team` }],
  creator: `${NEXT_PUBLIC_SITE_NAME}`,
  publisher: `${NEXT_PUBLIC_SITE_NAME}`,
  openGraph: {
    type: 'website',
    locale: `${LOCALE}`,
    url: `${SITE_URL}`,
    title: `${NEXT_PUBLIC_SITE_NAME} - ${APP_SLOGAN}`,
    description: `${APP_DESCRIPTION}`,
    siteName: `${NEXT_PUBLIC_SITE_NAME}`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${NEXT_PUBLIC_SITE_NAME} - ${APP_SLOGAN}`,
    description: `${APP_DESCRIPTION}`,
    creator: `${TWITTER_ID}`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

async function getData(userId: string) {
  noStore()
  if (userId) {
    const data = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        colorScheme: true,
      },
    })
    return data
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
      <body
        className={`${inter.className} ${data?.colorScheme ?? 'theme-orange'}`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          {/* HeaderSubComponent/previously Navbar remains outside the main content wrapper */}
          {/* <HeaderSubComponent /> */}
          {/* A <main> tag to wrap and center your page content */}
          {/* <main className='container mx-auto px-4 py-8'>{children}</main> */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
