
'use client';

import { usePathname, useRouter } from 'next/navigation'; // Use from next/navigation
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingBag, User, LogOut, Menu, ShoppingCart, PackageSearch, Heart, History, LayoutDashboard, MapPin, Globe } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import React, { useEffect, useState } from 'react';
import { localStorageService } from '@/lib/localStorageService';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LoginModal } from '@/components/auth/LoginModal';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link'; // CORRECTED IMPORT


export function CustomerNavbar() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // This includes the locale
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const t = useTranslations('CustomerNavbar');
  const locale = useLocale();

  useEffect(() => {
    const updateCartCount = () => {
      if (currentUser) {
        const cart = localStorageService.getCart(currentUser.id);
        setCartItemCount(cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0);
      } else {
        setCartItemCount(0);
      }
    };

    updateCartCount(); 

    const handleCartUpdate = () => updateCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [currentUser, pathname]); 


  const handleLogout = () => {
    logout();
    router.push('/'); 
  };

  const LanguageSwitcher = () => {
    const currentPathWithoutLocale = pathname.startsWith(`/${locale}/`) ? pathname.substring(locale.length + 1) : pathname;
    const targetPath = currentPathWithoutLocale === `/${locale}` ? '/' : currentPathWithoutLocale; // Handle root path case for /en or /es

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Globe className="h-5 w-5" />
            <span className="sr-only">Change language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={locale} onValueChange={(value) => router.push(`/${value}${targetPath}`)}>
            <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="es">Español</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentUser?.name ? `https://placehold.co/40x40.png?text=${currentUser.name.charAt(0)}` : `https://placehold.co/40x40.png`} alt={currentUser?.name || 'User'} data-ai-hint="avatar profile" />
            <AvatarFallback>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="h-5 w-5"/>}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser?.name || 'Customer'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/profile"><User className="mr-2 h-4 w-4" /> {t('profile')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/profile/addresses"><MapPin className="mr-2 h-4 w-4" /> {t('myAddresses')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/profile/orders"><History className="mr-2 h-4 w-4" /> {t('orderHistory')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/profile/wishlist"><Heart className="mr-2 h-4 w-4" /> {t('wishlist')}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10">
          <LogOut className="mr-2 h-4 w-4" /> {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/products" className="flex items-center gap-2" onClick={() => setIsSheetOpen(false)}>
          <ShoppingBag className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-semibold text-primary">{t('storeName')}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {currentUser && currentUser.role === 'admin' && (
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link href="/admin/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t('adminDashboard')}
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                  {cartItemCount}
                </Badge>
              )}
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
          {currentUser ? (
            <UserMenu />
          ) : (
            <LoginModal />
          )}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t('toggleNavigation')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="mt-8 flex flex-col gap-4">
                {currentUser && currentUser.role === 'admin' && (
                     <Link href="/admin/dashboard" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground", pathname.includes("/admin") ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
                        <LayoutDashboard className="mr-2 h-5 w-5" /> {t('adminDashboard')}
                    </Link>
                )}
                 {currentUser && (
                   <>
                    <DropdownMenuSeparator />
                     <Link href="/profile" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground", pathname.endsWith("/profile") ? "bg-accent text-accent-foreground" : "text-muted-foreground")}><User className="mr-2 h-5 w-5" /> {t('profile')}</Link>
                     <Link href="/profile/addresses" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground", pathname.endsWith("/profile/addresses") ? "bg-accent text-accent-foreground" : "text-muted-foreground")}><MapPin className="mr-2 h-5 w-5" /> {t('myAddresses')}</Link>
                     <Link href="/profile/orders" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground", pathname.endsWith("/profile/orders") ? "bg-accent text-accent-foreground" : "text-muted-foreground")}><History className="mr-2 h-5 w-5" /> {t('orderHistory')}</Link>
                     <Link href="/profile/wishlist" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground", pathname.endsWith("/profile/wishlist") ? "bg-accent text-accent-foreground" : "text-muted-foreground")}><Heart className="mr-2 h-5 w-5" /> {t('wishlist')}</Link>
                   </>
                 )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
