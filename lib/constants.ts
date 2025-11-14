// lib/constants.ts

// ### NEXT APP
export const LOCAL_SITE_URL = process.env.LOCAL_SITE_URL as string
export const PRODUCTION_URL = process.env.PRODUCTION_URL as string
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

// ### Socials & SEO
export const NEXT_PUBLIC_SITE_NAME = `Next SaaS Kit v2` as string
export const APP_SLOGAN = `Launch your SaaS faster` as string
export const APP_DESCRIPTION = `Launch your SaaS App 10x Faster` as string
export const APP_DESCRIPTION_LONG =
  `Highly customizable components for building modern websites and pplications that look and feel the way you mean it.` as string
export const KEYWORDS_LST: string[] = [
  'Saas,Next.js',
  'TypeScript',
  'Tailwind CSS',
  'ShadCN,Kinde',
  'Supabase',
]
  .flatMap((keywordGroup) => keywordGroup.split(','))
  .map((keyword) => keyword.trim())
export const LOCALE = `en_US`
export const TWITTER_ID = `@yourdomain`
export const YOUTUBE_ID = `@yourchannel`
export const FBOOK_ID = `@yourdomain`
export const INSTA_ID = `@yourdomain`
export const TIKTOK_ID = `@yourdomain`
export const LINKEDIN_ID = `@yourdomain`

// ###Pricing
export const PRICE_01 = `30` as string
export const PRICE_01_DESC =
  `Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmo` as string
export const PRICE_01_FEATUREITEMS_LST: string[] =
  'Lorem Ipsum something1,Lorem Ipsum something2,Lorem Ipsum something3,Lorem Ipsum something4,Lorem Ipsum something5'
    .split(',')
    .map((item) => item.trim())
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID as string
