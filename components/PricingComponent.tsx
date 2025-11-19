// components/PricingComponent.tsx

'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PRICING_PLANS, type PricingPlan } from '@/lib/constants'
import Link from 'next/link' // Ensure Link is imported

export type PricingComponentProps = {
  currentPlanId: 'free' | 'pro' | 'pro_plus' | null
  isAuthenticated?: boolean
  mode?: 'marketing' | 'billing'
  onSubscribeAction?: (formData: FormData) => Promise<void> | void
  onFreeAction?: (formData: FormData) => Promise<void> | void
}

export default function PricingComponent({
  currentPlanId,
  isAuthenticated = false,
  mode = 'billing',
  onSubscribeAction,
}: PricingComponentProps) {
  const isBillingFreeState =
    mode === 'billing' && (currentPlanId === null || currentPlanId === 'free')
  const visiblePlans =
    mode === 'billing' &&
    (currentPlanId === 'pro' || currentPlanId === 'pro_plus')
      ? PRICING_PLANS.filter((p) => p.id !== 'free')
      : PRICING_PLANS

  const gridColsClass =
    mode === 'marketing'
      ? 'grid grid-cols-1 md:grid-cols-3 gap-2 justify-items-center justify-center'
      : `grid grid-cols-1 ${
          visiblePlans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
        } ${isBillingFreeState ? 'gap-8 xl:gap-10' : 'gap-4'} justify-center`
  const headerPaddingClass = isBillingFreeState ? 'p-6' : 'p-4'
  const contentPaddingXClass = isBillingFreeState ? 'px-6' : 'px-4'
  const priceTextSizeClass = isBillingFreeState ? 'text-6xl' : 'text-5xl'
  const renderButton = (plan: PricingPlan) => {
    const isCurrent = currentPlanId === plan.id

    if (mode === 'marketing') {
      if (!isAuthenticated) {
        return (
          <Button className='w-full' asChild>
            <Link href='/get-started?next=/dashboard/billing'>Subscribe</Link>
          </Button>
        )
      }

      if (isAuthenticated && currentPlanId === null) {
        if (plan.id === 'free') {
          return (
            <Button className='w-full' asChild>
              <Link href='/dashboard'>Go to Dashboard</Link>
            </Button>
          )
        }
        return (
          <Button className='w-full' asChild>
            <Link href='/dashboard/billing'>Upgrade, go to Billing</Link>
          </Button>
        )
      }

      if (currentPlanId === 'free') {
        if (plan.id === 'free') {
          return (
            <Button className='w-full' asChild>
              <Link href='/dashboard'>Go to Dashboard</Link>
            </Button>
          )
        }
        return (
          <Button className='w-full' asChild>
            <Link href='/dashboard/billing'>Upgrade, go to Billing</Link>
          </Button>
        )
      }

      if (currentPlanId === 'pro') {
        if (plan.id === 'free') {
          return (
            <Button className='w-full' disabled>
              Current Plan Unavailable
            </Button>
          )
        }
        if (plan.id === 'pro') {
          return (
            <Button className='w-full' asChild>
              <Link href='/dashboard'>Go To Dashboard</Link>
            </Button>
          )
        }
        return (
          <Button className='w-full' asChild>
            <Link href='/dashboard/billing'>Upgrade, go to Billing</Link>
          </Button>
        )
      }

      if (currentPlanId === 'pro_plus') {
        if (plan.id === 'pro_plus') {
          return (
            <Button className='w-full' asChild>
              <Link href='/dashboard'>Go to Dashboard</Link>
            </Button>
          )
        }
        return (
          <Button className='w-full' disabled>
            Current Plan Unavailable
          </Button>
        )
      }
    }

    // --- Logic for the 'billing' mode ---
    if (plan.id === 'free') {
      if (currentPlanId === 'pro' || currentPlanId === 'pro_plus') {
        return (
          <Button className='w-full' disabled>
            Current Plan Unavailable
          </Button>
        )
      }
      return (
        <Button className='w-full' asChild>
          <Link href='/dashboard'>Go to Dashboard</Link>
        </Button>
      )
    }

    if (onSubscribeAction) {
      if (isCurrent) {
        return (
          <Button className='w-full' asChild>
            <Link href='/dashboard'>Go to Dashboard</Link>
          </Button>
        )
      }
      return (
        <form action={onSubscribeAction} className='w-full'>
          <input type='hidden' name='planId' value={plan.id} />
          <Button className='w-full' disabled={false}>
            {currentPlanId ? 'Upgrade' : 'Subscribe'}
          </Button>
        </form>
      )
    }

    return (
      <Button className='w-full' asChild disabled={isCurrent}>
        <Link href='/get-started'>
          {isCurrent ? 'Current Plan' : 'Subscribe'}
        </Link>
      </Button>
    )
  }

  // The rest of your component remains the same
  return (
    <div className={gridColsClass}>
      {visiblePlans.map((plan) => (
        <Card
          key={plan.id}
          className={`flex flex-col ${
            mode === 'marketing' ? 'w-full max-w-sm mx-2' : 'w-full'
          }`}
        >
          <CardHeader className={headerPaddingClass}>
            <div className='flex items-center justify-between'>
              <CardTitle>{plan.title}</CardTitle>
              {(plan.id === 'free' &&
                ((mode === 'marketing' &&
                  isAuthenticated &&
                  (currentPlanId === null || currentPlanId === 'free')) ||
                  (mode === 'billing' &&
                    (currentPlanId === null || currentPlanId === 'free')))) ||
              (plan.id === 'pro' &&
                currentPlanId === 'pro' &&
                (mode === 'marketing' || mode === 'billing')) ||
              (plan.id === 'pro_plus' &&
                currentPlanId === 'pro_plus' &&
                (mode === 'marketing' || mode === 'billing')) ? (
                <span className='text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-600/20'>
                  Subscribed
                </span>
              ) : null}
            </div>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className={`flex-grow space-y-4 ${contentPaddingXClass}`}>
            <div className={`flex items-baseline ${priceTextSizeClass} font-extrabold`}>
              ${plan.price}
              <span className='ml-1 text-2xl text-muted-foreground'>
                {plan.priceSuffix}
              </span>
            </div>
            <ul className='space-y-1.5 text-sm'>
              {plan.features.map((f, i) => (
                <li key={i} className='flex items-center gap-2'>
                  <span>•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className='p-4 pt-0'>{renderButton(plan)}</CardFooter>
        </Card>
      ))}
    </div>
  )
}
