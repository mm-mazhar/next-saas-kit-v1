// lib/constants.ts

// ✅ NEXT APP
export const LOCAL_SITE_URL = process.env.LOCAL_SITE_URL as string
export const PRODUCTION_URL = process.env.PRODUCTION_URL as string
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL as string

// ✅ COLOR SCHEME AND MODE
export const DEFAULT_COLOR_SCHEME = `theme-neutral` as string
export const DEFAULT_THEME_MODE = `dark` as string

// ✅ LOCALE
export const LOCALE = `en_US`
export const DEFAULT_CURRENCY = `USD`

export function formatPrice(
  price: string | number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = LOCALE
) {
  const amount = typeof price === 'string' ? Number(price) : price
  const resolvedLocale = locale.replace('_', '-')
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount}`
  }
}

// ✅ SOCIALS AND SEO
export const NEXT_PUBLIC_SITE_NAME = `Next SaaS Kit v1` as string
export const APP_SLOGAN = `Launch your SaaS faster` as string
export const APP_DESCRIPTION = `Launch your SaaS App 10x Faster` as string
export const APP_DESCRIPTION_LONG =
  `Highly customizable components for building modern websites and applications that look and feel the way you mean it.` as string
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

// ✅ Contact
export const APP_EMAIL = `mail@example.com` as string
export const APP_OFFICE_ADDRESS = `Building Number: 2200, Street Name: Fairmount Avenue, Street Address: Philadelphia Museum of Art, 'Rocky Steps'
State: PA
City: Philadelphia
Post Code: 19130` as string
export const APP_PHONE_1 = `+1 xxx xxxx` as string
export const APP_PHONE_2 = `+1 xxx xxxx` as string

// ✅ Pricing
export const STRIPE_PRICE_ID_1 = (process.env.STRIPE_PRICE_ID_1 || '') as string
export const STRIPE_PRICE_ID_2 = (process.env.STRIPE_PRICE_ID_2 || '') as string

// A new type definition for a pricing plan
export const PRICE_HEADING = `Pricing that scales with your interests` as string
export const PLAN_IDS = {
  free: 'RZ5wzP!PwpF%gj',       // random generated
  pro: 'X6t!RNJPq#7Jdb',       // random generated
  proplus: 'Y9vLm#K2sP!Q4w'    // random generated
} as const
export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS]
export type PricingPlan = {
  id: PlanId
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
    id: PLAN_IDS.free,
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
    id: PLAN_IDS.pro,
    title: 'Pro',
    price: '9.99',
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
    id: PLAN_IDS.proplus,
    title: 'Pro Plus',
    price: '19.99',
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

export const RENEWAL_REMINDER_DAYS_BEFORE = 32
export const CREDIT_REMINDER_THRESHOLD = 10
export const ENABLE_EMAILS = true
export const CHECK_DISPOSABLE_EMAILS = false
export const INVITE_EXPIRATION_MS = 60 * 60 * 1000

// ✅ Multi-Tenancy Limits & Configuration
export const LIMITS = {
  MAX_ORGANIZATIONS_PER_USER: 5,
  MAX_PROJECTS_PER_ORGANIZATION: 10,
  MAX_MEMBERS_PER_ORGANIZATION: 5,
  MAX_PENDING_INVITES_PER_ORG: 3
} as const

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const

export type OrganizationRole = keyof typeof ROLES
