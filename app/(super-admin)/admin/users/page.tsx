// app/(super-admin)/admin/users/page.tsx

import prisma from '@/app/lib/db';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users } from 'lucide-react';
import { DataPagination } from '../../_components/data-pagination';
import { UserTableToolbar } from '../../_components/user-table-toolbar';

// Helper to calculate time ago
function timeAgo(date: Date) {
  const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (diff < 86400) return 'Today';
  return new Date(date).toLocaleDateString();
}

export default async function UsersPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;

  // 1. Extract params with defaults
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const query = (searchParams.q as string) || '';

  const skip = (page - 1) * limit;

  // 2. Build Prisma Where Clause
  const whereClause = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : {};

  // 3. Fetch Data (Run queries in parallel without transaction for better performance)
  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      take: limit,
      skip: skip,
      orderBy: { createdAt: 'desc' },
      // Include any other relations you need, e.g., memberships
      include: {
        _count: {
          select: { memberships: true }, // Count how many orgs they belong to
        },
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage and view all registered users in the system.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          {/* Toolbar (Search & Limit) */}
          <UserTableToolbar />

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Orgs</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          {/* Note: 'profileImage' isn't in your schema, user metadata logic or gravatar logic here */}
                          <AvatarImage 
                             src={`https://avatar.vercel.sh/${user.email}`} 
                             alt={user.name || 'User'} 
                          />
                          <AvatarFallback>
                            {(user.name || user.email).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name || 'No Name'}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Assuming active if they exist in DB. 
                            If you had an 'isActive' boolean, use that. */}
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell>
                         {/* Display number of orgs they are in */}
                         <span className="text-sm text-muted-foreground">
                            {user._count.memberships} Org{user._count.memberships !== 1 && 's'}
                         </span>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {user.colorScheme.replace('theme-', '')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {timeAgo(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <DataPagination total={totalUsers} currentPage={page} limit={limit} />
          
        </CardContent>
      </Card>
    </div>
  );
}