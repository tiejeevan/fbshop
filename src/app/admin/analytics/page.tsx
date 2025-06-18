
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { localStorageService } from '@/lib/localStorage';
import type { Product, User, Order, Category, LoginActivity } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { DollarSign, ShoppingBag, Users, Package, Activity, TrendingUp, Eye } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface AnalyticsStats {
  totalProducts: number;
  totalCategories: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  recentLogins: number; // Logins in the last 7 days
}

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ProductPerformanceData {
  name: string;
  views: number;
  purchases: number;
  revenue: number;
}

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--chart-1))",
  },
  purchases: {
    label: "Purchases",
    color: "hsl(var(--chart-2))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-3))",
  },
   orders: {
    label: "Orders",
    color: "hsl(var(--chart-4))",
  },
  logins: {
     label: "Logins",
     color: "hsl(var(--chart-5))",
  }
} satisfies ChartConfig


export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformanceData[]>([]);
  const [salesOverTime, setSalesOverTime] = useState<ChartDataPoint[]>([]);
  const [userActivity, setUserActivity] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const products = localStorageService.getProducts();
    const categories = localStorageService.getCategories();
    const customers = localStorageService.getUsers().filter(u => u.role === 'customer');
    const orders = localStorageService.getOrders();
    const loginActivities = localStorageService.getLoginActivity();

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentLogins = loginActivities.filter(activity => 
        activity.type === 'login' && parseISO(activity.timestamp) >= sevenDaysAgo
    ).length;

    setStats({
      totalProducts: products.length,
      totalCategories: categories.length,
      totalCustomers: customers.length,
      totalOrders: orders.length,
      totalRevenue,
      recentLogins,
    });

    // Product Performance (Top 5 by purchases)
    const topProducts = products
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        views: p.views,
        purchases: p.purchases,
        revenue: p.purchases * p.price,
      }));
    setProductPerformance(topProducts);

    // Sales Over Time (Last 7 days - Mocked/Simplified)
    // For real data, you'd group orders by day
    const mockSalesData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dailyOrders = orders.filter(o => format(parseISO(o.orderDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
        mockSalesData.push({ 
            name: format(date, 'MMM d'), 
            value: dailyOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        });
    }
    setSalesOverTime(mockSalesData);
    
    // User Activity (Logins per day - Last 7 days - Simplified)
    const mockUserActivity: ChartDataPoint[] = [];
     for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dailyLogins = loginActivities.filter(activity => 
            activity.type === 'login' && format(parseISO(activity.timestamp), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ).length;
        mockUserActivity.push({
            name: format(date, 'MMM d'),
            value: dailyLogins
        });
    }
    setUserActivity(mockUserActivity);

    setIsLoading(false);
  }, []);

  if (isLoading || !stats) {
    return <div className="text-center py-10">Loading analytics data...</div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-4xl text-primary">Store Analytics</h1>
        <p className="text-muted-foreground">An overview of your store&apos;s performance.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins (7d)</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentLogins}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Sales Overview (Last 7 Days)</CardTitle>
            <CardDescription>Total sales revenue per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={salesOverTime} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Bar dataKey="value" fill="var(--color-revenue)" radius={4} name="Revenue" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">User Activity (Last 7 Days)</CardTitle>
             <CardDescription>Number of user logins per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={userActivity} accessibilityLayer margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent hideIndicator />} />
                    <Legend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-logins)" strokeWidth={2} dot={false} name="Logins" />
                </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Top Performing Products</CardTitle>
          <CardDescription>Top 5 products by number of purchases.</CardDescription>
        </CardHeader>
        <CardContent>
            {productPerformance.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <BarChart data={productPerformance} layout="vertical" accessibilityLayer
                    margin={{ left: 30, right: 30 }}
                >
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} className="text-xs truncate"/>
                    <XAxis dataKey="purchases" type="number" />
                    <Tooltip 
                        content={
                            <ChartTooltipContent 
                                formatter={(value, name, props) => {
                                    const item = props.payload as ProductPerformanceData;
                                    if (name === "purchases") return (<div className="flex flex-col gap-0.5"><span className="font-semibold">{item.purchases} Purchases</span><span className="text-xs text-muted-foreground">${item.revenue.toFixed(2)} Revenue</span></div>);
                                    return value;
                                }} 
                                hideIndicator 
                            />
                        } 
                    />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="purchases" fill="var(--color-purchases)" radius={4} barSize={20} />
                </BarChart>
            </ChartContainer>
            ) : (
                 <p className="text-muted-foreground text-center py-4">No product purchase data yet.</p>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
