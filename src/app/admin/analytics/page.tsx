
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { localStorageService } from '@/lib/localStorage';
import type { Product, User, Order, Category, LoginActivity, OrderItem } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { DollarSign, ShoppingBag, Users, Package, Activity, TrendingUp, Eye, Filter } from 'lucide-react';
import { format, subDays, parseISO, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, endOfDay, endOfWeek, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  [key: string]: any; // For multiple series
}

interface ProductPerformanceData {
  id: string;
  name: string;
  quantitySold: number;
  totalRevenue: number;
}

interface CategorySalesData {
  id: string;
  name: string;
  itemsSold: number;
  totalRevenue: number;
  orderCount: number; // Number of orders featuring this category
}

type TimePeriodOption = '7d' | '30d' | '90d' | 'all';

const timePeriodOptions: { value: TimePeriodOption; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const chartConfigBase: ChartConfig = {
  views: { label: "Views", color: "hsl(var(--chart-1))" },
  purchases: { label: "Purchases", color: "hsl(var(--chart-2))" },
  revenue: { label: "Revenue", color: "hsl(var(--chart-3))" },
  orders: { label: "Orders", color: "hsl(var(--chart-4))" },
  logins: { label: "Logins", color: "hsl(var(--chart-5))" },
  itemsSold: { label: "Items Sold", color: "hsl(var(--chart-2))" },
  quantitySold: { label: "Quantity Sold", color: "hsl(var(--chart-1))" },
};


const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--primary))", "hsl(var(--secondary))"];


