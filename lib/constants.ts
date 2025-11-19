// lib/constants.ts

// ✅ NEXT APP
export const LOCAL_SITE_URL = process.env.LOCAL_SITE_URL as string
export const PRODUCTION_URL = process.env.PRODUCTION_URL as string
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL as string

// ✅ COLOR SCHEME AND MODE
export const DEFAULT_COLOR_SCHEME = `theme-orange` as string
export const DEFAULT_THEME_MODE = `dark` as string

// ✅ LOCALE
export const LOCALE = `en_US`

// ✅ SOCIALS AND SEO
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

// Define the HANDLES as the single source of truth.
export const SOCIAL_HANDLES = {
  twitter: '@yourdomain',
  youtube: '@yourchannel',
  facebook: 'yourdomain', // No '@' for Facebook pages
  instagram: 'yourdomain', // No '@'
  tiktok: '@yourdomain',
  linkedin: 'yourcompany', // This is the company slug, not a handle
}

// CONSTRUCT the full links from the handles.
export const SOCIAL_LINKS = {
  twitter: `https://x.com/${SOCIAL_HANDLES.twitter.replace('@', '')}`,
  youtube: `https://youtube.com/${SOCIAL_HANDLES.youtube}`,
  facebook: `https://facebook.com/${SOCIAL_HANDLES.facebook}`,
  instagram: `https://instagram.com/${SOCIAL_HANDLES.instagram}`,
  tiktok: `https://tiktok.com/${SOCIAL_HANDLES.tiktok}`,
  linkedin: `https://linkedin.com/company/${SOCIAL_HANDLES.linkedin}`,
}

// ✅ Pricing
export const PRICE_01 = `30` as string
export const PRICE_01_DESC =
  `Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmo` as string
export const PRICE_01_FEATUREITEMS_LST: string[] =
  'Lorem Ipsum something1,Lorem Ipsum something2,Lorem Ipsum something3,Lorem Ipsum something4,Lorem Ipsum something5'
    .split(',')
    .map((item) => item.trim())
export const STRIPE_PRICE_ID_1 = (process.env.STRIPE_PRICE_ID_1 ||
  process.env.STRIPE_PRICE_ID ||
  '') as string
export const STRIPE_PRICE_ID_2 = (process.env.STRIPE_PRICE_ID_2 ||
  process.env.STRIPE_PRICE_ID_1 ||
  process.env.STRIPE_PRICE_ID ||
  '') as string

// A new type definition for a pricing plan
export const PRICE_HEADING = `Pricing that scales with your business` as string
export type PricingPlan = {
  id: 'free' | 'pro' | 'pro_plus'
  title: string
  price: string
  priceSuffix: string
  description: string
  credits: number
  features: string[]
  stripePriceId?: string // Optional because 'Free' plan has no Stripe ID
}

// Define the three plans using the new type
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    title: 'Free',
    price: '0',
    priceSuffix: '/mo',
    description: 'Lorem ipsum dolor sit amet',
    credits: 5,
    features: [
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
    ],
    stripePriceId: undefined,
  },
  {
    id: 'pro',
    title: 'Pro',
    price: '30',
    priceSuffix: '/mo',
    description: 'Lorem ipsum dolor sit amet',
    credits: 50,
    features: [
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
    ],
    stripePriceId: STRIPE_PRICE_ID_1,
  },
  {
    id: 'pro_plus',
    title: 'Pro Plus',
    price: '60',
    priceSuffix: '/mo',
    description: 'Lorem ipsum dolor sit amet',
    credits: 100,
    features: [
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
      'Lorem ipsum dolor sit amet, consetetur sadipscingr',
      'Lorem ipsum dolor sit amet, consetetur sadipscingl',
      'Lorem ipsum dolor sit amet, consetetur sadipscing',
    ],
    stripePriceId: STRIPE_PRICE_ID_2,
  },
]
