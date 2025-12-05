# Next.js SaaS Kit: Comprehensive Setup and Development Guide

🚀 Build a modern SaaS application with Next.js 15, Supabase, Stripe, Prisma, and Tailwind CSS. This starter kit provides a solid foundation for your next project, complete with authentication, subscriptions, and a database setup.

<p align="center">
  <a href="https://next-saas-kit-v2.vercel.app" style="font-weight: bold; font-size: 20px; text-decoration: underline;">See the demo</a>
</p>

---

## ✨ Features

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth)
  - Passwordless (Magic Link)
  - Social OAuth (Google, GitHub)
- **Database**: [Supabase](https://supabase.com/) with [Prisma ORM](https://prisma.io)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Shadcn/UI](https://ui.shadcn.com/)
- **Payments**: [Stripe](https://stripe.com/) for subscriptions
- **Webhooks**: Serverless endpoint for Stripe events
- **Deployment**: Ready for [Vercel](https://vercel.com/)

---

## 🛠️ Getting Started: Full Setup Walkthrough

This section provides a consolidated, step-by-step guide to setting up your Next.js SaaS Kit, integrating all the components.

## 1. Clone the Repository

Begin by cloning the project repository to your local machine and navigating into its directory.

```bash
git clone https://github.com/mm-mazhar/next-saas-kit-v2.git
cd next-saas-kit-v2
```

## 2. Install Dependencies

Install all necessary Node.js packages for the project.

```bash
npm install
```

## 3. Setup Environment Variables

Create your `.env` file and populate it with the required environment variables.

```bash
cp .env.example .env
```

You will fill in these variables as you go through the setup steps for Supabase and Stripe. A summary will be provided at the end of each major section, and a full summary at the end of this guide.

## 4. Supabase Setup

Supabase will handle your authentication and database.

### 4.1 Create a Supabase Project

1. Go to Supabase and create a new project.
2. Note your Project Reference as you'll need it for URLs. (Project ID/ Project URL)

### 4.2 Database Configuration with Prisma

This project uses Prisma for database management. Since you're setting up a new project, we'll start fresh.

1.  Install Prisma CLI & Client:

    ```bash
    npm i -D prisma
    npm i @prisma/client
    ```

2.  Initialize Prisma: This creates the prisma directory and schema.prisma file.

    ```bash
    npx prisma init
    ```

3.  Update your `.env` with Supabase Database Connection Strings:

    Go to your Supabase Dashboard → Project Settings → Database → Connection String. Copy the connection pooling and direct connection strings.

    ```bash
    # Database (Get from: Project Settings → Database)
    DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?pgbouncer=true"

    DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
    ```

    Replace `[YOUR-PROJECT-REF]`, `[YOUR-PASSWORD]`, and `[REGION]` with your actual Supabase details.

4.  Update Prisma Schema:

    Ensure your `prisma/schema.prisma` file is configured with the following models. If you initialized Prisma, you'll need to add these.

    ```bash
    // prisma/schema.prisma
    datasource db {
      provider  = "postgresql"
      url       = env("DATABASE_URL")
      directUrl = env("DIRECT_URL")
    }

    generator client {
      provider = "prisma-client-js"
    }

    model User {
      id               String        @id @unique // UUID from Supabase Auth
      name             String?
      email            String        @unique
      stripeCustomerId String?       @unique
      colorScheme      String        @default("theme-orange")
      Subscription     Subscription?
      createdAt        DateTime      @default(now())
      updatedAt        DateTime      @updatedAt
    }

    model Subscription {
      stripeSubscriptionId String   @id @unique
      interval             String
      status               String
      planId               String
      currentPeriodStart   Int
      currentPeriodEnd     Int
      createdAt            DateTime @default(now())
      updatedAt            DateTime @updatedAt
      user                 User     @relation(fields: [userId], references: [id])
      userId               String   @unique
    }
    ```

5.  Run Initial Database Migration: This will create the tables in your Supabase database.

    ```bash
    npx prisma migrate dev --name init
    ```

    If prompted to reset, type y.

6.  Generate Prisma Client:

    ```bash
    npx prisma generate
    ```

7.  Verify Database Setup (Optional):

    ```bash
    npx prisma studio
    ```

    This will open a browser-based GUI to view your database, which should now contain empty User and Subscription tables.

### 4.3 Supabase Authentication Configuration

This section details the necessary settings in your Supabase Dashboard to configure authentication.

1. Update your `.env` with Supabase API Keys:

   ```bash
   # Supabase Configuration (Get from: Project Settings → API)
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOixxxxxxxxxxxxxxxxxxxxxxxx...
   ```

2. Authentication Providers:

   - Email Provider Setup:

     **Path:** `Authentication → Providers → Email`

     | Setting                     | Value                                           | Description                                 |
     | --------------------------- | ----------------------------------------------- | ------------------------------------------- |
     | Enable Email provider       | ✅ Enabled                                      | Allow users to sign in with email           |
     | Confirm email               | ❌ Disabled (Testing) / ✅ Enabled (Production) | Require email verification before access    |
     | Secure email change         | ✅ Enabled                                      | Require confirmation for email changes      |
     | Double confirm email change | ✅ Enabled                                      | Send confirmation to both old and new email |

   - Google OAuth Provider Setup:

     **Path:** `Authentication → Providers → Google`

     **How to get Google OAuth Credentials:**

     1. Go to: `https://console.cloud.google.com`
     2. Create new project or select existing
     3. Navigate: `APIs & Services → Credentials`
     4. Click: `Create Credentials → OAuth 2.0 Client ID`
     5. Configure consent screen if prompted
     6. Application type: `Web application`
     7. **Authorized JavaScript origins:**
        ```bash
        http://localhost:3000
        https://your-production-domain.com
        ```
     8. **Authorized redirect URIs:**

        ```bash
        https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
        ```

        (Replace `YOUR_PROJECT_REF` with your actual Supabase project reference)

     9. Copy the **Client ID** and **Client Secret** to Supabase

3. URL Configuration

   **Path:** `Authentication → URL Configuration`

   - Site URL

     ```bash
     https://your-production-domain.com
     ```

     (For local development: `http://localhost:3000`)

   - Redirect URLs (Add all of these)

     ```bash
     http://localhost:3000
     http://localhost:3000/auth/callback
     http://localhost:3000/dashboard
     https://your-production-domain.com
     https://your-production-domain.com/auth/callback
     https://your-production-domain.com/dashboard
     ```

   **Why these URLs?**

   - Base URLs: For initial OAuth redirects
   - `/auth/callback`: Where users land after OAuth/magic link sign-in
   - `/dashboard`: Final destination after successful authentication

4. Email Templates Configuration:

   **Path:** `Authentication → Email Templates`

   - Magic Link Email Template:

     ```html
     <h2>Magic Link</h2>
     <p>Click this link to sign in:</p>
     <p>
       <a
         href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard"
       >
         Sign In
       </a>
     </p>
     ```

   - Confirm Signup Email Template (if email confirmation is enabled):

     ```html
     <h2>Confirm your email</h2>
     <p>Follow this link to confirm your email:</p>
     <p>
       <a
         href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard"
       >
         Confirm Email
       </a>
     </p>
     ```

   ### Where to Find Each Value in Supabase:

   | Variable                        | Location in Supabase Dashboard                                       |
   | ------------------------------- | -------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Project Settings → API → Project URL                                 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → Project API keys → `anon` public            |
   | `DATABASE_URL`                  | Project Settings → Database → Connection string → Connection pooling |
   | `DIRECT_URL`                    | Project Settings → Database → Connection string → Direct connection  |

5. Security Settings:

   - Rate Limiting (Recommended):

     **Path:** `Authentication → Providers → Email`

     | Setting                     | Recommended Value     |
     | :-------------------------- | :-------------------- |
     | OTP Expiration              | 3600 seconds (1 hour) |
     | OTP Length                  | 6 digits              |
     | Max Frequency (Magic Links) | 60 seconds            |
     | Max Frequency (OTP)         | 60 seconds            |

   - CORS Settings:

     **Path:** `Project Settings → API`

     Add your domains:

     ```bash
     http://localhost:3000
     https://your-production-domain.com
     ```

### 4.4. Row Level Security (RLS) Setup

**Decision Matrix for RLS:**

- **Scenario A:** Starting Fresh (Testing/Development)

  If you have no production users or can reset all users, you can clear existing data and enable RLS.

  ```sql
  -- WARNING: This deletes ALL existing users and subscriptions!
  TRUNCATE TABLE "Subscription" CASCADE;
  TRUNCATE TABLE "User" CASCADE;
  ```

  Then proceed to enable RLS.

- **Scenario B:** You Have Existing Kinde Users (Migration)

  If you are migrating from Kinde Auth and have existing users with Kinde IDs `(kp_xxx format)`, do not enable RLS yet.
  Supabase Auth will create new users with UUIDs, and RLS will block your old users. Plan for parallel migration or force re-registration after Supabase Auth is fully functional.

- **Scenario C:** No Users Yet (Clean Slate)
  If this is a brand new project, proceed directly to enabling RLS.

**Enable RLS Scripts:**

Run these in the Supabase SQL Editor in the exact order shown

```sql
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own data" ON "User";
CREATE POLICY "Users can view own data" ON "User"
  FOR SELECT
  USING ((auth.uid())::uuid = id::uuid);

DROP POLICY IF EXISTS "Users can update own data" ON "User";
CREATE POLICY "Users can update own data" ON "User"
  FOR UPDATE
  USING ((auth.uid())::uuid = id::uuid);

DROP POLICY IF EXISTS "Users can insert own data" ON "User";
CREATE POLICY "Users can insert own data" ON "User"
  FOR INSERT
  WITH CHECK ((auth.uid())::uuid = id::uuid);

DROP POLICY IF EXISTS "Service role has full access" ON "User";
CREATE POLICY "Service role has full access" ON "User"
  FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own subscription" ON "Subscription";
CREATE POLICY "Users can view their own subscription" ON "Subscription"
  FOR SELECT
  USING ((auth.uid())::uuid = "userId"::uuid);

DROP POLICY IF EXISTS "Users can update their own subscription" ON "Subscription";
CREATE POLICY "Users can update their own subscription" ON "Subscription"
  FOR UPDATE
  USING ((auth.uid())::uuid = "userId"::uuid);

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org: select by membership" ON "Organization";
CREATE POLICY "Org: select by membership" ON "Organization"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Organization".id
        AND m."userId"::uuid = (auth.uid())::uuid
    )
  );

DROP POLICY IF EXISTS "Org: insert by authenticated" ON "Organization";
CREATE POLICY "Org: insert by authenticated" ON "Organization"
  FOR INSERT
  WITH CHECK ((auth.uid())::uuid IS NOT NULL);

DROP POLICY IF EXISTS "Org: update by owner_or_admin" ON "Organization";
CREATE POLICY "Org: update by owner_or_admin" ON "Organization"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Organization".id
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "Org: delete by owner" ON "Organization";
CREATE POLICY "Org: delete by owner" ON "Organization"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Organization".id
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "Org: service role" ON "Organization";
CREATE POLICY "Org: service role" ON "Organization"
  FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "OrgMember: select in same org" ON "OrganizationMember";
CREATE POLICY "OrgMember: select in same org" ON "OrganizationMember"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
        AND m2."userId"::uuid = (auth.uid())::uuid
    )
  );

DROP POLICY IF EXISTS "OrgMember: insert by owner_or_admin" ON "OrganizationMember";
CREATE POLICY "OrgMember: insert by owner_or_admin" ON "OrganizationMember"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
        AND m2."userId"::uuid = (auth.uid())::uuid
        AND m2."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "OrgMember: update by owner_or_admin" ON "OrganizationMember";
CREATE POLICY "OrgMember: update by owner_or_admin" ON "OrganizationMember"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
        AND m2."userId"::uuid = (auth.uid())::uuid
        AND m2."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "OrgMember: delete by owner_or_admin" ON "OrganizationMember";
CREATE POLICY "OrgMember: delete by owner_or_admin" ON "OrganizationMember"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
        AND m2."userId"::uuid = (auth.uid())::uuid
        AND m2."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "OrgMember: service role" ON "OrganizationMember";
CREATE POLICY "OrgMember: service role" ON "OrganizationMember"
  FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project: select by membership" ON "Project";
CREATE POLICY "Project: select by membership" ON "Project"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
    )
  );

DROP POLICY IF EXISTS "Project: insert by owner_or_admin" ON "Project";
CREATE POLICY "Project: insert by owner_or_admin" ON "Project"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "Project: update by owner_or_admin" ON "Project";
CREATE POLICY "Project: update by owner_or_admin" ON "Project"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "Project: delete by owner_or_admin" ON "Project";
CREATE POLICY "Project: delete by owner_or_admin" ON "Project"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "Project: service role" ON "Project";
CREATE POLICY "Project: service role" ON "Project"
  FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE "OrganizationInvite" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invite: select by owner_admin_or_inviter_or_invitee" ON "OrganizationInvite";
CREATE POLICY "Invite: select by owner_admin_or_inviter_or_invitee" ON "OrganizationInvite"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
    OR "OrganizationInvite"."inviterId"::uuid = (auth.uid())::uuid
    OR "OrganizationInvite"."email" = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Invite: insert by owner_or_admin" ON "OrganizationInvite";
CREATE POLICY "Invite: insert by owner_or_admin" ON "OrganizationInvite"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "Invite: update by owner_admin_or_invitee_or_inviter" ON "OrganizationInvite";
CREATE POLICY "Invite: update by owner_admin_or_invitee_or_inviter" ON "OrganizationInvite"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
    OR "OrganizationInvite"."inviterId"::uuid = (auth.uid())::uuid
    OR "OrganizationInvite"."email" = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Invite: delete by owner_or_admin" ON "OrganizationInvite";
CREATE POLICY "Invite: delete by owner_or_admin" ON "OrganizationInvite"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
        AND m."userId"::uuid = (auth.uid())::uuid
        AND m."role"::text IN ('OWNER','ADMIN')
    )
    OR "OrganizationInvite"."inviterId"::uuid = (auth.uid())::uuid
  );

DROP POLICY IF EXISTS "Invite: service role" ON "OrganizationInvite";
CREATE POLICY "Invite: service role" ON "OrganizationInvite"
  FOR ALL
  USING (auth.role() = 'service_role');

```

**Verify RLS:**

After enabling RLS, test it in the Supabase SQL Editor:

```sql
-- This should return your authenticated user only (run while logged in via Supabase Auth)
SELECT * FROM "User" WHERE id::uuid = auth.uid();

-- This should return nothing (RLS blocks it), unless you're using service_role key
SELECT * FROM "User" LIMIT 10;
```

## 5. Strip Setup (Test Mode)

Integrate Stripe for handling subscriptions and payments.

### 5.1. Get Your Stripe API Keys

1. Sign in to your Stripe Dashboard.
2. Ensure you are in Test mode (toggle at the top right).
3. Navigate to Developers > API keys.
4. Copy your `Publishable key (pk*test*...)` and `Secret key (sk*test*...)`.

   Update Your `.env` File:

   ```bash
   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

### 5.2 Create a Product and Price

1. In the Stripe Dashboard, go to the Products section.
2. Click + Add product.
3. Fill in details (e.g., Name: "SaaS Kit Pro").
4. Under "Pricing", set:
   - Pricing model: Standard pricing
   - Price: e.g., 30
   - Currency: e.g., USD
   - Billing period: Recurring > Monthly
5. Click Save product.
6. Copy the Price ID (e.g., price\_...) from the product's detail page.
   Update Your .env File:

   ```Env
    # Stripe Price ID
    STRIPE_PRICE_ID=price_...
   ```

### 5.3. Set Up Webhooks for Local Development

The Stripe CLI will forward webhook events to your local server.

1.  Install the Stripe CLI: Follow instructions from Stripe CLI documentation.
2.  Log in to the Stripe CLI:
    ```bash
    stripe login
    ```
3.  Forward Webhook Events:

    While your Next.js dev server is running, open a new terminal window and run:

    ```bash
    stripe listen --forward-to localhost:3000/api/webhook/stripe
    ```

4.  Get Your Webhook Signing Secret:

    The CLI will output a webhook signing secret (e.g., whsec\_...). Copy this secret.

    Update Your `.env` File:

    ```bash
    # Stripe Webhook Secret (for local development)
    STRIPE_WEBHOOK_SECRET=whsec_...
    ```

5.  Run the Development Server

    ```bash
    npm run dev
    ```

Open `http://localhost:3000` in your browser to see the result.

## CRON SECRET

Run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated secret to your `.env` file:

```bash
CRON_SECRET=YOUR-GENERATED-SECRET
```

#### **TEST CREDIT EXHAUSTION EMAIL**

Run:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/notify
```

#### **TEST Reminder Emails: 2-Day Renewal Reminder / Credits Exhaustion Reminder Email**

- 2‑day renewal reminder:
  - Ensure a user’s subscription is active and currentPeriodEnd is exactly 2 days ahead.
  - Invoke: curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/notify
  - Expect details to include { reason: 'days', daysLeft: 2 } .
- Credits Exhaustion reminder:

  - Set user credits to CREDIT_REMINDER_THRESHOLD - 1 and creditsReminderThresholdSent to false .
  - Invoke endpoint; expect details entry {"totalCandidates":0,"creditCandidates":1,"sent":0,"details":[{"email":",<email>","reason":"credits"}]} .
  - It flips creditsReminderThresholdSent to true after sending.

- Free Plan:

  - curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/free-refill
  - Expect details to include {"success":true,"usersRefilled":1} .

- `vercel.json` for setting up cron jobs in vercel

  ```bash
    {
      "crons": [
        {
          "path": "/api/cron/free-refill",
          "schedule": "0 0 * * *"
        },
        {
          "path": "/api/cron/notify",
          "schedule": "0 * * * *"
        }
      ]
    }
  ```

- 0 0 \* \* \* = Run at midnight (Daily).
- 0 \* \* \* \* = Run at minute 0 of every hour (Hourly).

## Useful Commands

This section provides a quick reference for common commands and additional guides.

### General Commands

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase.

### Prisma (Database) Commands

- `npx prisma migrate dev --name <migration_name>`: Creates and applies a new database migration.
- `npx prisma studio`: Opens a browser-based GUI to view and edit your database.
- `npx prisma generate`: Generates/updates the Prisma Client based on your schema.
- `npx prisma migrate reset`: Resets the development database (deletes all data).
- `npx prisma migrate deploy`: Applies pending migrations to a production database.

### Stripe (Local Development) Commands

- `stripe login`: Connects the Stripe CLI to your Stripe account.
- `stripe listen --forward-to localhost:3000/api/webhook/stripe`: Forwards webhook events from Stripe to your local server.

### Supabase Connection Test (in Node.js)

```bash
node -e "const { createClient } = require('@supabase/supabase-js'); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); s.auth.getSession().then(console.log);"
```

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the Vercel Platform.

1. Push your code to a Git repository (GitHub, GitLab, Bitbucket)
2. Import your project into Vercel.
3. Add all your environment variables from your .env file to the Vercel project settings.
   - nsure DATABASE_URL and DIRECT_URL are correct.
   - STRIPE_WEBHOOK_SECRET for production will be different from local (see Stripe Dashboard for production webhook secrets).
   - Update PRODUCTION_URL to your Vercel domain.
4. Deploy!

For more details, check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment).

## Testing Checklist

### Before Going Live:

- [ ] ✅ Email provider enabled
- [ ] ✅ Google OAuth configured with valid credentials
- [ ] ✅ All redirect URLs added (local + production)
- [ ] ✅ Email templates customized
- [ ] ✅ Environment variables set
- [ ] ✅ Database connection working
- [ ] ✅ RLS policies configured
- [ ] ✅ Test email login flow
- [ ] ✅ Test Google OAuth flow
- [ ] ✅ Test protected routes
- [ ] ✅ Test logout functionality
- [ ] ✅ Verify user creation in database

### Production Checklist:

- [ ] ✅ Enable email confirmation (`Confirm email` setting)
- [ ] ✅ Update Site URL to production domain
- [ ] ✅ Add production redirect URLs
- [ ] ✅ Update Google OAuth redirect URIs
- [ ] ✅ Set production environment variables
- [ ] ✅ Configure custom SMTP (optional, via Project Settings → Auth)
- [ ] ✅ Set up monitoring/alerts
- [ ] ✅ Test authentication in production

## Common Configuration Issues & Solutions

### Issue: "Invalid redirect URL"

**Solution:**

- Verify the redirect URL is added to Authentication → URL Configuration
- Ensure exact match (including http/https)
- Check for trailing slashes

### Issue: "Google OAuth returns error"

**Solution:**

- Verify Client ID and Secret are correct
- Check Authorized redirect URIs in Google Cloud Console
- Ensure the callback URL matches exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### Issue: "Email not sending"

**Solution:**

- Check email rate limits not exceeded
- Verify email templates are configured
- Check Supabase auth logs: Authentication → Logs
- Consider configuring custom SMTP for production

### Issue: "Users can't access protected routes"

**Solution:**

- Verify middleware is configured correctly
- Check cookies are being set (browser DevTools)
- Ensure redirect URLs include the destination route
- Check session refresh in middleware

## Post-Migration Steps

### Update Google Cloud Console for Production

When deploying to production, update your Google OAuth settings:

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add production authorized redirect URI:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
4. Add production JavaScript origins:
   ```
   https://your-production-domain.com
   ```

### Custom Email Domain (Optional)

For professional emails from your domain:

1. Go to: Project Settings → Auth → SMTP Settings
2. Configure your SMTP server details
3. Test email delivery

## Monitoring & Maintenance

### Key Metrics to Monitor

**Path:** `Authentication → Users`

- Active users
- Sign-up rate
- Authentication method distribution

**Path:** `Authentication → Logs`

- Failed login attempts
- OAuth errors
- Rate limit hits

### Regular Maintenance Tasks

- Review and update RLS policies
- Monitor authentication logs for suspicious activity
- Update redirect URLs when adding new domains
- Rotate API keys periodically (for service_role key)
- Keep @supabase packages updated

## Support Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Auth Documentation:** https://supabase.com/docs/guides/auth
- **Community Discord:** https://discord.supabase.com
- **GitHub Issues:** https://github.com/supabase/supabase/issues
- **Next.js deployment documentation** https://nextjs.org/docs/deployment

## 📞 Contact

- **GitHub**: [@mm-mazhar](https://github.com/mm-mazhar)
- **Website**: [mm-mazhar.github.io](https://mm-mazhar.github.io/mmazhar.github.io/)
- **Email for Business Inquiries**: mazqoty.01@gmail.com
