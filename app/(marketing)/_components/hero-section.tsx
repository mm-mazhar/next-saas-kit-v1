// app/(marketing)/_components/hero-section.tsx

import { PageSection } from '@/components/page-section'
import PricingComponent from '@/components/PricingComponent'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { Button } from '@/components/ui/button'
import { HyperText } from '@/components/ui/hyper-text'
import { TextEffect } from '@/components/ui/text-effect'
import HeroLight from '@/public/HeroDark-02.png'
import HeroDark from '@/public/HeroDark-03.png'
import BackgroundImage from '@/public/night-background.webp'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { HeroHeader } from './header'

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

import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import {
  APP_DESCRIPTION,
  APP_DESCRIPTION_LONG,
  APP_SLOGAN,
  PRICE_HEADING,
  PRICING_PLANS,
  type PricingPlan,
} from '@/lib/constants'

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring' as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

export default async function HeroSection() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const dbUser = user ? await getData(user.id) : null
  const rawPlanId = dbUser?.Subscription?.planId ?? null
  const currentPlanId = (() => {
    if (!rawPlanId) return null
    if (rawPlanId === 'free') return 'free' as const
    const matched = PRICING_PLANS.find(
      (p: PricingPlan) => p.stripePriceId === rawPlanId
    )
    return matched?.id ?? null
  })()

  return (
    <>
      <HeroHeader />
      <main className='overflow-hidden relative'>
        {/* --- BACKGROUND LAYER --- */}
        {/* These elements are positioned absolutely and sit on negative z-indexes */}
        <div
          aria-hidden
          className='absolute inset-0 isolate hidden opacity-65 contain-strict lg:block'
        >
          <div className='w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]' />
          <div className='h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]' />
          <div className='h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]' />
        </div>
        <AnimatedGroup
          variants={{
            container: { visible: { transition: { delayChildren: 1 } } },
            item: {
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { type: 'spring', bounce: 0.3, duration: 2 },
              },
            },
          }}
          className='mask-b-from-35% mask-b-to-90% absolute inset-0 -z-20 hidden dark:block'
        >
          <Image
            src={BackgroundImage}
            alt='background'
            className='size-full object-cover'
            fill
            priority
          />
        </AnimatedGroup>
        <div
          aria-hidden
          className='absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]'
        />

        {/* ✅ THE FIX: A new "content layer" wrapper. */}
        {/* This div is positioned relatively and lifted to a higher z-index (z-10), */}
        {/* ensuring everything inside it is on top of the background and clickable. */}
        <div className='relative z-10'>
          <PageSection>
            <div className='text-center sm:mx-auto lg:mr-auto lg:mt-0'>
              
              <AnimatedGroup variants={transitionVariants}>
                <Link
                  href='/get-started'
                  className='hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border py-1 px-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950'
                >
                  <AnimatedShinyText className='inline-flex items-center justify-center px-1 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400'>
                    <span className='text-primary text-sm'>
                      ✨ {APP_SLOGAN}
                    </span>
                  </AnimatedShinyText>

                  <span className='dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700'></span>
                  <div className='bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500'>
                    <div className='flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0'>
                      <span className='flex size-6'>
                        <ArrowRight className='m-auto size-3' />
                      </span>
                      <span className='flex size-6'>
                        <ArrowRight className='m-auto size-3' />
                      </span>
                    </div>
                  </div>
                </Link>
              </AnimatedGroup>

              <TextEffect
                preset='fade-in-blur'
                speedSegment={0.3}
                as='h1'
                className='mx-auto mt-8 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]'
              >
                {APP_DESCRIPTION}
              </TextEffect>

              {/* <TextEffect
                per='line'
                preset='fade-in-blur'
                speedSegment={0.3}
                delay={0.5}
                as='p'
                className='mx-auto mt-8 max-w-2xl text-balance text-lg'
              >
                {APP_DESCRIPTION_LONG}
              </TextEffect> */}
              <HyperText className='mx-auto mt-8 max-w-2xl text-balance text-lg'>
                {APP_DESCRIPTION_LONG}
              </HyperText>

              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.75,
                      },
                    },
                  },
                  ...transitionVariants,
                }}
                className='mt-12 flex flex-col items-center justify-center gap-5 md:flex-row'
              >
                {user ? (
                  <Button asChild size='lg' variant='default' className='px-5'>
                    <Link href='/dashboard'>
                      <span className='text-nowrap'>Go to Dashboard</span>
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size='lg' variant='default' className='px-5'>
                    <Link href='/get-started'>
                      <span className='text-nowrap'>Start Building</span>
                    </Link>
                  </Button>
                )}
                <Button
                  key={2}
                  asChild
                  size='lg'
                  variant='secondary'
                  className='h-10.5 rounded-xl px-5'
                >
                  {/* <Link href='#link'>
                    <span className='text-nowrap'>Request a demo</span>
                  </Link> */}
                </Button>
              </AnimatedGroup>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className='mask-b-from-55% relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20'>
                <div className='inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1'>
                  <Image
                    className='bg-background aspect-15/8 relative hidden rounded-2xl dark:block object-contain object-top'
                    src={HeroDark}
                    alt='app screen'
                    width='2700'
                    height='1440'
                  />
                  <Image
                    className='z-2 border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden object-contain object-top'
                    src={HeroLight}
                    alt='app screen'
                    width='2700'
                    height='1440'
                  />
                </div>
              </div>
            </AnimatedGroup>
          </PageSection>

          <PageSection id='pricing'>
            <h2 className='text-3xl font-bold text-center mb-8'>
              {PRICE_HEADING}
            </h2>
            <PricingComponent
              currentPlanId={currentPlanId}
              isAuthenticated={!!user}
              mode='marketing'
            />
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
