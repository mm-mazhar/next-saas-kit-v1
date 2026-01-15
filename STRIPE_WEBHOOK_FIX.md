# Stripe Webhook Fix - Credit & Email Issues (v2)

## Problems Identified

### 1. **Double Credit Addition (Race Condition)**
- Credits were being added in BOTH `checkout.session.completed` AND `invoice.payment_succeeded`
- This caused unpredictable behavior: sometimes double credits, sometimes zero credits
- Stripe doesn't guarantee event order, so both events could process simultaneously

### 2. **Missing Organization Lookup**
- When `invoice.payment_succeeded` arrived before `checkout.session.completed`, the organization couldn't be found
- The `stripeCustomerId` wasn't linked yet, causing the lookup to fail
- This resulted in credits not being added and emails not being sent

### 3. **No Duplicate Prevention**
- No mechanism to prevent the same invoice from being processed multiple times
- If webhook retries occurred, credits could be added multiple times

### 4. **Email Not Sending**
- Emails only sent if credits were successfully added
- If org lookup failed, email code was never reached
- No clear logging to diagnose email failures

## Solutions Implemented (v2 - Fixed)

### 1. **Checkout Event: Setup Phase**
```typescript
// checkout.session.completed:
// 1. Links stripeCustomerId to organization (CRITICAL)
// 2. Stores organizationId in Stripe subscription metadata
// 3. Creates subscription record in database
// 4. Does NOT add credits (prevents double-counting)
```

### 2. **Invoice Event: Credit Addition with Retry Logic**
```typescript
// invoice.payment_succeeded:
// 1. Checks for duplicate processing
// 2. Tries to find organization (3 strategies)
// 3. If not found, waits 2 seconds and retries (checkout might still be processing)
// 4. If still not found, returns 500 to trigger Stripe retry
// 5. Adds credits ONLY if organization found
// 6. Sends payment confirmation email
// 7. Marks invoice as processed
```

### 3. **Robust Organization Lookup Helper**
```typescript
async function findOrganizationId(params: {
  subscriptionId?: string
  customerId?: string
  metadata?: Stripe.Metadata | null
}): Promise<string | null>
```

This helper tries THREE strategies in order:
1. **Stripe subscription metadata** (fastest, most reliable)
2. **Database subscription record** (fallback if metadata missing)
3. **Customer ID lookup** (last resort)

### 4. **Retry Logic for Race Conditions**
- If organization not found immediately, waits 2 seconds
- Retries the lookup (gives checkout event time to complete)
- If still not found, returns HTTP 500 (Stripe will retry the webhook)

### 5. **Enhanced Error Handling**
- All database operations wrapped in try-catch
- Returns 500 on critical errors (triggers Stripe retry)
- Returns 200 on expected skips (prevents unnecessary retries)
- Clear emoji logging: ✅ success, ❌ error, ⚠️ warning, ℹ️ info

## Key Changes

### checkout.session.completed
- **ALWAYS** links `stripeCustomerId` to organization (critical!)
- **ALWAYS** stores `organizationId` in Stripe subscription metadata
- Creates/updates subscription record in database
- **DOES NOT** add credits (prevents double-counting)
- Wrapped in try-catch for safety

### invoice.payment_succeeded
- Checks for duplicate processing first
- Uses robust `findOrganizationId()` helper
- **Retry logic**: Waits 2s and retries if org not found
- **ONLY** place where credits are added
- Sends payment confirmation email
- Marks invoice as processed AFTER successful credit addition
- Returns 500 on errors to trigger Stripe retry

## Why This Approach Works

1. **Separation of Concerns**: Checkout handles setup, Invoice handles credits
2. **Idempotency**: Duplicate invoice processing prevented
3. **Race Condition Handling**: 2-second wait + retry logic
4. **Automatic Recovery**: HTTP 500 triggers Stripe to retry failed webhooks
5. **Multiple Fallbacks**: 3 different strategies to find organization

## Testing Recommendations

1. **Test New Subscription**
   - Buy a subscription
   - Check terminal logs for ✅ success messages
   - Verify credits added exactly once
   - Verify email received

2. **Test Event Order**
   - Use Stripe CLI to replay events in different orders
   - Verify credits still added correctly

3. **Test Webhook Retries**
   - Simulate webhook failures
   - Verify no duplicate credits on retry

4. **Check Logs**
   Watch for these patterns:
   ```
   ✅ Linked Org xxx to Customer cus_xxx
   ✅ Added metadata to Stripe subscription sub_xxx
   ✅ Subscription record synced for Org xxx
   ✅ SUCCESS: Added 50 credits to Org xxx. New Balance: 105
   ✅ Email sent to user@example.com
   ```

## Monitoring

### Success Indicators
```
✅ Linked Org xxx to Customer cus_xxx
✅ Added metadata to Stripe subscription sub_xxx
✅ SUCCESS: Added 50 credits to Org xxx. New Balance: 105
✅ Email sent to user@example.com
```

### Warning Indicators
```
⚠️ Could not update subscription xxx
⚠️ No owner email found for Org xxx
```

