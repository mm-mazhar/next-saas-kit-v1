// app/lib/stripe.ts

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-09-30.clover',
  // apiVersion: '2025-06-30.basil',
  typescript: true,
})

export const getStripeSession = async ({
  priceId,
  domainUrl,
  customerId,
}: {
  priceId: string
  domainUrl: string
  customerId?: string
}) => {
  const payload: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    billing_address_collection: 'auto',
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ['card'],
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
    success_url: `${domainUrl}/payment/success`,
    cancel_url: `${domainUrl}/payment/unsuccessful`,
    allow_promotion_codes: true,
  }

  if (customerId && customerId.startsWith('cus_')) {
    payload.customer = customerId
  } else {
    payload.customer_creation = 'always'
  }

  const session = await stripe.checkout.sessions.create(payload)

  return session.url as string
}
