// app/(super-admin)/_components/revenue-chart.tsx

'use client';

import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DEFAULT_CURRENCY, LOCALE } from '@/lib/constants';
import { BarChart3 } from 'lucide-react';

export type RevenuePoint = {
  month: string;
  value: number;
};

type RevenueChartProps = {
  className?: string;
  data: RevenuePoint[]; // Accepts up to 12 months of data
};

const BAR_COLORS = [
  'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500',
];

const formatCurrency = (amount: number) => {
  const localeString = LOCALE.replace('_', '-');
  return new Intl.NumberFormat(localeString, {
    style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompact = (amount: number) => {
  const localeString = LOCALE.replace('_', '-');
  return new Intl.NumberFormat(localeString, {
    style: 'currency', currency: DEFAULT_CURRENCY, notation: 'compact', maximumFractionDigits: 1,
  }).format(amount);
};

export const RevenueChart = memo(({ className, data }: RevenueChartProps) => {
  // State for time period selection
  const [period, setPeriod] = useState<string>("6");

  // Filter data based on selection (Last N months)
  const filteredData = useMemo(() => {
    const sliceCount = parseInt(period);
    // Slice from the end of the array to get the "Latest" N months
    return data.slice(-sliceCount);
  }, [data, period]);

  const maxValue = Math.max(...filteredData.map((d) => d.value)) || 1;

  // Recalculate stats based on FILTERED data
  const stats = useMemo(() => {
    const total = filteredData.reduce((acc, curr) => acc + curr.value, 0);
    const average = total / (filteredData.length || 1);
    
    const firstVal = filteredData[0]?.value || 0;
    const lastVal = filteredData[filteredData.length - 1]?.value || 0;
    let growthRate = 0;
    
    if (firstVal === 0 && lastVal > 0) growthRate = 100;
    else if (firstVal > 0) growthRate = ((lastVal - firstVal) / firstVal) * 100;
    
    return { total, average, growthRate };
  }, [filteredData]);

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> {/* ✅ Icon added */}
            Revenue Analytics
          </CardTitle>
          <span className="text-xs font-normal text-muted-foreground">
            Monthly revenue performance
          </span>
        </div>
        
        {/* ✅ Time Period Selector */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between gap-6">
        
        {/* Chart Area */}
        <div className="flex justify-between gap-3 h-52 items-end">
          <TooltipProvider delayDuration={100}>
            {filteredData.map((point, index) => {
              const height = `${Math.round((point.value / maxValue) * 100)}%`;
              const isZero = point.value === 0;
              // Ensure consistent coloring even when sliced by using absolute index or just cycling
              const colorClass = BAR_COLORS[index % BAR_COLORS.length];

              // Calculate MoM based on filtered view
              const prevValue = filteredData[index - 1]?.value || 0;
              let momChange = 0;
              if (prevValue === 0 && point.value > 0) momChange = 100;
              else if (prevValue > 0) momChange = ((point.value - prevValue) / prevValue) * 100;

              return (
                <div key={point.month} className="flex flex-1 flex-col items-center gap-2 h-full justify-end group">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative w-full flex items-end h-full">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ease-in-out ${colorClass} hover:opacity-80 cursor-pointer`}
                          style={{ height: isZero ? '4px' : height }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border-border shadow-xl p-2 rounded-lg text-xs font-medium">
                      <div className="text-center mb-1 text-muted-foreground">{point.month}</div>
                      <div className="text-lg font-bold text-center">
                        {formatCurrency(point.value)}
                      </div>
                      {index > 0 && (
                        <div className={`text-center mt-1 ${momChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {momChange > 0 ? '+' : ''}{Math.round(momChange)}%
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {point.month}
                    </span>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Footer Stats (Dynamic) */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-500">
              {formatCompact(stats.total)}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Total Revenue
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {stats.growthRate > 0 ? '+' : ''}{Math.round(stats.growthRate)}%
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Growth Rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">
              {formatCompact(stats.average)}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              Average
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
});

RevenueChart.displayName = 'RevenueChart';


