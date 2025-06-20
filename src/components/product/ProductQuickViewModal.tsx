
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductImage } from './ProductImage';
import type { Product } from '@/types';
import { ShoppingCart, Minus, Plus, X, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
// Removed: import { localStorageService } from '@/lib/localStorage'; - Not used directly
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { useDataSource } from '@/contexts/DataSourceContext';


interface ProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  // onAddToCart is now expected to be async as it will use dataService
  onAddToCart: (product: Product, quantity: number) => Promise<void>; 
}

export function ProductQuickViewModal({ product, isOpen, onClose, onAddToCart }: ProductQuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource(); // For potential direct operations or checks
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(1); 
    }
  }, [product, isOpen]);

  if (!product) return null;

  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => {
      const newQuantity = prev + amount;
      if (newQuantity < 1) return 1;
      if (newQuantity > product.stock) return product.stock;
      return newQuantity;
    });
  };

  const handleDirectAddToCart = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to add items to your cart.", variant: "destructive" });
      onClose(); 
      return;
    }
    if (!dataService) {
        toast({ title: "Error", description: "Data service not available.", variant: "destructive" });
        return;
    }
    if (quantity > product.stock) {
      toast({ title: "Stock Limit", description: `Only ${product.stock} units available.`, variant: "destructive" });
      return;
    }
    setIsAddingToCart(true);
    try {
        await onAddToCart(product, quantity); // onAddToCart is now async
    } catch (error) {
        console.error("Error in ProductQuickViewModal onAddToCart:", error);
        // Toast is likely handled by the parent onAddToCart implementation
    } finally {
        setIsAddingToCart(false);
        onClose(); // Close modal after attempt
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative h-64 md:h-auto bg-muted flex items-center justify-center">
            <ProductImage
              imageId={product.primaryImageId}
              alt={product.name}
              fill
              className="w-full h-full"
              imageClassName="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              placeholderIconSize="w-24 h-24"
              data-ai-hint="quick view product"
            />
             <DialogClose className="absolute top-3 right-3 z-10 bg-background/50 hover:bg-background/80 rounded-full p-1">
                <X className="h-5 w-5 text-muted-foreground" />
             </DialogClose>
          </div>

          {/* Details Section */}
          <div className="flex flex-col">
            <ScrollArea className="max-h-[calc(100vh-150px)] md:max-h-none">
              <div className="p-6 space-y-4">
                <DialogHeader className="mb-2">
                  <DialogTitle className="font-headline text-3xl text-primary">{product.name}</DialogTitle>
                </DialogHeader>
                
                <p className="text-2xl font-semibold text-foreground">${product.price.toFixed(2)}</p>

                <DialogDescription className="text-sm text-muted-foreground line-clamp-4">
                  {product.description}
                </DialogDescription>

                {product.stock > 0 ? (
                  <p className="text-sm text-green-600">In Stock: {product.stock} units</p>
                ) : (
                  <p className="text-sm text-destructive">Out of Stock</p>
                )}

                {product.stock > 0 && (
                  <div className="flex items-center gap-4 pt-2">
                    <Label htmlFor="quick-view-quantity" className="sr-only">Quantity</Label>
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="quick-view-quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), product.stock))}
                        min="1"
                        max={product.stock}
                        className="w-16 h-10 text-center border-0 focus-visible:ring-0"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(1)} disabled={quantity >= product.stock}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <DialogFooter className="p-6 pt-0 mt-auto border-t sticky bottom-0 bg-background md:bg-transparent">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button variant="outline" asChild className="flex-1">
                  <Link href={`/products/${product.id}`} onClick={onClose}>
                    View Full Details <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  onClick={handleDirectAddToCart} 
                  disabled={product.stock === 0 || quantity > product.stock || isAddingToCart || isDataSourceLoading}
                  className="flex-1"
                >
                  {isAddingToCart ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />} 
                  Add to Cart
                </Button>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
