'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, DollarSign, ShoppingBag, Users } from 'lucide-react';
import Link from 'next/link';
import { localStorageService } from '@/lib/localStorage';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalCustomers: number;
  totalOrders: number;
}

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalCustomers: 0,
    totalOrders: 0,
  });

  useEffect(() => {
    // Fetch stats from localStorage
    const products = localStorageService.getProducts();
    const categories = localStorageService.getCategories();
    const customers = localStorageService.getUsers().filter(u => u.role === 'customer');
    const orders = localStorageService.getOrders();

    setStats({
      totalProducts: products.length,
      totalCategories: categories.length,
      totalCustomers: customers.length,
      totalOrders: orders.length,
    });
  }, []);


  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-headline text-4xl text-primary">Welcome, {currentUser?.name || 'Admin'}!</h1>
        <p className="text-muted-foreground">Here&apos;s an overview of your Local Commerce store.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Manage your inventory
            </p>
            <Link href="/admin/products" className="text-sm text-primary hover:underline mt-2 block">View Products</Link>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
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
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
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
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Track sales performance (simulated)
            </p>
            {/* Link to orders/analytics page when implemented */}
            {/* <Link href="/admin/orders" className="text-sm text-primary hover:underline mt-2 block">View Orders</Link> */}
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for recent activity or quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
