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
import { ShineBorder } from '@/components/ui/shine-border'
import { formatPrice, PLAN_IDS, PRICING_PLANS, type PlanId, type PricingPlan } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export type PricingComponentProps = {
  currentPlanId: PlanId | null
  isAuthenticated?: boolean
  mode?: 'marketing' | 'billing'
  onSubscribeAction?: (formData: FormData) => Promise<void> | void
  onFreeAction?: (formData: FormData) => Promise<void> | void
  lastPaygPurchaseAt?: Date | string | number | null
  proExhausted?: boolean
}

export default function PricingComponent({
  currentPlanId,
  isAuthenticated = false,
  mode = 'billing',
  onSubscribeAction,
  lastPaygPurchaseAt,
  proExhausted,
}: PricingComponentProps) {
  void proExhausted
  const isBillingFreeState =
    mode === 'billing' && (currentPlanId === null || currentPlanId === PLAN_IDS.free)
  const visiblePlans =
    mode === 'billing' &&
    (currentPlanId === PLAN_IDS.pro || currentPlanId === PLAN_IDS.proplus)
      ? PRICING_PLANS.filter((p) => p.id !== PLAN_IDS.free)
      : PRICING_PLANS

  const gridColsClass =
    mode === 'marketing'
      ? 'grid grid-cols-1 md:grid-cols-3 gap-2 justify-items-center justify-center'
      : `grid grid-cols-1 ${
          visiblePlans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
        } gap-2 justify-items-stretch`

  const headerPaddingClass =
    mode === 'billing' ? 'p-2' : isBillingFreeState ? 'p-6' : 'p-4'
  
  const contentPaddingXClass =
    mode === 'billing' ? 'px-2' : isBillingFreeState ? 'px-6' : 'px-4'
  
  const footerPaddingClass = 
    mode === 'billing' ? 'p-2 pt-0' : 'p-4 pt-0'

  const priceTextSizeClass =
    mode === 'billing'
      ? 'text-2xl'
      : isBillingFreeState
      ? 'text-6xl'
      : 'text-5xl'
  
  const listTextSizeClass = mode === 'billing' ? 'text-xs' : 'text-sm'

  const renderButton = (plan: PricingPlan) => {
    const btnClass = mode === 'billing' ? 'w-full h-8 text-xs' : 'w-full'
    
    const isCurrent = currentPlanId === plan.id

    if (mode === 'marketing') {
      if (!isAuthenticated) {
        return (
          <Button className={btnClass} asChild>
            <Link href='/get-started?next=/dashboard/billing'>Subscribe</Link>
          </Button>
        )
      }

      if (isAuthenticated && currentPlanId === null) {
        if (plan.id === PLAN_IDS.free) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard'>Go to Dashboard</Link>
            </Button>
          )
        }
        if (plan.id === PLAN_IDS.pro) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard/billing'>Purchase, go to Billing</Link>
            </Button>
          )
        }
        return (
          <Button className={btnClass} asChild>
            <Link href='/dashboard/billing'>Upgrade, go to Billing</Link>
          </Button>
        )
      }

      if (currentPlanId === PLAN_IDS.free) {
        if (plan.id === PLAN_IDS.free) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard'>Go to Dashboard</Link>
            </Button>
          )
        }
        if (plan.id === PLAN_IDS.pro) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard/billing'>Purchase, go to Billing</Link>
            </Button>
          )
        }
        return (
          <Button className={btnClass} asChild>
            <Link href='/dashboard/billing'>Upgrade, go to Billing</Link>
          </Button>
        )
      }

      if (currentPlanId === PLAN_IDS.pro) {
        if (plan.id === PLAN_IDS.free) {
          return (
            <Button className={btnClass} disabled>
              Current Plan Unavailable
            </Button>
          )
        }
        if (plan.id === PLAN_IDS.pro) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard'>Go To Dashboard</Link>
            </Button>
          )
        }
        return (
          <Button className={btnClass} asChild>
            <Link href='/dashboard/billing'>Upgrade, go to Billing</Link>
          </Button>
        )
      }

      if (currentPlanId === PLAN_IDS.proplus) {
        if (plan.id === PLAN_IDS.proplus) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard'>Go to Dashboard</Link>
            </Button>
          )
        }
        if (plan.id === PLAN_IDS.free) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard'>Go to Dashboard</Link>
            </Button>
          )
        }
        if (plan.id === PLAN_IDS.pro) {
          return (
            <Button className={btnClass} asChild>
              <Link href='/dashboard/billing'>Purchase, go to Billing</Link>
            </Button>
          )
        }
      }
    }

    if (plan.id === PLAN_IDS.free) {
      if (currentPlanId === PLAN_IDS.pro || currentPlanId === PLAN_IDS.proplus) {
        return (
          <Button className={btnClass} disabled>
            Current Plan Unavailable
          </Button>
        )
      }
      return (
        <Button className={btnClass} asChild>
          <Link href='/dashboard'>Go to Dashboard</Link>
        </Button>
      )
    }

    if (onSubscribeAction) {
      if (plan.id === PLAN_IDS.pro) {
        const label = mode === 'billing' ? 'Purchase Credits' : 'Purchase Now'
        return (
          <form action={onSubscribeAction} className='w-full'>
            <input type='hidden' name='planId' value={plan.id} />
            <Button className={btnClass} disabled={false}>
              {label}
            </Button>
          </form>
        )
      }
      if (isCurrent) {
        return (
          <Button className={btnClass} asChild>
            <Link href='/dashboard'>Go to Dashboard</Link>
          </Button>
        )
      }
      const label = plan.id === PLAN_IDS.proplus ? 'Subscribe' : (currentPlanId ? 'Upgrade' : 'Subscribe')
      return (
        <form action={onSubscribeAction} className='w-full'>
          <input type='hidden' name='planId' value={plan.id} />
          <Button className={btnClass} disabled={false}>
            {label}
          </Button>
        </form>
      )
    }

    return (
      <Button className={btnClass} asChild disabled={isCurrent}>
        <Link href='/get-started'>
          {isCurrent ? 'Current Plan' : 'Subscribe'}
        </Link>
      </Button>
    )
  }

  return (
    <div className={cn(mode === 'marketing' ? 'mx-auto max-w-6xl' : 'w-full', gridColsClass)}>
      {visiblePlans.map((plan) => (
        <Card
          key={plan.id}
          className={`flex flex-col relative overflow-hidden ${
            mode === 'marketing'
              ? 'w-full max-w-sm mx-2 h-full' // <--- Added h-full for marketing
              : 'w-full h-fit'
          }`}
        >
          {mode === 'marketing' ? (
            <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
          ) : null}
          {null}
          
          <CardHeader className={headerPaddingClass}>
            <div className='flex items-center justify-between'>
              <CardTitle className={mode === 'billing' ? 'text-base' : ''}>{plan.title}</CardTitle>
              {(() => {
                const showFree = plan.id === PLAN_IDS.free && (
                  (mode === 'marketing' && isAuthenticated && !lastPaygPurchaseAt && (currentPlanId === null || currentPlanId === PLAN_IDS.free)) ||
                  (mode === 'billing' && (currentPlanId === null || currentPlanId === PLAN_IDS.free))
                )
                if (showFree) {
                  return (
                    <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30'>
                      Activated
                    </span>
                  )
                }
                const showPayg = plan.id === PLAN_IDS.pro && !!lastPaygPurchaseAt
                if (showPayg) {
                  const raw = lastPaygPurchaseAt
                  const d = typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : raw instanceof Date ? raw : null
                  const dateText = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
                  const label = dateText ? `Purchased: ${dateText}` : 'Purchased'
                  return (
                    <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30'>
                      {label}
                    </span>
                  )
                }
                const showPro = plan.id === PLAN_IDS.proplus && currentPlanId === PLAN_IDS.proplus && (mode === 'marketing' || mode === 'billing')
                if (showPro) {
                  return (
                    <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30'>
                      Subscribed
                    </span>
                  )
                }
                return null
              })()}
            </div>
            <CardDescription className={mode === 'billing' ? 'text-xs' : ''}>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent
            // Added conditional flex-grow below for marketing mode
            className={`${mode === 'marketing' ? 'flex-grow' : ''} ${mode === 'billing' ? 'space-y-1' : 'space-y-4'} ${contentPaddingXClass}`}
          >
            <div
              className={`relative flex items-baseline ${priceTextSizeClass} font-extrabold`}
            >
              {formatPrice(plan.price)}
              <span className='ml-1 text-xl text-muted-foreground'>
                {plan.priceSuffix}
              </span>
              {mode === 'marketing' && plan.id === PLAN_IDS.pro ? (
                <span className='absolute left-1/2 -translate-x-1/2 text-sm font-bold px-4 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30 shadow-sm'>
                  Popular
                </span>
              ) : null}
            </div>
            <ul className={`space-y-1 ${listTextSizeClass}`}>
              {plan.features.map((f, i) => (
                <li key={i} className='flex items-center gap-2'>
                  <span>•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className={footerPaddingClass}>{renderButton(plan)}</CardFooter>
          {mode === 'marketing' ? <ShineBorder /> : null}
        </Card>
      ))}
    </div>
  )
}
