// app/(super-admin)/admin/organizations/page.tsx

import prisma from '@/app/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Eye } from 'lucide-react';
import Link from 'next/link';
import { DataPagination } from '../../_components/data-pagination';
import { OrgTableToolbar } from '../../_components/org-table-toolbar';

function timeAgo(date: Date) {
  return new Date(date).toLocaleDateString();
}

export default async function OrganizationsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const query = (searchParams.q as string) || '';

  const whereClause = query ? {
    OR: [
      { name: { contains: query, mode: 'insensitive' as const } },
      { slug: { contains: query, mode: 'insensitive' as const } },
    ],
    deletedAt: null
  } : { deletedAt: null };

  // Run queries in parallel without transaction for better performance
  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, projects: true } },
        subscription: { select: { planId: true, status: true } }
      }
    }),
    prisma.organization.count({ where: whereClause }),
  ]);

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">Manage workspaces and tenant data.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5"/> All Organizations</CardTitle></CardHeader>
        <CardContent>
          <OrgTableToolbar />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground">{org.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.subscription?.status === 'active' ? (
                        <Badge className="w-[90px] justify-center text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          Pro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-[90px] justify-center text-xs font-medium">
                          Free
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{org._count.members}</TableCell>
                    <TableCell>{org._count.projects}</TableCell>
                    <TableCell>{org.credits}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{timeAgo(org.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/organizations/${org.id}`} className="text-muted-foreground hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination total={total} currentPage={page} limit={limit} />
        </CardContent>
      </Card>
    </div>
  );
}