export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformanceData[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesData[]>([]);
  const [salesOverTime, setSalesOverTime] = useState<ChartDataPoint[]>([]);
  const [userActivity, setUserActivity] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriodOption>('30d');

  const allOrders = useMemo(() => localStorageService.getOrders(), []);
  const allProducts = useMemo(() => localStorageService.getProducts(), []);
  const allCategories = useMemo(() => localStorageService.getCategories(), []);
  const allLoginActivities = useMemo(() => localStorageService.getLoginActivity(), []);

  const filteredOrders = useMemo(() => {
    if (selectedTimePeriod === 'all') return allOrders;
    let startDate: Date;
    const now = new Date();
    if (selectedTimePeriod === '7d') startDate = subDays(now, 6);
    else if (selectedTimePeriod === '30d') startDate = subDays(now, 29);
    else if (selectedTimePeriod === '90d') startDate = subDays(now, 89);
    else startDate = new Date(0); // Should not happen if 'all' is handled

    return allOrders.filter(order => isWithinInterval(parseISO(order.orderDate), { start: startDate, end: endOfDay(now) }));
  }, [allOrders, selectedTimePeriod]);


  useEffect(() => {
    setIsLoading(true);
    
    // Basic Stats (can use allOrders for these counts)
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentLogins = allLoginActivities.filter(activity => 
        activity.type === 'login' && parseISO(activity.timestamp) >= sevenDaysAgo
    ).length;

    setStats({
      totalProducts: allProducts.length,
      totalCategories: allCategories.length,
      totalCustomers: localStorageService.getUsers().filter(u => u.role === 'customer').length,
      totalOrders: allOrders.length,
      totalRevenue,
      recentLogins,
    });

    // Product Performance (using filteredOrders)
    const productSalesMap = new Map<string, { quantity: number; revenue: number }>();
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const current = productSalesMap.get(item.productId) || { quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += item.priceAtPurchase * item.quantity;
        productSalesMap.set(item.productId, current);
      });
    });
    const perfData = Array.from(productSalesMap.entries()).map(([productId, data]) => {
      const product = allProducts.find(p => p.id === productId);
      return {
        id: productId,
        name: product?.name || 'Unknown Product',
        quantitySold: data.quantity,
        totalRevenue: data.revenue,
      };
    }).sort((a,b) => b.totalRevenue - a.totalRevenue); // Sort by revenue
    setProductPerformance(perfData);


    // Category Sales (using filteredOrders)
    const categorySalesMap = new Map<string, { items: number; revenue: number; orderIds: Set<string> }>();
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const product = allProducts.find(p => p.id === item.productId);
        if (product?.categoryId) {
          const category = allCategories.find(c => c.id === product.categoryId);
          if (category) {
            const current = categorySalesMap.get(category.id) || { items: 0, revenue: 0, orderIds: new Set() };
            current.items += item.quantity;
            current.revenue += item.priceAtPurchase * item.quantity;
            current.orderIds.add(order.id);
            categorySalesMap.set(category.id, current);
          }
        }
      });
    });
     const catSalesData = Array.from(categorySalesMap.entries()).map(([catId, data]) => {
      const category = allCategories.find(c => c.id === catId);
      return {
        id: catId,
        name: category?.name || 'Unknown Category',
        itemsSold: data.items,
        totalRevenue: data.revenue,
        orderCount: data.orderIds.size,
      };
    }).sort((a,b) => b.totalRevenue - a.totalRevenue);
    setCategorySales(catSalesData);


    // Sales Over Time (using filteredOrders)
    let groupedSales: ChartDataPoint[] = [];
    const now = new Date();
    if (selectedTimePeriod === '7d' || selectedTimePeriod === '30d') {
      const daysToCover = selectedTimePeriod === '7d' ? 7 : 30;
      const intervalDays = eachDayOfInterval({ start: subDays(now, daysToCover - 1), end: now });
      groupedSales = intervalDays.map(day => {
        const dailyTotal = filteredOrders
          .filter(o => format(parseISO(o.orderDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return { name: format(day, 'MMM d'), value: dailyTotal };
      });
    } else if (selectedTimePeriod === '90d') {
      const intervalWeeks = eachWeekOfInterval({ start: subDays(now, 89), end: now }, { weekStartsOn: 1 });
      groupedSales = intervalWeeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weeklyTotal = filteredOrders
          .filter(o => isWithinInterval(parseISO(o.orderDate), { start: weekStart, end: weekEnd }))
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return { name: `Wk ${format(weekStart, 'w')}`, value: weeklyTotal };
      });
    } else { // 'all' time
      const intervalMonths = eachMonthOfInterval({
        start: allOrders.length > 0 ? parseISO(allOrders.reduce((min, o) => (o.orderDate < min ? o.orderDate : min), allOrders[0].orderDate)) : now,
        end: now
      });
      groupedSales = intervalMonths.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const monthlyTotal = filteredOrders // Using filteredOrders here which is actually allOrders for 'all'
          .filter(o => isWithinInterval(parseISO(o.orderDate), { start: monthStart, end: monthEnd }))
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return { name: format(monthStart, 'MMM yyyy'), value: monthlyTotal };
      });
    }
    setSalesOverTime(groupedSales);
    
    // User Activity (Logins per day - Last 7 days - Simplified, unchanged)
    const mockUserActivity: ChartDataPoint[] = [];
     for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dailyLogins = allLoginActivities.filter(activity => 
            activity.type === 'login' && format(parseISO(activity.timestamp), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ).length;
        mockUserActivity.push({ name: format(date, 'MMM d'), value: dailyLogins });
    }
    setUserActivity(mockUserActivity);

    setIsLoading(false);
  }, [filteredOrders, allProducts, allCategories, allLoginActivities, selectedTimePeriod, allOrders]);

  const dynamicChartConfig = useMemo(() => {
    const config: ChartConfig = { ...chartConfigBase };
    categorySales.slice(0, COLORS.length).forEach((cat, index) => {
        if (!config[cat.id]) { // Avoid overwriting base config keys
            config[cat.id] = { label: cat.name, color: COLORS[index % COLORS.length] };
        }
    });
    productPerformance.slice(0, COLORS.length).forEach((prod, index) => {
       if (!config[prod.id]) {
            config[prod.id] = { label: prod.name, color: COLORS[index % COLORS.length] };
       }
    });
    return config;
  }, [categorySales, productPerformance]);


  if (isLoading || !stats) {
    return <div className="text-center py-10">Loading analytics data...</div>;
  }

  const topNProductsByRevenue = productPerformance.slice(0, 5);
  const topNProductsByQuantity = [...productPerformance].sort((a,b) => b.quantitySold - a.quantitySold).slice(0,5);
  const topNCategoriesByRevenue = categorySales.slice(0, 5);


  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="font-headline text-4xl text-primary">Store Analytics</h1>
            <p className="text-muted-foreground">An overview of your store&apos;s performance.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-5 w-5 text-muted-foreground hidden sm:block"/>
            <Select value={selectedTimePeriod} onValueChange={(value) => setSelectedTimePeriod(value as TimePeriodOption)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select Time Period" />
                </SelectTrigger>
                <SelectContent>
                    {timePeriodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Stat Cards remain the same, using 'stats' which are overall totals */}
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><ShoppingBag className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalOrders}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Products</CardTitle><Package className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalProducts}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Customers</CardTitle><Users className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalCustomers}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Recent Logins (7d)</CardTitle><Activity className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.recentLogins}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Sales Overview ({timePeriodOptions.find(o=>o.value === selectedTimePeriod)?.label})</CardTitle>
            <CardDescription>Total sales revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dynamicChartConfig} className="h-[300px] w-full">
              <LineChart data={salesOverTime} accessibilityLayer margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickFormatter={(value) => `$${value}`} allowDecimals={false}/>
                <ChartTooltip content={<ChartTooltipContent hideIndicator formatter={(value, name, props) => (`$${Number(props.payload?.value || 0).toFixed(2)}`)} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="value" stroke="var(--color-revenue)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-revenue)", strokeWidth:1, stroke: "hsl(var(--background))"}} name="Revenue" activeDot={{r:6}} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">User Activity (Last 7 Days)</CardTitle>
            <CardDescription>Number of user logins per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dynamicChartConfig} className="h-[300px] w-full">
                <LineChart data={userActivity} accessibilityLayer margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent hideIndicator />} />
                    <Legend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-logins)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-logins)", strokeWidth:1, stroke: "hsl(var(--background))"}} name="Logins" activeDot={{r:6}}/>
                </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Top Products by Revenue ({timePeriodOptions.find(o=>o.value === selectedTimePeriod)?.label})</CardTitle>
            <CardDescription>Top 5 products generating the most revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            {topNProductsByRevenue.length > 0 ? (
            <ChartContainer config={dynamicChartConfig} className="h-[350px] w-full">
                <BarChart data={topNProductsByRevenue} layout="vertical" accessibilityLayer margin={{ left: 30, right: 30 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} interval={0} className="text-xs truncate"/>
                    <XAxis dataKey="totalRevenue" type="number" tickFormatter={(value) => `$${value}`} />
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value, name, props) => (
                        <div>
                            <p className="font-medium">{props.payload?.name}</p>
                            <p className="text-muted-foreground text-xs">Revenue: ${Number(props.payload?.totalRevenue).toFixed(2)}</p>
                            <p className="text-muted-foreground text-xs">Units Sold: {props.payload?.quantitySold}</p>
                        </div>
                    )} hideIndicator />} />
                    <Bar dataKey="totalRevenue" fill="var(--color-revenue)" radius={4} barSize={20}>
                       {topNProductsByRevenue.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
            ) : <p className="text-muted-foreground text-center py-4">No product sales data for this period.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Top Products by Quantity ({timePeriodOptions.find(o=>o.value === selectedTimePeriod)?.label})</CardTitle>
            <CardDescription>Top 5 products by units sold.</CardDescription>
          </CardHeader>
          <CardContent>
             {topNProductsByQuantity.length > 0 ? (
            <ChartContainer config={dynamicChartConfig} className="h-[350px] w-full">
                <BarChart data={topNProductsByQuantity} layout="vertical" accessibilityLayer margin={{ left: 30, right: 30 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} interval={0} className="text-xs truncate"/>
                    <XAxis dataKey="quantitySold" type="number" allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value, name, props) => (
                         <div>
                            <p className="font-medium">{props.payload?.name}</p>
                            <p className="text-muted-foreground text-xs">Units Sold: {props.payload?.quantitySold}</p>
                            <p className="text-muted-foreground text-xs">Revenue: ${Number(props.payload?.totalRevenue).toFixed(2)}</p>
                        </div>
                    )} hideIndicator />} />
                    <Bar dataKey="quantitySold" fill="var(--color-itemsSold)" radius={4} barSize={20}>
                        {topNProductsByQuantity.map((entry, index) => (
                            <Cell key={`cell-qty-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
             ) : <p className="text-muted-foreground text-center py-4">No product sales data for this period.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Sales by Category ({timePeriodOptions.find(o=>o.value === selectedTimePeriod)?.label})</CardTitle>
          <CardDescription>Total revenue per category.</CardDescription>
        </CardHeader>
        <CardContent>
          {topNCategoriesByRevenue.length > 0 ? (
            <ChartContainer config={dynamicChartConfig} className="h-[350px] w-full">
              <BarChart data={topNCategoriesByRevenue} accessibilityLayer margin={{ left: 5, right: 20, bottom: 40 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} interval={0} className="text-xs" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value, name, props) => (
                    <div>
                        <p className="font-medium">{props.payload?.name}</p>
                        <p className="text-muted-foreground text-xs">Revenue: ${Number(props.payload?.totalRevenue).toFixed(2)}</p>
                        <p className="text-muted-foreground text-xs">Items Sold: {props.payload?.itemsSold}</p>
                        <p className="text-muted-foreground text-xs">Orders: {props.payload?.orderCount}</p>
                    </div>
                )} hideIndicator />} />
                <Bar dataKey="totalRevenue" name="Revenue" radius={4}>
                  {topNCategoriesByRevenue.map((entry, index) => (
                    <Cell key={`cell-cat-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : <p className="text-muted-foreground text-center py-4">No category sales data for this period.</p>}
        </CardContent>
      </Card>

    </div>
  );
}
