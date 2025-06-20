
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  ShoppingBag,
  Tags,
  Users,
  BarChart3,
  LogOut,
  Settings,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger, // For desktop collapse, if needed explicitly. Sidebar handles its own collapse trigger.
  useSidebar,
} from '@/components/ui/sidebar';


interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // subItems?: NavItem[]; // Sub-items can be added later if needed
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminSidebarContent() { // Renamed from AdminSidebar and refactored
  const pathname = usePathname();
  const { logout, currentUser } = useAuth();
  const router = useRouter();
  const { state: sidebarState, toggleSidebar, isMobile } = useSidebar(); // Get sidebar state

  const handleLogout = () => {
    logout();
    router.push('/'); 
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground h-14 px-2">
          <ShoppingBag className="h-6 w-6 text-sidebar-primary" />
          {sidebarState === 'expanded' && <span className="font-headline text-xl">Local Commerce</span>}
        </Link>
        {/* Desktop collapse trigger - usually ui/sidebar handles this automatically if using its own header structure or a rail */}
        {/* For now, relying on the default Ctrl+B or mobile trigger */}
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild={!isMobile && sidebarState === 'collapsed'} // Use asChild for TooltipTrigger in collapsed mode
                isActive={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                tooltip={{ children: item.label, side: 'right' }}
                className="justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  {(sidebarState === 'expanded' || isMobile) && <span className="text-sm">{item.label}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center justify-start gap-2 w-full p-2 h-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={currentUser?.name ? `https://placehold.co/40x40.png?text=${currentUser.name.charAt(0)}` : `https://placehold.co/40x40.png`} 
                  alt={currentUser?.name || 'Admin'}
                  data-ai-hint="avatar sidebar"
                />
                <AvatarFallback>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}</AvatarFallback>
              </Avatar>
              {(sidebarState === 'expanded' || isMobile) && (
                <div className="text-left flex-grow overflow-hidden">
                  <p className="text-sm font-medium truncate">{currentUser?.name || 'Administrator'}</p>
                  <p className="text-xs text-sidebar-foreground/70 truncate">{currentUser?.email}</p>
                </div>
              )}
              {(sidebarState === 'expanded' || isMobile) && <ChevronDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 bg-popover border-border text-popover-foreground">
            <DropdownMenuLabel className="text-foreground">{currentUser?.name || 'Admin Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border"/>
            <DropdownMenuItem disabled className="cursor-not-allowed"> {/* Update later if profile settings page for admin is added */}
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border"/>
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 hover:!bg-destructive/10 focus:!bg-destructive/10 focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
}
