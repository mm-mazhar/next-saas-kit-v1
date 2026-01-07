## Comprehensive Prompt to Remove "Pay As You Go" (PAYG) from the System

### Executive Summary

Remove all "Pay As You Go" (one-time credit purchase) functionality, keeping only subscription-based plans (Free, Pro, Pro Plus). This will simplify the billing system and eliminate duplicate email triggers.

---

### 1. Database Schema Changes

#### A. Organization Table - Remove `lastPaygPurchaseAt` Column

**File:** Prisma schema (typically `prisma/schema.prisma`)

```prisma
// REMOVE this column from Organization model:
lastPaygPurchaseAt DateTime? @db.Timestamptz

// Optional: If you want to keep for analytics but ignore in logic, add @Deprecated comment
```

**Migration:**
```sql
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "lastPaygPurchaseAt";
```

---

### 2. Constants/Config Changes

#### A. [`lib/constants.ts`](lib/constants.ts)

**REMOVE from `PLAN_IDS`:**
```typescript
// REMOVE this line:
payg: 'X6t!RNJPq#7Jdb',       // random generated
```

**UPDATE `PRICING_PLANS` array:**
```typescript
// REMOVE the entire PAYG plan object:
{
  id: PLAN_IDS.payg,
  title: 'Pay As You Go',
  price: '5',
  priceSuffix: '/one-time',
  description: 'Lorem ipsum dolor sit amet',
  credits: 50,
  features: [...],
  stripePriceId: STRIPE_PRICE_ID_3, // If exists
}
```

---

### 3. Stripe Integration Changes

#### A. [`app/lib/stripe.ts`](app/lib/stripe.ts)

**REMOVE the `mode === 'payment'` handling:**

```typescript
// REMOVE lines 36-38 and 43-44:
// if (mode === 'payment') {
//   payload.invoice_creation = { enabled: true }
// }
// ...
// } else if (mode === 'payment') {
//   payload.customer_creation = 'always'
// }
```

**SIMPLIFY `getStripeSession` function:**
```typescript
// The function should only support 'subscription' mode now
// Remove mode parameter or enforce mode === 'subscription'
```

#### B. [`app/api/webhook/stripe/route.ts`](app/api/webhook/stripe/route.ts)

**REMOVE entire "PAY AS YOU GO" section (lines 71-136):**

```typescript
// REMOVE this entire block:
// // A. PAY AS YOU GO
// if (session.mode === 'payment') {
//   const sessionCreatedDate = ...
//   await prisma.$transaction(async (tx) => { ... })
//   const owner = ...
//   if (to) { await sendPaymentConfirmationEmail({ ... }) }
//   return new Response(null, { status: 200 })
// }
```

---

### 4. UI Component Changes

#### A. [`app/(dashboard)/dashboard/billing/page.tsx`](app/(dashboard)/dashboard/billing/page.tsx)

**REMOVE PAYG-related logic:**
- Remove `hasPayg` variable
- Remove PAYG note/display logic
- Remove PAYG from pricing display

**BEFORE:**
```typescript
const hasPayg = !!data.org.lastPaygPurchaseAt
const note = hasPayg 
  ? isSubActive 
    ? `Subscription takes precedence over Pay As You Go...`
    : `Using Pay As You Go until credits are exhausted...`
  : null
```

**AFTER:**
```typescript
// Remove note variable entirely - no longer needed
```

#### B. [`app/(dashboard)/layout.tsx`](app/(dashboard)/layout.tsx)

**REMOVE `paygEligible` logic:**

```typescript
// REMOVE these lines:
// const paygEligible = !!orgBilling?.lastPaygPurchaseAt
// const effectivePlan: PlanId = subStatus === 'active' ? (currentPlan ?? PLAN_IDS.free) : paygEligible ? PLAN_IDS.pro : PLAN_IDS.free
// const creditsTotal = PRICING_PLANS.find((p) => p.id === effectivePlan)?.credits ?? 0
```

**SIMPLIFY to:**
```typescript
const effectivePlan: PlanId = subStatus === 'active' ? (currentPlan ?? PLAN_IDS.free) : PLAN_IDS.free
const creditsTotal = PRICING_PLANS.find((p) => p.id === effectivePlan)?.credits ?? 0
```

#### C. [`app/(dashboard)/_components/ClientAppSidebar.tsx`](app/(dashboard)/_components/ClientAppSidebar.tsx)

**REMOVE `paygEligible` from props and usage**

#### D. [`app/(dashboard)/_components/nav-user.tsx`](app/(dashboard)/_components/nav-user.tsx)

**REMOVE:**
- `paygEligible` variable
- `{currentPlanId === PLAN_IDS.payg ? (...) : null}` conditional rendering

#### E. [`components/PricingComponent.tsx`](components/PricingComponent.tsx)

