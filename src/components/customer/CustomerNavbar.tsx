'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingBag, User, LogIn, LogOut, Home, Menu, ShoppingCart, PackageSearch } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { localStorageService } from '@/lib/localStorage'; // Direct import for cart count
import type { Cart } from '@/types';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: PackageSearch },
  // Add more links like About, Contact if needed
];

export function CustomerNavbar() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      if (currentUser) {
        const cart = localStorageService.getCart(currentUser.id);
        setCartItemCount(cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0);
      } else {
        setCartItemCount(0);
      }
    };

    updateCartCount(); // Initial count

    // Listen for custom event or poll if necessary for real-time updates across tabs (complex for pure LS)
    // For simplicity, we re-fetch on navigation or specific actions. Here, we can use an interval or rely on page re-renders.
    // A more robust solution would involve a global state or context for the cart that updates on changes.
    const intervalId = setInterval(updateCartCount, 2000); // Poll every 2 seconds
    
    // Event listener for cart updates
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);


    return () => {
      clearInterval(intervalId);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [currentUser, pathname]); // Re-check on user change or navigation


  const handleLogout = () => {
    logout();
    router.push('/login');
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
          <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/profile/orders"><ShoppingBag className="mr-2 h-4 w-4" /> Orders</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsSheetOpen(false)}>
          <ShoppingBag className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-semibold text-primary">Local Commerce</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "transition-colors hover:text-primary",
                pathname === link.href ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
            <Button asChild>
              <Link href="/login"><LogIn className="mr-2 h-4 w-4"/> Login</Link>
            </Button>
          )}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="mt-8 flex flex-col gap-4">
                {navLinks.map(link => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === link.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
