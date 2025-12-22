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