**REMOVE PAYG plan handling:**
- Remove `PLAN_IDS.payg` comparisons
- Remove "Purchase Credits" button text
- Remove "Pay As You Go" badge display
- Simplify plan logic to only handle `free`, `pro`, `proplus`

---

### 5. Marketing Pages Changes

#### A. [`app/(marketing)/_components/hero-section.tsx`](app/(marketing)/_components/hero-section.tsx)

**REMOVE:**
```typescript
// REMOVE these lines:
const paygCredits = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)?.credits ?? 0
const paygEligible = !!orgBilling?.lastPaygPurchaseAt && creditsUsed < paygCredits
return paygEligible ? PLAN_IDS.pro : null
```

#### B. [`app/(marketing)/_components/FaqList.tsx`](app/(marketing)/_components/FaqList.tsx)

**REMOVE or UPDATE these FAQ entries:**
- "Do 'Pay As You Go' credits expire?" (ID: 11)
- Any FAQ mentioning "Pay As You Go"

---

### 6. Email Template Changes

#### A. [`app/lib/email.ts`](app/lib/email.ts)

**UPDATE `sendPaymentConfirmationEmail`:**
- Change `planTitle: 'Pay As You Go'` to appropriate subscription plan name
- Remove PAYG-specific messaging

---

### 7. Super Admin Dashboard Changes

#### A. [`app/(super-admin)/admin/page.tsx`](app/(super-admin)/admin/page.tsx)

**REMOVE PAYG revenue calculations:**
```typescript
// REMOVE:
// const paygPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.pro)
// const paygPrice = Number(paygPlan?.price ?? 5)
// const paygOrgsCount = await prisma.organization.count({ where: { lastPaygPurchaseAt: { not: null } } })
// const paygRevenue = paygOrgsCount * paygPrice
```

**UPDATE dashboard cards:**
- Remove "Pay As You Go (Est.)" revenue card

#### B. [`app/(super-admin)/_components/dashboard-actions.tsx`](app/(super-admin)/_components/dashboard-actions.tsx)

**REMOVE `paygRevenue` from CSV export:**
```typescript
// REMOVE line:
// csvContent += `Pay As You Go Revenue,${stats.paygRevenue}\n`;
```

---

### 8. Cron Job Changes

#### A. [`app/api/cron/daily-maintenance/route.ts`](app/api/cron/daily-maintenance/route.ts)

**REMOVE `lastPaygPurchaseAt` references** (if used for anything else)

---

### 9. Cleanup Tasks

#### A. Delete Old Migrations (Optional)
```
prisma/migrations/XXXX_add_last_payg_purchase_at/
```

#### B. Run New Migration
```bash
npx prisma migrate dev --name remove_payg
```

#### C. Regenerate Prisma Client
```bash
npx prisma generate
```

---

### 10. Testing Checklist

- [ ] Free tier organizations get 5 credits monthly
- [ ] Pro/Pro Plus subscriptions work correctly
- [ ] Upgrading from Free → Pro works
- [ ] Upgrading from Pro → Pro Plus works
- [ ] No "Pay As You Go" mentions in UI
- [ ] No duplicate emails sent
- [ ] Dashboard revenue only shows MRR (no PAYG)
- [ ] Super admin CSV export is correct
- [ ] All tests pass

---

### 11. Stripe Dashboard Actions

1. **Remove PAYG Product/Prices** from Stripe Dashboard
2. **Update Webhook** to only handle subscription events
3. **Test checkout flow** with new subscription-only mode

---

### Summary of Files to Modify

| File | Change Type |
|------|-------------|
| `lib/constants.ts` | REMOVE PAYG plan + ID |
| `app/lib/stripe.ts` | REMOVE payment mode logic |
| `app/api/webhook/stripe/route.ts` | REMOVE PAYG checkout handler |
| `app/(dashboard)/dashboard/billing/page.tsx` | REMOVE PAYG UI |
| `app/(dashboard)/layout.tsx` | REMOVE paygEligible logic |
| `app/(dashboard)/_components/ClientAppSidebar.tsx` | REMOVE paygEligible prop |
| `app/(dashboard)/_components/nav-user.tsx` | REMOVE PAYG badge |
| `components/PricingComponent.tsx` | REMOVE PAYG plan handling |
| `app/(marketing)/_components/hero-section.tsx` | REMOVE PAYG logic |
| `app/(marketing)/_components/FaqList.tsx` | REMOVE PAYG FAQs |
| `app/lib/email.ts` | UPDATE email templates |
| `app/(super-admin)/admin/page.tsx` | REMOVE PAYG revenue |
| `app/(super-admin)/_components/dashboard-actions.tsx` | REMOVE CSV export |
| Prisma schema | REMOVE lastPaygPurchaseAt column |
