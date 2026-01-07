// app/(dashboard)/_components/RenewSubscriptionButton.tsx

'use client'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { renewSubscription } from '../dashboard/billing/actions'

export function RenewSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className='h-8 text-xs px-3'>Renew Now</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Renew Subscription Early?</AlertDialogTitle>
          <AlertDialogDescription>
            This will take you to Stripe to <strong>immediately</strong> renew your subscription.
            <br /><br />
            • You can confirm payment details.<br />
            • A new billing cycle will start immediately.<br />
            • New credits will be added to your account.<br />
            • Any remaining days in your current cycle will be forfeited.
            <br /><br />
            Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button 
            disabled={loading} 
            onClick={async (e: React.MouseEvent) => {
              e.preventDefault()
              setLoading(true)
              try {
                const result = await renewSubscription()
                if (result.success && result.url) {
                   window.location.href = result.url
                } else {
                   setLoading(false)
                   console.error(result.message)
                   alert(`Failed: ${result.message}`)
                }
              } catch (err) {
                console.error(err)
                alert('Failed to renew. Please try again or contact support.')
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? 'Processing...' : 'Confirm Renewal'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
