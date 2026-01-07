// app/(marketing)/_components/hero-section.tsx

import { AnimatedGroup } from '@/app/(marketing)/_components/ui/animated-group'
import AnimatedShinyText from '@/app/(marketing)/_components/ui/animated-shiny-text'
import { HyperText } from '@/app/(marketing)/_components/ui/hyper-text'
import TextEffect from '@/app/(marketing)/_components/ui/text-effect'
import { PageSection } from '@/components/page-section'
import PricingComponent from '@/components/PricingComponent'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import HeroLight from '@/public/HeroDark-02.png'
import HeroDark from '@/public/HeroDark-03.png'
// import HeroLight from '@/public/HeroDark-04.png'
// import HeroDark from '@/public/HeroLight-03.png'
import BackgroundImage from '@/public/night-background.webp'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// import ArcjetLogo from '@/public/companies/arcjet.jpg'
// import MotionLogo from '@/public/companies/motion.jpg'
// import ShadCNLogo from '@/public/companies/shadcn.png'
// import TailwindCSSLogo from '@/public/companies/tailwindcss.png'
// import OrpcLogo from '@/public/companies/orpc.jpg'
// import NextLogo from 'public/companies/nextjs.png'
// import VercelLogo from 'public/companies/vercel.png'
// import supabaseLogo from 'public/companies/supabase.png'
// import PrismaLogo from 'public/companies/prisma.png'
// import { ChevronRight } from 'lucide-react'

import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import {
  APP_DESCRIPTION,
  APP_DESCRIPTION_LONG,
  APP_SLOGAN,
  PLAN_IDS,
  PRICE_HEADING,
  PRICING_PLANS,
  type PlanId,
  type PricingPlan,
} from '@/lib/constants'

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { type: 'spring' as const, bounce: 0.3, duration: 1.5 },
    },
  },
}

