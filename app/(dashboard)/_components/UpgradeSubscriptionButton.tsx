// app/(dashboard)/_components/UpgradeSubscriptionButton.tsx

'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { createSubscriptionAction } from '../dashboard/billing/actions'

type Props = {
  planId: string
  hasActiveSubscription: boolean
}

export function UpgradeSubscriptionButton({ planId, hasActiveSubscription }: Props) {
  if (!hasActiveSubscription) {
    return (
      <form action={createSubscriptionAction}>
        <input type='hidden' name='planId' value={planId} />
        <Button type='submit' className='h-8 text-xs px-3'>Upgrade now</Button>
      </form>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className='h-8 text-xs px-3'>Upgrade now</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            You already have an active subscription. If you proceed, your existing subscription will be canceled immediately, but you can retain your remaining credits.
            <br /><br />
            Are you sure you want to upgrade?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={createSubscriptionAction} className="inline-block">
            <input type='hidden' name='planId' value={planId} />
            <AlertDialogAction type="submit">Confirm Upgrade</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
