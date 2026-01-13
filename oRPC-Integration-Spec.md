# Master Technical Specification: oRPC v1 Integration for Next.js SaaS Kit

**Role:** Senior Full-Stack Architect
**Objective:** Refactor `mm-mazhar-next-saas-kit-v1` to utilize **oRPC v1.0** as the primary communication layer.
**Constraints:**
0. **Create a new branch in git:** `orpc-integration` for this work.
2.  **No Database Changes:** Maintain existing business logic in `lib/services`.
3.  Adhere to Next.js 15 (App Router) async request/headers paradigms.
4.  Preserve Multi-tenancy and RBAC security models strictly.
5.  Support both Standard RPC (Client-side) and Server Action (Progressive Enhancement) patterns.

---

## Phase 1: Core Infrastructure & Context

**Directory:** `lib/orpc`

### 1.1 Context Definition (`lib/orpc/context.ts`)
Create a context generator that bridges Next.js, Supabase, and your Tenant logic.
*   **Imports:** `db` from `@/app/lib/db`, `createClient` from `@/app/lib/supabase/server`.
*   **Requirements:**
    *   Must be an `async` function receiving standard fetch `req` (optional) or Next.js headers.
    *   **Supabase:** Await `createClient()` (Supabase SSR) and fetch `getUser()`.
    *   **Tenant Resolution:**
        *   Await `cookies()`.
        *   Read `current-org-id` from cookies.
        *   *Validation:* If `current-org-id` exists, verify the user is a member using `db.organizationMember`.
        *   Return `orgId` and `userRole` (OWNER/ADMIN/MEMBER) in the context if valid.
    *   **Return Type:** `{ user: User | null, db: PrismaClient, orgId: string | null, role: OrganizationRole | null }`.

### 1.2 Procedure Builder (`lib/orpc/server.ts`)
Initialize the oRPC builder instance.
*   **Middleware Stack:**
    *   **`loggingMiddleware`**: Log procedure path and execution time (use `console.log` in dev).
    *   **`errorMiddleware`**: Catch specific domain errors (e.g., "Limit reached") and map them to `ORPCError` codes (e.g., `PRECONDITION_FAILED`, `UNAUTHORIZED`).

### 1.3 Authorization Procedures (`lib/orpc/procedures.ts`)
Define reusable procedure baselines to enforce security policies globally.
*   **`publicProcedure`**: No auth required.
*   **`protectedProcedure`**: Checks `ctx.user`. Throws `UNAUTHORIZED` if null.
*   **`orgProcedure`**: Extends `protectedProcedure`. Checks `ctx.orgId`. Throws `FORBIDDEN` if null (user not in an org context).
*   **`adminProcedure`**: Extends `orgProcedure`. Checks if `ctx.role` is 'ADMIN' or 'OWNER'.
*   **`ownerProcedure`**: Extends `orgProcedure`. Checks if `ctx.role` is 'OWNER'.
*   **`superAdminProcedure`**: Check `ctx.user.email` against `process.env.SUPER_ADMIN_EMAILS`.

---

## Phase 2: Router Implementation (Domain Logic)

**Directory:** `lib/orpc/routers`
**Strategy:** Do not rewrite business logic. Import existing classes from `lib/services/*` and wrap them.

### 2.1 Organization Router (`organization.ts`)
Migrate logic from `app/actions/organization.ts`.
*   **`create`**: `protectedProcedure`. Input: Zod schema `{ name: string }`. Call `OrganizationService.createOrganization`.
*   **`updateMemberRole`**: `adminProcedure`. Input: `{ targetUserId: string, newRole: Enum }`. Logic: Call `OrganizationService.updateMemberRole`. *Constraint:* Add check to prevent demoting OWNER (keep logic from `actions/organization.ts`).
*   **`inviteMember`**: `adminProcedure`. Input: `{ email: string, role: Enum }`. Logic: Check limits (`LIMITS.MAX_PENDING_INVITES_PER_ORG`), then call `InvitationService.createInvite`.
*   **`delete`**: `ownerProcedure`. Input: `{ transferToOrgId?: string }`. Call logic for credit transfer + soft delete.

### 2.2 Project Router (`project.ts`)
Migrate `app/actions/project.ts`.
*   **`create`**: `orgProcedure`. Input: `{ name: string }`. Logic: Check `LIMITS.MAX_PROJECTS_PER_ORGANIZATION`, generate slug, call `ProjectService.createProject`.
*   **`delete`**: `adminProcedure` (Note: Project deletion requires Admin in your kit). Call `ProjectService.deleteProject`.

