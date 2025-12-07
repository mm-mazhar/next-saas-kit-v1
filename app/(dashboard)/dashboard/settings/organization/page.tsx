// app/(dashboard)/dashboard/settings/organization/page.tsx

import { InviteMemberDialog } from '@/app/(dashboard)/_components/invite-member-dialog'
import { createClient } from '@/app/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
//
import { OrgNameForm } from '@/app/(dashboard)/_components/org-name-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/(dashboard)/_components/ui/tabs'
import { InvitationService } from '@/lib/services/invitation-service'
import { PendingInvitesList } from '@/app/(dashboard)/_components/pending-invites-list'
import { OrganizationService } from '@/lib/services/organization-service'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrganizationSettingsPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value
  const organizations = await OrganizationService.getUserOrganizations(user.id)
  const effectiveOrgId = currentOrgId ?? (organizations[0]?.id ?? null)

  if (!effectiveOrgId) {
    return (
      <div className='flex h-[50vh] items-center justify-center'>
        <p className='text-muted-foreground'>No organization found.</p>
      </div>
    )
  }

  const org = await OrganizationService.getOrganizationById(effectiveOrgId)
  
  if (!org) {
    return (
      <div className='flex h-[50vh] items-center justify-center'>
        <p className='text-muted-foreground'>Organization not found.</p>
      </div>
    )
  }

  const invites = await InvitationService.getOrganizationInvites(effectiveOrgId)

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
      <div>
        <h3 className='text-lg font-medium'>Organization Settings</h3>
        <p className='text-sm text-muted-foreground'>
          Manage your organization settings and members.
        </p>
      </div>
      <Tabs defaultValue='members' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='general'>General</TabsTrigger>
          <TabsTrigger value='members'>Members</TabsTrigger>
        </TabsList>
        <TabsContent value='general' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Organization Name</CardTitle>
              <CardDescription>
                This is your organization’s visible name.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgNameForm orgId={org.id} defaultName={org.name} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Delete the organization and all its projects.</CardDescription>
            </CardHeader>
            <CardContent>
              {org.slug.startsWith('default-organization') ? (
                <p className='text-sm text-muted-foreground'>Default Organization cannot be deleted.</p>
              ) : (
                <form action={async () => {
                  'use server'
                  const { deleteOrganization } = await import('@/app/actions/organization')
                  await deleteOrganization(org.id)
                }}>
                  <Button variant='destructive' type='submit'>Delete Organization</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value='members' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='space-y-1'>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  Manage who has access to this organization.
                </CardDescription>
              </div>
              <InviteMemberDialog orgId={org.id} />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {org.members.map((member) => (
                  <div
                    key={member.id}
                    className='flex items-center justify-between space-x-4'
                  >
                    <div className='flex items-center space-x-4'>
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${member.userId}`} />
                        <AvatarFallback>OM</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium leading-none'>
                          User ID: {member.userId.substring(0, 8)}...
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          {member.role}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const ownerCount = org.members.filter(m => m.role === 'OWNER').length
                      const canRemove = member.role !== 'OWNER' || ownerCount > 1
                      return canRemove ? (
                        <form action={async () => {
                          'use server'
                          const { removeMember } = await import('@/app/actions/organization')
                          await removeMember(org.id, member.userId)
                        }}>
                          <Button variant='outline' size='sm' type='submit'>Remove</Button>
                        </form>
                      ) : null
                    })()}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {invites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invites</CardTitle>
                <CardDescription>
                  Invitations that have been sent but not yet accepted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PendingInvitesList
                  invites={invites.map((i) => ({
                    id: i.id,
                    email: i.email,
                    role: i.role,
                    status: i.status,
                    expiresAt: new Date(i.expiresAt).toISOString(),
                    link: InvitationService.getInviteLink(i.token),
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
