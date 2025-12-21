'use client';

import { Activity, DollarSign, Eye, Users } from 'lucide-react';
import { DashboardCard } from '../_components/dashboard-card';
import { DashboardHeader } from '../_components/dashboard-header';
// You can add RevenueChart and UsersTable here after creating the component files

const stats = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1%',
    changeType: 'positive' as const,
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Active Users',
    value: '2,350',
    change: '+180.1%',
    changeType: 'positive' as const,
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Active Sessions',
    value: '12,234',
    change: '+19%',
    changeType: 'positive' as const,
    icon: Activity,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    title: 'Page Views',
    value: '573K',
    change: '+201',
    changeType: 'positive' as const,
    icon: Eye,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <div className="px-4 md:px-8 pt-2 md:pt-4 pb-4 md:pb-8">
        <div className="flex-1 space-y-6 p-4 pt-0">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
          
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <DashboardCard key={stat.title} stat={stat} index={index} />
            ))}
          </div>

          {/* Charts and Tables Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Add RevenueChart component here (col-span-4) */}
            <div className="col-span-4 rounded-xl border bg-card text-card-foreground p-6">
              <h3 className="font-semibold">Revenue Overview</h3>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Chart Placeholder (Add RevenueChart.tsx)
              </div>
            </div>

            {/* Add RecentActivity component here (col-span-3) */}
            <div className="col-span-3 rounded-xl border bg-card text-card-foreground p-6">
               <h3 className="font-semibold mb-4">Recent Activity</h3>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">New user registered</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  {/* More items... */}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
