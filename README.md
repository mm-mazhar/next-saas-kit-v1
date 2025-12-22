# Next.js SaaS Kit

Build a production-ready, multi-tenant SaaS with:

- Next.js 15 (App Router, Server Actions)
- Supabase Auth + Postgres
- Prisma ORM
- Stripe subscriptions + usage-based credits
- Role Based Access Control (RBAC)
- Super Admin analytics dashboard
- Tailwind CSS + Shadcn UI

This README is a full, end‑to‑end setup and operations guide for this specific codebase.

---

## Table of Contents

- [Next.js SaaS Kit](#nextjs-saas-kit)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
    - [Multi-tenancy Model](#multi-tenancy-model)
    - [RBAC Model](#rbac-model)
    - [Super Admin Dashboard](#super-admin-dashboard)
  - [Getting Started](#getting-started)
    - [1. Clone \& Install](#1-clone--install)
    - [2. Environment Variables](#2-environment-variables)
    - [3. Database \& Prisma](#3-database--prisma)
      - [Optional: Seed Data](#optional-seed-data)
    - [4. Supabase Auth Setup](#4-supabase-auth-setup)
      - [4.1 API Keys](#41-api-keys)
      - [4.2 Email Provider](#42-email-provider)
      - [4.3 Google OAuth](#43-google-oauth)
      - [4.4 URL Configuration](#44-url-configuration)
      - [4.5 Email Templates](#45-email-templates)
    - [5. Row Level Security (RLS)](#5-row-level-security-rls)
    - [6. Stripe Setup](#6-stripe-setup)
      - [6.1 Local Webhook Setup](#61-local-webhook-setup)
    - [7. CRON Jobs \& Maintenance](#7-cron-jobs--maintenance)
      - [7.1 Local Testing](#71-local-testing)
      - [7.2 Vercel CRON Configuration](#72-vercel-cron-configuration)
    - [8. Run the App](#8-run-the-app)
  - [Role Based Access Control (RBAC)](#role-based-access-control-rbac)
    - [Roles](#roles)
    - [High-level Rules](#high-level-rules)
    - [Enforcement Examples](#enforcement-examples)
    - [UI Behavior](#ui-behavior)
  - [Super Admin Mode](#super-admin-mode)
    - [Enabling Super Admin Access](#enabling-super-admin-access)
    - [Super Admin Dashboard Capabilities](#super-admin-dashboard-capabilities)
  - [Testing Checklist](#testing-checklist)
    - [Authentication \& Onboarding](#authentication--onboarding)
    - [Organizations, Projects \& RBAC](#organizations-projects--rbac)
    - [Billing \& Credits](#billing--credits)
    - [Super Admin Dashboard](#super-admin-dashboard-1)
    - [Security \& RLS](#security--rls)
  - [Useful Commands](#useful-commands)
    - [General](#general)
    - [Prisma](#prisma)
    - [Stripe (Local)](#stripe-local)
    - [Supabase Quick Test](#supabase-quick-test)
  - [Deployment](#deployment)
  - [Troubleshooting](#troubleshooting)
    - [Auth Issues](#auth-issues)
    - [RBAC / Permission Errors](#rbac--permission-errors)
    - [Super Admin](#super-admin)
    - [Database \& RLS](#database--rls)

---

## Overview

This project is a multi-tenant SaaS starter built with Next.js 15 and Supabase. It supports:

- Authentication via Supabase (email magic links + Google OAuth)
- Multi-organization accounts with members and projects
- RBAC with `OWNER`, `ADMIN`, and `MEMBER` roles
- Billing via Stripe (subscriptions + credit refills)
- A Super Admin section to monitor system-wide stats (users, orgs, revenue)
- CRON-based background maintenance and email notifications

You can use it as a starting point for your own SaaS, or as a reference for:

- How to combine Supabase Auth with Prisma
- How to implement RBAC and multi-tenancy
- How to build a super admin area separate from tenant dashboards

---

## Features

- **Authentication**
  - Supabase magic links (passwordless)
  - Google OAuth
  - Email templates wired to `/auth/callback`

- **Multi-tenancy**
  - Each user can belong to multiple organizations
  - Each organization owns its own projects and billing
  - RLS policies to prevent cross‑org data leaks

- **RBAC**
  - Roles: `OWNER`, `ADMIN`, `MEMBER`
  - Fine-grained server-side checks via `requireOrgRole` and `permissions`
  - UI behavior matches role permissions (e.g., disabled buttons for low-privilege members)

- **Billing**
  - Stripe subscriptions (e.g. Pro plan)
  - Credits per organization
  - Daily maintenance job to refill/cleanup
  - Reminder emails for renewals and credit exhaustion

- **Super Admin**
  - Email-based super admin whitelisting
  - `/admin` area with analytics cards, charts, user/org lists, system status
  - CSV export of aggregated statistics

- **DX**
  - Tailwind CSS 4 + Shadcn UI components
  - ESLint + TypeScript strict
  - Prisma schema tuned for multi‑tenant SaaS

---

## Tech Stack

- `next` – Next.js 15 (App Router, RSC, Server Actions)
- `react`, `react-dom` – React 19
- `@supabase/supabase-js`, `@supabase/ssr` – Supabase Auth + SSR helpers
- `pg` – Postgres driver used with Prisma
- `@prisma/client`, `prisma` – ORM + migrations
- `stripe` – Stripe Billing / subscriptions
- `resend` – Transactional emails
- `tailwindcss` + `tailwindcss-animate` + Shadcn UI (`components.json`)
- `lucide-react` – Icons
- CRON via `vercel.json` scheduled functions

Config references:

- `package.json`: scripts and dependencies
- `prisma/schema.prisma`: data model
- `lib/constants.ts`: RBAC roles, limits, and configuration
- `lib/auth/guards.ts`: RBAC enforcement helpers
- `app/(dashboard)/**`: tenant dashboard
- `app/(super-admin)/**`: super admin area

---

## Architecture

### Multi-tenancy Model

The core multi-tenant model is defined in `prisma/schema.prisma`:

- `User`
  - Identified by Supabase Auth user `id` (UUID string)
  - Stores profile preferences (`colorScheme`, `themePreference`)
  - Has many `OrganizationMember` rows (one per organization)

- `Organization`
  - Owns billing (`stripeCustomerId`, `credits`, `subscription`)
  - Has many `OrganizationMember` (users) and `Project` (resources)
  - Soft-delete via `deletedAt`

- `OrganizationMember`
  - Junction of `User` + `Organization`
  - Has `role` of type `OrganizationRole` (`OWNER`, `ADMIN`, `MEMBER`)
  - Enforced uniqueness on (`organizationId`, `userId`)

- `Project`
  - Belongs to exactly one `Organization`
  - Slug unique per organization

- `OrganizationInvite`
  - Used to invite users by email into organizations with a specific role
  - Includes `status` and expiration

All queries are made through Prisma and respect RLS enforced in Supabase.

### RBAC Model

RBAC types and limits live in `lib/constants.ts:158`:

- `ROLES` – `{ OWNER, ADMIN, MEMBER }`
- `OrganizationRole` – union of role keys
- `LIMITS` – per-user/org constraints (max orgs, projects, members, pending invites)

Server-side authorization helpers:

- `lib/auth/guards.ts:1`
  - `getCurrentOrgContext(orgId, userId)` returns the user’s role in the organization or `null`
  - `requireOrgRole(orgId, userId, minimumRole)` throws if user does not meet required role
  - `ROLE_HIERARCHY` enforces `OWNER > ADMIN > MEMBER`

- `lib/auth/permissions.ts:1`
  - Declares a simple permission map for actions:
    - Org‑level: `org:update`, `org:delete`, `org:transfer`
    - Member‑level: `member:invite`, `member:remove`, `member:update`
    - Project‑level: `project:create`, `project:update`, `project:delete`
  - `can(role, action)` returns a boolean used to control UI and business logic

Actions that enforce RBAC:

- `app/actions/organization.ts:68`
  - `updateMemberRoleAction` – only `ADMIN`+ can change roles, cannot downgrade `OWNER`, cannot set `OWNER` via this path
  - `inviteMember` – only `ADMIN`+ can invite, with rate limiting and pending-invite caps
  - `updateOrganizationNameAction` – requires at least `ADMIN`

- `app/actions/project.ts:76`
  - `deleteProject` – resolves `organizationId` and enforces `ADMIN`+ via `requireOrgRole`

### Super Admin Dashboard

The super admin area lives under `app/(super-admin)`:

- `app/(super-admin)/layout.tsx:1`
  - Server layout that:
    - Reads currently authenticated user via Supabase
    - Checks `SUPER_ADMIN_EMAILS` env var
    - Redirects non-super-admins to `/dashboard`
  - Wraps children with `SidebarProvider` and `AdminSidebar`, plus `DashboardHeader`

- `app/(super-admin)/_components/admin-sidebar.tsx:1`
  - Client sidebar for super admin navigation
  - Links to:
    - Overview dashboard (`/admin`)
    - Revenue analytics
    - User analytics
    - Users, organizations, subscriptions, settings

- `app/(super-admin)/_components/dashboard-actions.tsx:1`
  - Controls for refreshing dashboard, exporting CSV reports, etc.

- `app/(super-admin)/_components/system-status.tsx:1`
  - Receives system health data (`database` status + latency)
  - Renders cards with overall system status

The dashboard aggregates data across all organizations (e.g., total revenue, active orgs, growth), separate from tenant scoping.

---

## Getting Started

### 1. Clone & Install

Clone your own repository that contains this code and install dependencies:

```bash
git clone <your-repo-url> saas-kit
cd saas-kit

npm install
```

> This project uses plain `npm` scripts. You can adapt to `pnpm` or `yarn` if you prefer.

### 2. Environment Variables

Copy the example env file and fill it as you configure services:

```bash
cp .env.example .env
```

Key groups:

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL`
  - `DIRECT_URL`

- Stripe:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_ID`
  - `STRIPE_WEBHOOK_SECRET` (per environment)

- App:
  - `NEXT_PUBLIC_APP_URL` / `PRODUCTION_URL`
  - `SUPPORT_EMAIL`, `APP_EMAIL`
  - `CRON_SECRET` – secret key for CRON endpoints
  - `SUPER_ADMIN_EMAILS` – comma-separated list of emails with super admin access

- Email (Resend / SMTP):
  - `RESEND_API_KEY` or SMTP credentials (depending on how you configure `sendBasicEmail`)

### 3. Database & Prisma

This project uses Supabase Postgres with Prisma as the ORM.

1. In Supabase, go to **Project Settings → Database → Connection String**.
2. Copy:
   - **Connection pooling** URL → `DATABASE_URL`
   - **Direct connection** URL → `DIRECT_URL`
3. Confirm `prisma/schema.prisma` matches the schema you want for your SaaS.
4. Run initial migration and generate the client:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

To inspect the DB:

```bash
npx prisma studio
```

#### Optional: Seed Data

The README previously included raw SQL seeding examples. You can adapt those to:

- Create sample users (including potential super admin emails)
- Create a few organizations, members, subscriptions, and projects

You can run SQL directly in the Supabase SQL editor using your Prisma model names (wrapped in quotes).

### 4. Supabase Auth Setup

In the Supabase dashboard:

#### 4.1 API Keys

- **Path**: `Project Settings → API`
- Set in `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
DIRECT_URL=...
```

#### 4.2 Email Provider

- **Path**: `Authentication → Providers → Email`
- Recommended config:

| Setting                     | Recommended                              |
| --------------------------- | ---------------------------------------- |
| Enable Email provider       | Enabled                                  |
| Confirm email               | Disabled (dev) / Enabled (prod)         |
| Secure email change         | Enabled                                  |
| Double confirm email change | Enabled                                  |

#### 4.3 Google OAuth

1. Go to Google Cloud Console → **APIs & Services → Credentials**.
2. Create an OAuth 2.0 client (Web application).
3. Authorized JavaScript origins:

```bash
http://localhost:3000
https://your-production-domain.com
```

4. Authorized redirect URIs:

```bash
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

5. Paste Client ID and Secret into:
   - Supabase → `Authentication → Providers → Google`

#### 4.4 URL Configuration

- **Path**: `Authentication → URL Configuration`

Set:

- Site URL (production):

```bash
https://your-production-domain.com
```

- For local dev, also use:

```bash
http://localhost:3000
```

Redirect URLs to add:

```bash
http://localhost:3000
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
https://your-production-domain.com
https://your-production-domain.com/auth/callback
https://your-production-domain.com/dashboard
```

#### 4.5 Email Templates

Magic link (sign-in) template:

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

Confirm signup template:

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

### 5. Row Level Security (RLS)

RLS is required to ensure tenant isolation. The policies are tailored to the Prisma models in this repo.

High-level approach:

- Enable RLS on all tenant tables (`User`, `Organization`, `OrganizationMember`, `Project`, `Subscription`)
- Use policies so users only see data for organizations where they are members
- Use `OWNER`/`ADMIN` roles for mutating operations
- Use `auth.role() = 'service_role'` for server‑side maintenance and Stripe webhooks

For full, copy‑pastable SQL policies tailored to this schema, see `RLS.md` in the project root. That file contains the complete set of `ALTER TABLE` and `CREATE POLICY` statements you can run in the Supabase SQL editor.

When starting on a **new project** (no existing production users):

1. (Optional but recommended for clean local/dev) Truncate tenant tables:

```sql
BEGIN;

TRUNCATE TABLE
  public."OrganizationInvite",
  public."Project",
  public."OrganizationMember",
  public."Subscription",
  public."Organization",
  public."User"
RESTART IDENTITY CASCADE;

TRUNCATE TABLE auth.users CASCADE;

COMMIT;
```

2. Apply the RLS scripts from `RLS.md` (or your own) to:
   - Enable RLS on each table
   - Create policies:
     - `Org: select by membership`
     - `Org: insert by authenticated`
     - `Org: update by owner_or_admin`
     - `Org: delete by owner`
     - `OrgMember: select in same org`, etc.
     - `Project: select by membership`, `Project: insert/update by owner_or_admin`

To verify RLS:

```sql
-- When logged in as a test user (via Supabase SQL editor)
SELECT * FROM "User" WHERE id::uuid = auth.uid();

-- Should be empty unless using service_role
SELECT * FROM "User" LIMIT 10;
```

### 6. Stripe Setup

1. Go to the Stripe dashboard and enable **Test mode**.
2. Create a **Product** and **Price** that matches your plan (e.g., Pro monthly).
3. Copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
   - Price ID → `STRIPE_PRICE_ID`

Set these in `.env`.

#### 6.1 Local Webhook Setup

Install Stripe CLI and log in:

```bash
stripe login
```

Forward webhooks to your dev server (with `npm run dev` running):

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Stripe CLI will print a `whsec_...` signing secret; set:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 7. CRON Jobs & Maintenance

The project uses HTTP‑based CRON endpoints protected by `CRON_SECRET`:

- `/api/cron/notify` – renewal and credit exhaustion reminders
- `/api/cron/daily-maintenance` – refill & cleanup tasks

Generate a strong CRON secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set:

```bash
CRON_SECRET=your-generated-secret
```

#### 7.1 Local Testing

Notifications:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  http://localhost:3000/api/cron/notify
```

Daily maintenance:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  http://localhost:3000/api/cron/daily-maintenance
```

Expected behavior (example):

- Renewal reminder when `currentPeriodEnd` is 2 days away
- Credit exhaustion reminder when credits fall below a threshold and no reminder was sent
- Daily refill of free credits and cleanup of deleted orgs

#### 7.2 Vercel CRON Configuration

`vercel.json:1` includes:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-maintenance",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/notify",
      "schedule": "0 9 * * *"
    }
  ]
}
```

You can adjust the schedules as needed:

- `0 0 * * *` – every day at midnight
- `0 9 * * *` – every day at 9:00

### 8. Run the App

```bash
npm run dev
```

Visit:

- `http://localhost:3000` – landing page / marketing
- `http://localhost:3000/get-started` – onboarding
- `http://localhost:3000/dashboard` – tenant dashboard
- `http://localhost:3000/admin` – super admin dashboard (for super admin emails)

---

## Role Based Access Control (RBAC)

### Roles

Defined in `lib/constants.ts:158`:

- `OWNER`
- `ADMIN`
- `MEMBER`

### High-level Rules

- `OWNER`
  - Full control of the organization
  - Can delete the organization
  - Can invite/remove members
  - Can transfer ownership

- `ADMIN`
  - Manages most org settings
  - Can invite/remove/update members (excluding owner)
  - Can create/update/delete projects
  - Cannot promote anyone to `OWNER` (must use transfer flow)

- `MEMBER`
  - Limited access
  - Typically can create/update projects they are involved with
  - Cannot change org settings or manage membership

### Enforcement Examples

- `updateMemberRoleAction` (`app/actions/organization.ts:68`)
  - Checks the caller is at least `ADMIN` via `requireOrgRole`
  - Prevents changes to `OWNER`
  - Prevents setting a member to `OWNER`

- `inviteMember` (`app/actions/organization.ts:122`)
  - Requires `ADMIN`
  - Applies rate limiting and pending invite caps

- `updateOrganizationNameAction` (`app/actions/organization.ts:527`)
  - Requires `ADMIN`

- `deleteProject` (`app/actions/project.ts:76`)
  - Resolves the project’s org
  - Requires `ADMIN`

### UI Behavior

- `MemberRoleSelect` (`app/(dashboard)/_components/member-role-select.tsx:21`)
  - Displays `OWNER` as read‑only text
  - Prevents users from editing their own role
  - Only `OWNER`/`ADMIN` see editable role selectors

These patterns ensure that server‑side checks and client‑side behavior stay in sync.

---

## Super Admin Mode

Super admin access is gated by the `SUPER_ADMIN_EMAILS` environment variable.

### Enabling Super Admin Access

1. Set:

```bash
SUPER_ADMIN_EMAILS=alice@example.com,bob@example.com
```

2. Ensure those emails exist as Supabase users and are also present in the `User` table.
3. When such a user logs in and visits `/admin`, they are allowed into the super admin area.
4. Non‑super‑admins visiting `/admin` are redirected back to `/dashboard`.

Logic is implemented in `app/(super-admin)/layout.tsx:1`.

### Super Admin Dashboard Capabilities

Components under `app/(super-admin)/_components` provide:

- Overview cards: total users, total organizations, active subscriptions
- Revenue analytics: aggregated MRR, total revenue, breakdown by plan
- User analytics: growth over time
- System status: database connectivity, latency, basic health
- Lists: users, organizations, subscriptions
- Actions:
  - Refresh data on demand
  - Export CSV snapshot of stats

Use this area for operational visibility and, if needed, for additional admin tooling.

---

## Testing Checklist

This section is updated to reflect RBAC and the Super Admin dashboard.

### Authentication & Onboarding

- [ ] Email provider configured in Supabase
- [ ] Google OAuth configured (client ID/secret set, redirect URIs added)
- [ ] Magic link sign‑in works locally
- [ ] Signup + confirm email flow works (if enabled)
- [ ] `/get-started` onboarding completes and redirects to `/dashboard`
- [ ] Logout clears session and redirects correctly

### Organizations, Projects & RBAC

- [ ] New users get a default organization and project (if applicable)
- [ ] Users can create additional organizations until `MAX_ORGANIZATIONS_PER_USER` is hit
- [ ] Users can create projects until `MAX_PROJECTS_PER_ORGANIZATION` is hit
- [ ] Invites:
  - [ ] Owners/Admins can invite members with different roles
  - [ ] Pending invite limit per org enforced (`MAX_PENDING_INVITES_PER_ORG`)
  - [ ] Disposable emails are rejected when `CHECK_DISPOSABLE_EMAILS` is enabled
- [ ] Role changes:
  - [ ] Only `OWNER`/`ADMIN` can change member roles
  - [ ] Owners cannot be modified via the role dropdown
  - [ ] Users cannot change their own roles
  - [ ] No path allows setting someone directly to `OWNER` except via ownership transfer (if implemented)
- [ ] Authorization:
  - [ ] `MEMBER` cannot access organization settings page
  - [ ] `MEMBER` cannot invite or remove members
  - [ ] `ADMIN` cannot delete organization (if that is reserved for `OWNER`)
  - [ ] Unauthorized access attempts surface clear errors (and do not leak data)

### Billing & Credits

- [ ] Stripe product and price exist, and `STRIPE_PRICE_ID` is set
- [ ] New subscriptions can be created and show up in Stripe dashboard
- [ ] Webhook events correctly update `Subscription` and `Organization` records
- [ ] Credits:
  - [ ] Credits increment on successful payments (if implemented)
  - [ ] Credit‑gated actions fail gracefully when out of credits
  - [ ] Daily maintenance job refills free credits as designed
- [ ] Renewal & credit reminder emails:
  - [ ] 2‑day renewal reminder sent when criteria match
  - [ ] Credit exhaustion reminder sent once per threshold

### Super Admin Dashboard

- [ ] `SUPER_ADMIN_EMAILS` set and matches at least one user email
- [ ] Super admin user can access `/admin`
- [ ] Non‑super‑admin users are redirected away from `/admin`
- [ ] Overview cards show realistic counts (users, orgs, revenue)
- [ ] Revenue and user analytics charts render without errors
- [ ] System status panel shows database as online and reasonable latency
- [ ] CSV export downloads with correct columns and values

### Security & RLS

- [ ] RLS enabled on all tenant tables (`User`, `Organization`, `OrganizationMember`, `Project`, `Subscription`, `OrganizationInvite`)
- [ ] A user cannot query organizations they are not a member of (tested via Supabase SQL editor)
- [ ] Service role key is only used on server‑side (e.g. API routes, cron jobs, webhooks)
- [ ] Environment variables are set correctly for production and are **not** exposed accidentally
- [ ] Rate limiting and abuse protections:
  - [ ] Invite rate limit enforced (time‑based)
  - [ ] Pending invite max enforced

---

## Useful Commands

### General

- `npm run dev` – Start development server (Next.js + API routes)
- `npm run build` – Build production assets
- `npm run start` – Start production server
- `npm run lint` – Run ESLint

### Prisma

- `npx prisma migrate dev --name <name>` – Create & apply new migration locally
- `npx prisma migrate deploy` – Apply migrations in production
- `npx prisma generate` – Regenerate Prisma client
- `npx prisma studio` – Visual DB browser
- `npx prisma migrate reset` – Reset local DB (drops data)

### Stripe (Local)

- `stripe login` – Authenticate Stripe CLI
- `stripe listen --forward-to localhost:3000/api/webhook/stripe` – Forward events to dev

### Supabase Quick Test

```bash
node -e "const { createClient } = require('@supabase/supabase-js'); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); s.auth.getSession().then(console.log);"
```

---

## Deployment

Recommended platform: **Vercel**.

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the repo into Vercel.
3. In Vercel → Project Settings:
   - Add all environment variables from `.env`
   - Ensure `DATABASE_URL` and `DIRECT_URL` point to the **production** Supabase project
   - Set `STRIPE_WEBHOOK_SECRET` from Stripe’s **production** webhook
   - Configure `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for production
   - Set `PRODUCTION_URL` (or equivalent) to your Vercel domain
   - Set `CRON_SECRET` and `SUPER_ADMIN_EMAILS`
4. Deploy.

After deploy:

- Run `npx prisma migrate deploy` against your production database (e.g. via Vercel CLI or a separate step).
- Re-test critical flows using the [Testing Checklist](#testing-checklist).

---

## Troubleshooting

### Auth Issues

- **Invalid redirect URL**
  - Check Supabase `Authentication → URL Configuration`
  - Ensure exact matches including protocol and trailing slash

- **Google OAuth errors**
  - Verify client ID/secret
  - Confirm redirect URI matches exactly:
    - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

- **Emails not sending**
  - Check Resend / SMTP provider logs
  - Verify API keys
  - Ensure rate limits are not exceeded
  - Confirm Supabase email templates are enabled

### RBAC / Permission Errors

- “Unauthorized” errors when performing org/project actions:
  - Ensure the user is a member of the organization
  - Confirm their role is high enough for the action
  - Check `requireOrgRole` usage in the relevant action

- Members seeing options they cannot use:
  - Review `MemberRoleSelect` and related UI
  - Ensure `can(role, action)` is used to gate destructive actions

### Super Admin

- `/admin` redirects to `/dashboard` unexpectedly:
  - Ensure logged-in user’s email is listed in `SUPER_ADMIN_EMAILS`
  - Confirm the email matches exactly (case and whitespace)

### Database & RLS

- Queries returning no data unexpectedly:
  - Inspect RLS policies in Supabase
  - Temporarily test with `service_role` key (in a safe, non-client context) to isolate policy issues

If you customize the schema or flows heavily, update this README to match your new behavior so that future you—and your team—always have a single, accurate source of truth.