export default async function HeroSection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get Organization Billing Data
  let orgBilling = null
  if (user) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { 
        organization: { 
          include: { subscription: true } 
        } 
      },
      orderBy: { createdAt: 'asc' }
    })
    orgBilling = membership?.organization
  }

  const subStatus = orgBilling?.subscription?.status ?? null
  const rawPlanId = orgBilling?.subscription?.planId ?? null
  const creditsUsed = orgBilling?.credits ?? 0
  const paygCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 0
  const paygEligible = !!orgBilling?.lastPaygPurchaseAt && creditsUsed < paygCredits
  const currentPlanId: PlanId | null = (() => {
    if (subStatus === 'active') {
      if (!rawPlanId) return PLAN_IDS.free
      if (rawPlanId === PLAN_IDS.free) return PLAN_IDS.free
      const matched = PRICING_PLANS.find((p: PricingPlan) => p.stripePriceId === rawPlanId)
      return matched?.id ?? PLAN_IDS.free
    }
    return paygEligible ? PLAN_IDS.pro : null
  })()

  const proCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.proplus)?.credits ?? 0
  const proExhausted = (subStatus === 'active' && currentPlanId === PLAN_IDS.proplus) ? (creditsUsed >= proCredits) : false

  return (
    <>
      <main className='overflow-hidden relative'>
        {/* --- BACKGROUND LAYER --- */}
        <div aria-hidden className='absolute inset-0 isolate hidden opacity-65 contain-strict lg:block'>
          <div className='w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]' />
          <div className='h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]' />
          <div className='h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]' />
        </div>
        <AnimatedGroup
          variants={{
            container: { visible: { transition: { delayChildren: 1 } } },
            item: {
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.3, duration: 2 } },
            },
          }}
          className='mask-b-from-35% mask-b-to-90% absolute inset-0 -z-20 hidden dark:block'
        >
          <Image src={BackgroundImage} alt='background' className='size-full object-cover' fill priority />
        </AnimatedGroup>
        <div aria-hidden className='absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]' />

        {/* --- CONTENT LAYER --- */}
        <div className='relative z-10'>
          
          <PageSection className='pt-16 md:pt-24 pb-0'>
          {/* <PageSection> */}
            
            {/* 
              ✅ TEXT CLUSTER WRAPPER 
              This 'flex flex-col gap-8' controls the spacing between 
              Badge, H1, P, and Buttons uniformly.
            */}
            <div className='pt-8 mx-auto flex max-w-4xl flex-col items-center gap-6 text-center md:pt-12'>
              
              {/* 1. BADGE */}
              <AnimatedGroup variants={transitionVariants}>
                <Link
                  href='/get-started'
                  className='hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border py-1 px-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950 relative overflow-hidden'
                >
                  <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
                  <AnimatedShinyText className='inline-flex items-center justify-center px-1 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400'>
                    <span className='text-primary text-sm'>✨ {APP_SLOGAN}</span>
                  </AnimatedShinyText>
                  <span className='dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700'></span>
                  <div className='bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500'>
                    <div className='flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0'>
                      <span className='flex size-6'><ArrowRight className='m-auto size-3' /></span>
                      <span className='flex size-6'><ArrowRight className='m-auto size-3' /></span>
                    </div>
                  </div>
                </Link>
              </AnimatedGroup>

              {/* 2. HEADLINE (Removed mt-classes for unified spacing) */}
              <TextEffect
                preset='fade-in-blur'
                speedSegment={0.3}
                as='h1'
                className='pt-8 mx-auto max-w-4xl text-balance text-5xl max-md:font-semibold md:pt-12 md:text-7xl xl:text-[5.25rem]'
              >
                {APP_DESCRIPTION}
              </TextEffect>

              {/* 3. SUBHEAD (Removed mt-8) */}
              <HyperText className='pt-8 max-w-2xl text-balance text-lg text-muted-foreground md:pt-12'>
                {APP_DESCRIPTION_LONG}
              </HyperText>

              {/* 4. BUTTONS (Removed mt-12) */}
              <AnimatedGroup
                variants={{
                  container: {
                    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.75 } },
                  },
                  ...transitionVariants,
                }}
                className='pt-8 flex flex-col items-center justify-center gap-5 md:flex-row md:pt-12'
              >
                {user ? (
                  <Button asChild size='lg' variant='default' className='px-5'>
                    <Link href='/dashboard'><span className='text-nowrap'>Go to Dashboard</span></Link>
                  </Button>
                ) : (
                  <Button asChild size='lg' variant='default' className='px-5'>
                    <Link href='/get-started'><span className='text-nowrap'>Start Building</span></Link>
                  </Button>
                )}
                {/* <Button key={2} asChild size='lg' variant='secondary' className='h-10.5 rounded-xl px-5'>
                  <Link href='#'><span className='text-nowrap'>Request a demo</span></Link>
                </Button> */}
              </AnimatedGroup>
            </div>

            {/* 
              ✅ HERO IMAGE 
              Moved out of the flex cluster. 
              Added 'mt-16 md:mt-24' for deliberate separation.
            */}
            <AnimatedGroup
              variants={{
                container: { visible: { transition: { staggerChildren: 0.05, delayChildren: 0.75 } } },
                ...transitionVariants,
              }}
              className='mt-18'
            >
              <div className='mask-b-from-55% relative overflow-hidden px-2'>
                <div className='inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1'>
                  <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
                  <Image className='bg-background aspect-15/8 relative hidden rounded-2xl dark:block object-contain object-top' src={HeroDark} alt='app screen' width='2700' height='1440' />
                  <Image className='z-2 border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden object-contain object-top' src={HeroLight} alt='app screen' width='2700' height='1440' />
                </div>
              </div>
            </AnimatedGroup>
          </PageSection>

          {/* 
             ✅ PRICING SECTION
             Standard PageSection padding (py-32) handles the top spacing here.
          */}
          <PageSection id='pricing' className='pt-16 pb-16 md:pt-16 md:pb-16'>
          {/* <PageSection> */}
            <div className='flex flex-col items-center gap-4 mb-10 text-center'>
              <h2 className='text-3xl font-bold'>
                {PRICE_HEADING}
              </h2>
              {/* Optional subtext if you want it */}
              {/* <p className="text-muted-foreground">Simple plans for everyone.</p> */}
            </div>
            <div className='pt-10'>
              <PricingComponent
                currentPlanId={currentPlanId}
                isAuthenticated={!!user}
                mode='marketing'
                lastPaygPurchaseAt={orgBilling?.lastPaygPurchaseAt ?? null}
                proExhausted={proExhausted}              
              />
            </div>
          </PageSection>
            {/* ------------- Customer's Logo Section ------------- */}
          {/* <PageSection className='bg-background pb-16 md:pb-32'>
            <div className='group relative m-auto max-w-5xl px-6'>
              <div className='absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100'>
                <Link
                  href='/'
                  className='block text-sm duration-150 hover:opacity-75'
                >
                  <span> Meet Our Customers</span>
                  <ChevronRight className='ml-1 inline-block size-3' />
                </Link>
              </div>
              <div className='group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:gap-x-16 sm:gap-y-14'>
                <div className='flex'>
                  <Image
                    className='mx-auto h-5 object-contain'
                    src={NextLogo}
                    alt='Next Logo'
                  />
                </div>
                // ... other logos
              </div>
            </div>
          </PageSection> */}
        </div>
      </main>
    </>
  )
}
