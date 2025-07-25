
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
  FileText,
  Printer,
  Briefcase, // Added icon
  ClipboardList, // Added icon
  Eye, // Added icon
  FlaskConical,
} from 'lucide-react';
import React from 'react';
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
  useSidebar, 
  SidebarTrigger, 
} from '@/components/ui/sidebar';
import { useDataSource } from '@/contexts/DataSourceContext';


interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'View Storefront', icon: Eye },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/categories', label: 'Product Categories', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/jobs', label: 'All Jobs', icon: Briefcase },
  { href: '/admin/job-categories', label: 'Job Categories', icon: ClipboardList },
  { href: '/admin/shipping-label-engine', label: 'Shipping Labels', icon: Printer },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/logs', label: 'Action Logs', icon: FileText },
  { href: '/admin/mock-data-generator', label: 'Mock Data AI', icon: FlaskConical },
];

export function AdminSidebarContent() {
  const pathname = usePathname();
  const { logout, currentUser } = useAuth();
  const { dataSourceType } = useDataSource();
  const router = useRouter();
  const { state: sidebarState, isMobile } = useSidebar(); 

  const handleLogout = () => {
    logout();
    router.push('/'); 
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border h-[60px] flex items-center justify-between px-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground overflow-hidden">
          <ShoppingBag className="h-7 w-7 text-sidebar-primary shrink-0" />
          {(sidebarState === 'expanded' || isMobile) && <span className="font-headline text-xl truncate">Local Commerce</span>}
        </Link>
        <SidebarTrigger className="hidden md:flex text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" /> 
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                tooltip={{ children: item.label, side: 'right', className: 'bg-popover text-popover-foreground border-border' }}
                className="justify-start" 
              >
                <Link href={item.href} className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 shrink-0" />
                  {(sidebarState === 'expanded' || isMobile) && <span className="text-sm truncate">{item.label}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "flex items-center gap-2 w-full p-2 h-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                (sidebarState === 'collapsed' && !isMobile) ? "justify-center" : "justify-start"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage 
                  src={currentUser?.name ? `https://placehold.co/40x40.png?text=${currentUser.name.charAt(0)}` : `https://placehold.co/40x40.png`} 
                  alt={currentUser?.name || 'Admin'}
                  data-ai-hint="avatar sidebar"
                />
                <AvatarFallback>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}</AvatarFallback>
              </Avatar>
              {(sidebarState === 'expanded' || isMobile) && (
                <div className="text-left flex-grow overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {currentUser?.name || 'Administrator'} ({dataSourceType === 'local' ? 'Local' : 'Firebase'})
                  </p>
                  <p className="text-xs text-sidebar-foreground/70 truncate">{currentUser?.email}</p>
                </div>
              )}
              {(sidebarState === 'expanded' || isMobile) && <ChevronDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 bg-popover border-border text-popover-foreground">
            <DropdownMenuLabel className="text-foreground">
              {currentUser?.name || 'Admin Account'} ({dataSourceType === 'local' ? 'Local' : 'Firebase'})
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border"/>
            <DropdownMenuItem disabled className="cursor-not-allowed text-muted-foreground focus:text-muted-foreground">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border"/>
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
}
