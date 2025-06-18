'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout, currentUser } = useAuth();
  const router = useRouter();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="hidden border-r bg-sidebar lg:block h-full">
      <div className="flex h-full max-h-screen flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6 shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground">
             {/* Replace with an actual logo if available */}
            <ShoppingBag className="h-6 w-6 text-sidebar-primary" />
            <span className="font-headline text-xl">Local Commerce</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 overflow-y-auto">
          <nav className="grid items-start px-4 py-4 text-sm font-medium">
            {navItems.map((item) =>
              item.subItems ? (
                <div key={item.label}>
                  <button
                    onClick={() => toggleSubmenu(item.label)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-left',
                      (pathname.startsWith(item.href) || item.subItems.some(sub => pathname === sub.href)) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {openSubmenus[item.label] ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
                  </button>
                  {openSubmenus[item.label] && (
                    <div className="ml-7 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                      {item.subItems.map(subItem => (
                         <Link
                            key={subItem.label}
                            href={subItem.href}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                              pathname === subItem.href && 'bg-sidebar-accent text-sidebar-accent-foreground'
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            {subItem.label}
                          </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    pathname === item.href && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </ScrollArea>
        <div className="mt-auto p-4 border-t border-sidebar-border">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center justify-start gap-2 w-full p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser?.name ? `https://placehold.co/40x40.png?text=${currentUser.name.charAt(0)}` : `https://placehold.co/40x40.png`} alt={currentUser?.name || 'Admin'} data-ai-hint="avatar profile"/>
                  <AvatarFallback>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{currentUser?.name || 'Administrator'}</p>
                  <p className="text-xs text-sidebar-foreground/70">{currentUser?.email}</p>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 bg-sidebar border-sidebar-border text-sidebar-foreground">
              <DropdownMenuLabel>{currentUser?.name || 'Admin Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-sidebar-border"/>
              <DropdownMenuItem className="cursor-pointer hover:bg-sidebar-accent focus:bg-sidebar-accent">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-sidebar-border"/>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:bg-sidebar-accent focus:bg-sidebar-accent focus:text-red-300">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
