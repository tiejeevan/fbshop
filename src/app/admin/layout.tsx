
'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link'; 
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarInset,
  SidebarRail, 
} from '@/components/ui/sidebar';
import { AdminSidebarContent } from '@/components/admin/AdminSidebarContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut as LogOutIcon, ChevronDown } from 'lucide-react';
import { useDataSource } from '@/contexts/DataSourceContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading, logout } = useAuth();
  const { dataSourceType } = useDataSource();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  React.useEffect(() => {
    if (!isLoading) {
      if (!currentUser || currentUser.role !== 'admin') {
        router.replace('/products');
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }
  
  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className="border-sidebar-border" 
      >
        <AdminSidebarContent />
      </Sidebar>
      <SidebarRail /> 
      <div className="flex flex-col flex-1">
        <header className="flex h-14 lg:h-[60px] items-center justify-between gap-4 border-b bg-card px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="font-headline text-lg font-semibold text-foreground hidden md:block">
              Admin Panel
            </h1>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-1 h-auto">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={currentUser?.name ? `https://placehold.co/40x40.png?text=${currentUser.name.charAt(0)}` : `https://placehold.co/40x40.png`} 
                    alt={currentUser?.name || 'Admin'} 
                    data-ai-hint="avatar profile"
                  />
                  <AvatarFallback>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-sm text-muted-foreground">
                  {currentUser?.name || 'Administrator'} ({dataSourceType === 'local' ? 'Local' : 'Firebase'})
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10">
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <SidebarInset>
          <div className="p-4 md:p-6 overflow-auto">
            <div key={pathname} className="animate-page-enter">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