### 2.3 User/Settings Router (`user.ts`)
*   **`updateTheme`**: `protectedProcedure`. Input: `{ theme: 'light' | 'dark' | 'system' }`. Update Prisma User model.

### 2.4 Root Router (`lib/orpc/root.ts`)
Combine routers:
```typescript
export const appRouter = os.router({
  org: orgRouter,
  project: projectRouter,
  user: userRouter
});
```

## Phase 3: Server Integration & API
### 3.1 Next.js Route Handler (`app/api/rpc/[[...rest]]/route.ts`)
Expose the API for client-side usage (TanStack Query) and external tools (Scalar).
*   **Use** `@orpc/server/fetch adapter` to handle requests.
*   **Important:** Properly await `context()` implementation from Phase 1.1 inside the handler.
*   **Methods:** `GET`, `POST`.

### 3.2 Server-Side Caller (Optimization) (`lib/orpc/rsc-client.ts`)
Create a caller for Server Components to avoid HTTP round-trips.
*   **Use** `createCallerFactory` from oRPC.
*   **Export** a helper `getRPCCaller()` that automatically awaits headers/cookies and generates a context, returning a fully typed caller for `page.tsx` usage.

## Phase 4: Client-Side Configuration

4.1 Query Provider (`components/providers/query-provider.tsx`)

*   **Setup** `QueryClient` and `QueryClientProvider` from `@tanstack/react-query`.
*   Initialize the oRPC client using `createORPCClient` and `@orpc/client/fetch`.
*   Configure the link to point to `/api/rpc`.

4.2 Client Hooks (`lib/orpc/client.ts`)
*   Export `orpc` using `createORPCReact` for standard React hooks usage (`orpc.org.create.useMutation`).


## Phase 5: Component Refactoring Strategy
Target: Refactor `app/(dashboard)/` components.

### 5.1 Pattern A: Interactive Client Components (e.g., `AutoRenewSwitch.tsx`)
*   **Current:** Uses `useToast` and manual `startTransition`.
*   **Target:** Use `orpc.user.updateSettings.useMutation()`.
*   **Implementation:**
    *   On `onSuccess`: Trigger `toast.success`.
    *   On `onError`: Trigger `toast.error`.
    *   On `onSettled`: `router.refresh()` (to sync server components).

### 5.2 Pattern B: Forms & Dialogs (e.g., `create-org-dialog.tsx`)
*   **Current:** HTML `<form>` with Server Actions (`createOrganization(formData)`).
*   **Target:** Use oRPC Server Actions Integration (`.actionable`).
*   **Implementation:**
    *   In the router, ensure procedures are marked `.actionable()`.
    *   In the component, use `useActionState` (Next.js 15) with the oRPC procedure.
    *   **Zod Integration:** Ensure Zod schemas handle `FormData` transformation or use `zfd` (zod-form-data) if handling raw form submissions.

### 5.3 Pattern C: Server Component Data Fetching (e.g., `dashboard/page.tsx`)
*   **Current:** Direct calls to `OrganizationService.getUserOrganizations()`.
*   **Target:** Use `getRPCCaller` (from Phase 3.2).    
*   **Code:**
```typescript
const orpc = await getRPCCaller();
const organizations = await orpc.org.list();
```

## Phase 6: Documentation & Validation
1. **OpenAPI Endpoint:** Create `app/api/openapi.json/route.ts` using `@orpc/openapi`. Map the `appRouter`.
2. **Scalar Docs:** Create `app/api/docs/page.tsx` rendering Scalar UI pointing to the OpenAPI endpoint.
3. **Verification Script:** Create `scripts/test-rpc.ts` that mocks a context and calls `appRouter.org.create` to ensure RBAC logic throws correctly without spinning up the full server.

## Deliverables Checklist
1. Fully typed `appRouter`.
2. `lib/orpc/context.ts` handling Supabase+Cookies.
3. Replaced `app/actions/*.ts` with oRPC procedures.
4. Updated `app/(dashboard)/layout.tsx` to wrap children in `QueryProvider`.
5. Refactored `TeamSwitcher` and `CreateProjectDialog` to use oRPC hooks.


