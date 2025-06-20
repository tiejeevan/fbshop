
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, DollarSign, ShoppingBag, Users, Tags, Eye, FileText, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalCustomers: number;
  totalOrders: number;
}

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();
  const { dataSourceType, setDataSourceType, dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalCustomers: 0,
    totalOrders: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);


  useEffect(() => {
    const fetchStats = async () => {
      if (isDataSourceLoading) {
        // console.log("Dashboard: Waiting for data source...");
        setIsStatsLoading(true); // Keep showing stats loading if data source is loading
        return;
      }
      // console.log("Dashboard: Data source ready, fetching stats with:", dataSourceType);
      setIsStatsLoading(true);
      try {
        const products = await dataService.getProducts();
        const categories = await dataService.getCategories();
        const customers = (await dataService.getUsers()).filter(u => u.role === 'customer');
        const orders = await dataService.getOrders();

        setStats({
          totalProducts: products.length,
          totalCategories: categories.length,
          totalCustomers: customers.length,
          totalOrders: orders.length,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast({title: "Error Loading Stats", description: "Could not load dashboard statistics.", variant: "destructive"});
        setStats({ totalProducts: 0, totalCategories: 0, totalCustomers: 0, totalOrders: 0 });
      } finally {
        setIsStatsLoading(false);
      }
    };

    fetchStats();
  }, [dataService, toast, isDataSourceLoading, dataSourceType]); // Add dataSourceType to re-fetch if it changes

  const handleToggleDataSource = () => {
    const newSource = dataSourceType === 'local' ? 'firebase' : 'local';
    setDataSourceType(newSource);
    toast({
        title: "Data Source Switched",
        description: `Switched to ${newSource === 'local' ? 'Local Storage' : 'Firebase Firestore'}. Refreshing data...`,
    });
    // Data re-fetch is handled by useEffect on dataService/dataSourceType change.
    // For a very hard refresh to ensure all components re-evaluate with the new service:
    // setTimeout(() => window.location.reload(), 300); // Uncomment if needed
  };

  const currentLoadingState = isStatsLoading || isDataSourceLoading;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
            <h1 className="font-headline text-4xl text-primary">Welcome, {currentUser?.name || 'Admin'}!</h1>
            <p className="text-muted-foreground">Here&apos;s an overview of your Local Commerce store.</p>
        </div>
        <Button onClick={handleToggleDataSource} variant="outline" disabled={isDataSourceLoading}>
          {isDataSourceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
            dataSourceType === 'local' ? <ToggleLeft className="mr-2 h-5 w-5 text-green-500" /> : <ToggleRight className="mr-2 h-5 w-5 text-blue-500" />}
          Switch to {dataSourceType === 'local' ? 'Firebase' : 'Local Storage'}
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentLoadingState ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Manage your inventory
            </p>
            <Link href="/admin/products" className="text-sm text-primary hover:underline mt-2 block">View Products</Link>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Tags className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentLoadingState ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              Organize your products
            </p>
            <Link href="/admin/categories" className="text-sm text-primary hover:underline mt-2 block">View Categories</Link>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentLoadingState ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Manage user accounts
            </p>
            <Link href="/admin/customers" className="text-sm text-primary hover:underline mt-2 block">View Customers</Link>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentLoadingState ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Using {dataSourceType === 'local' ? 'Local Storage' : 'Firebase'}
            </p>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link href="/admin/products/new" passHref>
            <button className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-center">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-primary" />
              Add New Product
            </button>
          </Link>
          <Link href="/admin/categories/new" passHref>
             <button className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-center">
              <Tags className="h-8 w-8 mx-auto mb-2 text-primary" />
              Add New Category
            </button>
          </Link>
           <Link href="/admin/analytics" passHref>
             <button className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              View Analytics
            </button>
          </Link>
          <Link href="/products" passHref>
             <button className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-center">
              <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
              View Storefront
            </button>
          </Link>
          <Link href="/admin/logs" passHref>
             <button className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              View Action Logs
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
