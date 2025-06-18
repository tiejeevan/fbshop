
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // Default to 'all'
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const allProducts = localStorageService.getProducts();
    const allCategories = localStorageService.getCategories();
    
    // Map category names to products
    const productsWithCategoryNames = allProducts.map(p => {
        const category = allCategories.find(c => c.id === p.categoryId);
        return { ...p, categoryName: category?.name || 'Uncategorized' };
    });

    setProducts(productsWithCategoryNames);
    setCategories(allCategories);
    setIsLoading(false);
  }, []);

  const handleAddToCart = (product: Product) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to add items to your cart.", variant: "destructive" });
      return;
    }

    const cart = localStorageService.getCart(currentUser.id) || { userId: currentUser.id, items: [], updatedAt: new Date().toISOString() };
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);

    if (existingItemIndex > -1) {
      if (cart.items[existingItemIndex].quantity < product.stock) {
        cart.items[existingItemIndex].quantity += 1;
      } else {
        toast({ title: "Stock Limit", description: `Cannot add more of ${product.name}. Max stock reached.`, variant: "destructive" });
        return;
      }
    } else {
      if (product.stock > 0) {
        cart.items.push({ productId: product.id, quantity: 1, price: product.price, name: product.name, imageUrl: product.imageUrl });
      } else {
        toast({ title: "Out of Stock", description: `${product.name} is currently out of stock.`, variant: "destructive" });
        return;
      }
    }
    localStorageService.updateCart(cart);
    toast({ title: "Added to Cart", description: `${product.name} has been added to your cart.` });
    // Dispatch a custom event to notify other components (like navbar) about cart update
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const filteredProducts = products
    .filter(product => (selectedCategory && selectedCategory !== 'all') ? product.categoryId === selectedCategory : true)
    .filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return <div className="text-center py-10">Loading products...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <h1 className="font-headline text-5xl text-primary">Our Products</h1>
        <p className="text-lg text-muted-foreground">Discover a wide range of items, all stored locally!</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card rounded-lg shadow">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="text-center text-muted-foreground text-xl py-10">No products found matching your criteria.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden flex flex-col group transform hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <Link href={`/products/${product.id}`} className="block">
                <CardHeader className="p-0 relative">
                  <Image
                    src={product.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(product.name)}`}
                    alt={product.name}
                    width={600}
                    height={400}
                    className="object-cover w-full h-48 transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint="product image"
                  />
                  {product.stock === 0 && <Badge variant="destructive" className="absolute top-2 right-2">Out of Stock</Badge>}
                   {product.categoryName && <Badge className="absolute top-2 left-2 bg-primary/80 text-primary-foreground">{product.categoryName}</Badge>}
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <CardTitle className="font-headline text-xl mb-1 group-hover:text-primary transition-colors">{product.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">{product.description}</CardDescription>
                </CardContent>
              </Link>
              <CardFooter className="p-4 border-t mt-auto">
                <div className="flex items-center justify-between w-full">
                  <p className="text-lg font-semibold text-primary">${product.price.toFixed(2)}</p>
                  <Button 
                    size="sm" 
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    aria-label={`Add ${product.name} to cart`}
                    className="group-hover:bg-accent group-hover:text-accent-foreground"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

