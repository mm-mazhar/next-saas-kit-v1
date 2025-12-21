// app/(super-admin)/_components/dashboard-header.tsx

'use client';

import { SidebarTrigger } from '@/app/(dashboard)/_components/sidebar';
import { Themetoggle } from '@/components/Themetoggle';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ChartNoAxesCombined, Home } from 'lucide-react';
import { memo } from 'react';

export const DashboardHeader = memo(() => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-8 sticky top-0 z-10">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList className="text-sm h-10 items-center">
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin" className="flex items-center gap-1.5">
              <Home className="size-3.5" />
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5">
              <ChartNoAxesCombined className="size-3.5" />
              Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <Themetoggle />
      </div>
    </header>
  );
});
DashboardHeader.displayName = 'DashboardHeader';
