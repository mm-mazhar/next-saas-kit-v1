// app/lib/email.ts

import { SITE_LOGO_PATH } from '@/app/(marketing)/_components/Sitelogo'
import { APP_EMAIL, NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import fs from 'node:fs'
import path from 'node:path'
import { Resend, type CreateEmailOptions } from 'resend'

type PaymentEmailParams = {
  to: string
  name?: string | null
  amountPaid: number
  currency: string
  invoiceUrl: string
  invoiceNumber?: string | null
  planTitle?: string | null
  periodEnd?: number | null
  portalUrl?: string | null
  from?: string
}

const resend = new Resend(process.env.RESEND_API_KEY as string)

function formatCurrency(amountInSmallestUnit: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amountInSmallestUnit / 100)
  } catch {
    return `${amountInSmallestUnit / 100} ${currency.toUpperCase()}`
  }
}

export async function sendPaymentConfirmationEmail(params: PaymentEmailParams) {
  const fromAddress = params.from ?? (process.env.RESEND_FROM || APP_EMAIL)
  const displayName = params.name || 'Customer'
  const amountText = formatCurrency(params.amountPaid, params.currency)
  const periodText = params.periodEnd
    ? new Date(params.periodEnd * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const subject = `Payment Confirmation${params.invoiceNumber ? ` - ${params.invoiceNumber}` : ''}`
  const origin = process.env.NEXT_PUBLIC_SITE_URL || ''
  const isLocal = !origin || /localhost|127\.0\.0\.1|192\.168\./i.test(origin)
  let logoUrl = origin ? new URL(SITE_LOGO_PATH, origin).href : ''
  if (isLocal) {
    try {
      const filePath = path.join(process.cwd(), 'public', SITE_LOGO_PATH.replace(/^\//, ''))
      const buf = fs.readFileSync(filePath)
      logoUrl = `data:image/png;base64,${buf.toString('base64')}`
    } catch {}
  }
  const html = `
  <div style="background:#f6f9fc;padding:24px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;text-align:left;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a">
      <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #eaeaea">
        ${logoUrl ? `<img src="${logoUrl}" width="40" height="40" alt="" style="border-radius:8px;display:block;object-fit:contain"/>` : ''}
        <div style="font-size:18px;font-weight:700">${NEXT_PUBLIC_SITE_NAME}</div>
      </div>
      <div style="padding:24px 20px">
        <p style="margin:0 0 8px 0">Hi ${displayName},</p>
        <div style="line-height:16px">&nbsp;</div>
        <p style="margin:0 0 16px 0">Thank you for your payment for "${params.planTitle || NEXT_PUBLIC_SITE_NAME}".</p>
        <div style="margin:16px 0;padding:16px;border:1px solid #eaeaea;border-radius:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#6b7280">Amount:&nbsp;</span><span style="font-weight:600"> ${amountText}</span></div>
          ${params.invoiceNumber ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#6b7280">Invoice:&nbsp;</span><span style="font-weight:600"> ${params.invoiceNumber}</span></div>` : ''}
          ${periodText ? `<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Current period ends&nbsp;</span><span style="font-weight:600">${periodText}</span></div>` : ''}
        </div>
        <p style="margin:0 0 12px 0">You can view or download your invoice here:</p>
        <p style="margin:0 0 20px 0"><a href="${params.invoiceUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 16px;border-radius:8px">View Invoice</a></p>
        ${params.portalUrl ? `<p style="margin:0 0 8px 0"><a href="${params.portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#111827;color:#ffffff;font-weight:600;text-decoration:none;padding:10px 14px;border-radius:8px">Manage Subscription</a></p>` : ''}
        <p style="margin:16px 0 0 0;color:#6b7280">If you have any questions, reply to this email.</p>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #eaeaea;text-align:center;color:#6b7280;font-size:12px">
        <div>© ${new Date().getFullYear()} ${NEXT_PUBLIC_SITE_NAME}</div>
        ${origin ? `<div><a href="${origin}" target="_blank" rel="noopener noreferrer" style="color:#6b7280;text-decoration:none">${origin.replace(/^https?:\/\//,'')}</a></div>` : ''}
      </div>
    </div>
  </div>
  `

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: params.to,
    subject,
    html,
    replyTo: process.env.SUPPORT_EMAIL || fromAddress,
  } as CreateEmailOptions)
  if (error) {
    throw new Error(typeof error === 'string' ? error : (error?.message ?? 'Email send failed'))
  }
  return data?.id ?? null
}

type BasicEmailParams = {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
}

export async function sendBasicEmail(params: BasicEmailParams) {
  const fromAddress = params.from ?? (process.env.RESEND_FROM || APP_EMAIL)
  const opts: CreateEmailOptions = params.html
    ? {
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }
    : {
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.text ?? '',
      }
  const { data, error } = await resend.emails.send(opts)
  if (error) {
    throw new Error(typeof error === 'string' ? error : (error?.message ?? 'Email send failed'))
  }
  return data?.id ?? null
}

type CancellationParams = {
  to: string
  name?: string | null
  planTitle?: string | null
  effectiveDate?: number | null
  final?: boolean
  from?: string
}

export async function sendCancellationEmail(params: CancellationParams) {
  const fromAddress = params.from ?? (process.env.RESEND_FROM || APP_EMAIL)
  const displayName = params.name || 'Customer'
  const subject = params.final
    ? 'Subscription Canceled'
    : 'Subscription Cancellation Scheduled'
  const origin = process.env.NEXT_PUBLIC_SITE_URL || ''
  const isLocal = !origin || /localhost|127\.0\.0\.1|192\.168\./i.test(origin)
  let logoUrl = origin ? new URL(SITE_LOGO_PATH, origin).href : ''
  if (isLocal) {
    try {
      const filePath = path.join(process.cwd(), 'public', SITE_LOGO_PATH.replace(/^\//, ''))
      const buf = fs.readFileSync(filePath)
      logoUrl = `data:image/png;base64,${buf.toString('base64')}`
    } catch {}
  }
  const effectiveText = params.effectiveDate
    ? new Date(params.effectiveDate * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const headline = params.final
    ? 'Your subscription has been canceled.'
    : 'Your subscription cancellation has been scheduled.'
  const detailLine = params.final
    ? 'Access will cease in accordance with your plan terms.'
    : effectiveText
      ? `Your plan will remain active until ${effectiveText}.`
      : 'Your plan will remain active until the end of the current period.'
  const html = `
  <div style="background:#f6f9fc;padding:24px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;text-align:left;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a">
      <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #eaeaea">
        ${logoUrl ? `<img src="${logoUrl}" width="40" height="40" alt="" style="border-radius:8px;display:block;object-fit:contain"/>` : ''}
        <div style="font-size:18px;font-weight:700">${NEXT_PUBLIC_SITE_NAME}</div>
      </div>
      <div style="padding:24px 20px">
        <p style="margin:0 0 8px 0">Hi ${displayName},</p>
        <div style="line-height:16px">&nbsp;</div>
        <p style="margin:0 0 12px 0">${headline}</p>
        <p style="margin:0 0 16px 0">Plan: <strong> ${params.planTitle || 'Subscription'}</strong></p>
        <div style="margin:16px 0;padding:16px;border:1px solid #eaeaea;border-radius:8px">
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Status:&nbsp;</span><span style="font-weight:600">${params.final ? 'Canceled' : (effectiveText ? `Cancel at ${effectiveText}` : 'Cancel at period end')}</span></div>
          <div style="margin-top:8px;color:#374151">${detailLine}</div>
        </div>
        <p style="margin:16px 0 0 0;color:#6b7280">If this was unintentional, you can reactivate from the billing portal.</p>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #eaeaea;text-align:center;color:#6b7280;font-size:12px">
        <div>© ${new Date().getFullYear()} ${NEXT_PUBLIC_SITE_NAME}</div>
        ${origin ? `<div><a href="${origin}" target="_blank" rel="noopener noreferrer" style="color:#6b7280;text-decoration:none">${origin.replace(/^https?:\/\//,'')}</a></div>` : ''}
      </div>
    </div>
  </div>
  `

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: params.to,
    subject,
    html,
    replyTo: process.env.SUPPORT_EMAIL || fromAddress,
  } as CreateEmailOptions)
  if (error) {
    throw new Error(typeof error === 'string' ? error : (error?.message ?? 'Email send failed'))
  }
  return data?.id ?? null
}

type RenewalReminderParams = {
  to: string
  name?: string | null
  planTitle?: string | null
  periodEnd: number
  creditsRemaining?: number
  from?: string
  portalUrl?: string | null
}

export async function sendRenewalReminderEmail(params: RenewalReminderParams) {
  const fromAddress = params.from ?? (process.env.RESEND_FROM || APP_EMAIL)
  const displayName = params.name || 'Customer'
  const origin = process.env.NEXT_PUBLIC_SITE_URL || ''
  const isLocal = !origin || /localhost|127\.0\.0\.1|192\.168\./i.test(origin)
  let logoUrl = origin ? new URL(SITE_LOGO_PATH, origin).href : ''
  if (isLocal) {
    try {
      const filePath = path.join(process.cwd(), 'public', SITE_LOGO_PATH.replace(/^\//, ''))
      const buf = fs.readFileSync(filePath)
      logoUrl = `data:image/png;base64,${buf.toString('base64')}`
    } catch {}
  }
  const periodText = new Date(params.periodEnd * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const creditsLine = typeof params.creditsRemaining === 'number' && params.creditsRemaining > 0
    ? `<div style="margin-top:8px;color:#374151">You have <strong>${params.creditsRemaining}</strong> credits remaining. Unused credits will expire on <strong>${periodText}</strong>.</div>`
    : ''
  const html = `
  <div style="background:#f6f9fc;padding:24px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;text-align:left;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a">
      <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #eaeaea">
        ${logoUrl ? `<img src="${logoUrl}" width="40" height="40" alt="" style="border-radius:8px;display:block;object-fit:contain"/>` : ''}
        <div style="font-size:18px;font-weight:700">${NEXT_PUBLIC_SITE_NAME}</div>
      </div>
      <div style="padding:24px 20px">
        <p style="margin:0 0 8px 0">Hi ${displayName},</p>
        <div style="line-height:16px">&nbsp;</div>
        <p style="margin:0 0 12px 0">Your subscription ${params.planTitle ? ` for "${params.planTitle}"` : ''} is scheduled to renew on <strong>${periodText}</strong>.</p>
        <div style="margin:16px 0;padding:16px;border:1px solid #eaeaea;border-radius:8px">
          <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Renewal date:&nbsp;</span><span style="font-weight:600"> ${periodText}</span></div>
          ${creditsLine}
        </div>
        ${params.portalUrl ? `<p style="margin:0 0 8px 0"><a href="${params.portalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#111827;color:#ffffff;font-weight:600;text-decoration:none;padding:10px 14px;border-radius:8px">Manage Subscription</a></p>` : ''}
        <p style="margin:16px 0 0 0;color:#6b7280">If you need to make changes to your plan or payment details, visit the billing portal.</p>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #eaeaea;text-align:center;color:#6b7280;font-size:12px">
        <div>© ${new Date().getFullYear()} ${NEXT_PUBLIC_SITE_NAME}</div>
        ${origin ? `<div><a href="${origin}" target="_blank" rel="noopener noreferrer" style="color:#6b7280;text-decoration:none">${origin.replace(/^https?:\/\//,'')}</a></div>` : ''}
      </div>
    </div>
  </div>
  `

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: params.to,
    subject: 'Upcoming Subscription Renewal',
    html,
    replyTo: process.env.SUPPORT_EMAIL || fromAddress,
  } as CreateEmailOptions)
  if (error) {
    throw new Error(typeof error === 'string' ? error : (error?.message ?? 'Email send failed'))
  }
  return data?.id ?? null
}