### Error Indicators (Will Trigger Retry)
```
❌ checkout.session.completed: No Organization ID found
❌ CRITICAL: Could not find organization for Invoice xxx
❌ Failed to send email: [error details]
❌ Error processing invoice: [error details]
```

## Production Considerations

### Current Limitation
The `processedInvoices` Set is in-memory and will reset on server restart. For production with multiple instances, consider:

1. **Redis Cache**
   ```typescript
   await redis.set(`invoice:${invoice.id}`, 'processed', 'EX', 86400)
   ```

2. **Database Flag**
   ```typescript
   // Add processedInvoiceIds to Organization model
   processedInvoiceIds: string[]
   ```

3. **Idempotency Key**
   Use Stripe's idempotency features for database operations

## Stripe Webhook Configuration

Make sure these events are enabled in your Stripe webhook:
- `checkout.session.completed` (REQUIRED)
- `invoice.payment_succeeded` (REQUIRED)
- `customer.subscription.updated` (for cancellations)
- `customer.subscription.deleted` (for final cancellation)

## Email Configuration

Emails are controlled by `ENABLE_EMAILS` constant in `lib/constants.ts`:
```typescript
export const ENABLE_EMAILS = true
```

The email service (`app/lib/email.ts`) handles the actual sending and will log when emails are disabled.

## What Changed from v1

**v1 Issues:**
- No retry logic - if checkout event was slow, invoice event would fail permanently
- Returned 200 on critical errors (Stripe wouldn't retry)
- No delay to handle race conditions

**v2 Fixes:**
- Added 2-second wait + retry if organization not found
- Returns 500 on critical errors (Stripe will retry)
- Better error handling with try-catch blocks
- Clearer logging with emojis
  metadata?: Stripe.Metadata | null
}): Promise<string | null>
```

This helper tries THREE strategies in order:
1. **Stripe subscription metadata** (fastest, most reliable)
2. **Database subscription record** (fallback if metadata missing)
3. **Customer ID lookup** (last resort)

### 3. **Stripe Metadata Storage**
```typescript
// Store organizationId in Stripe subscription metadata
await stripe.subscriptions.update(subscriptionId, {
  metadata: { organizationId: orgId }
})
```

This ensures the organization can ALWAYS be found, even if events arrive out of order.

### 4. **Duplicate Prevention**
```typescript
const processedInvoices = new Set<string>()

if (processedInvoices.has(invoice.id)) {
  console.log(`Invoice ${invoice.id} already processed, skipping`)
  return new Response(null, { status: 200 })
}

// After successful processing
processedInvoices.add(invoice.id)
```

### 5. **Enhanced Logging**
- Clear emoji indicators: ✅ for success, ❌ for errors
- Detailed logging at each step
- Separate logging for email disabled vs email failure
- Organization lookup strategy logging

## Key Changes

### checkout.session.completed
- **ALWAYS** links `stripeCustomerId` to organization (critical!)
- **ALWAYS** stores `organizationId` in Stripe subscription metadata
- Creates/updates subscription record in database
- **DOES NOT** add credits (prevents double-counting)

### invoice.payment_succeeded
- Checks for duplicate processing first
- Uses robust `findOrganizationId()` helper
- **ONLY** place where credits are added
- Sends payment confirmation email
- Marks invoice as processed

## Testing Recommendations

1. **Test New Subscription**
   - Buy a subscription
   - Check credits are added exactly once
   - Verify email is received

2. **Test Renewal**
   - Wait for subscription renewal
   - Check credits are added
   - Verify renewal email

3. **Test Event Order**
   - Use Stripe CLI to replay events in different orders
   - Verify credits still added correctly

4. **Test Webhook Retries**
   - Simulate webhook failures
   - Verify no duplicate credits on retry

## Monitoring

Watch for these log messages:

### Success Indicators
```
✅ SUCCESS: Added 50 credits to Org xxx. New Balance: 105
✅ Email sent to user@example.com
```

### Warning Indicators
```
⚠️ Could not update subscription xxx (may not exist in DB yet)
⚠️ No owner email found for Org xxx
```

### Error Indicators
```
❌ CRITICAL: Could not find organization for Customer xxx
❌ Failed to send email: [error details]
```

## Production Considerations

### Current Limitation
The `processedInvoices` Set is in-memory and will reset on server restart. For production with multiple instances, consider:

1. **Redis Cache**
   ```typescript
   await redis.set(`invoice:${invoice.id}`, 'processed', 'EX', 86400)
   ```

2. **Database Flag**
   ```typescript
   // Add processedInvoiceIds to Organization model
   processedInvoiceIds: string[]
   ```

3. **Idempotency Key**
   Use Stripe's idempotency features for database operations

## Email Configuration

Emails are controlled by `ENABLE_EMAILS` constant in `lib/constants.ts`:
```typescript
export const ENABLE_EMAILS = true
```

The email service (`app/lib/email.ts`) handles the actual sending and will log when emails are disabled.

## Next Steps

1. ✅ Deploy the fix
2. ✅ Monitor logs for the success indicators
3. ✅ Test with a real purchase
4. ⏳ Consider implementing Redis-based duplicate prevention for production
5. ⏳ Add database tracking for processed invoices (optional)
