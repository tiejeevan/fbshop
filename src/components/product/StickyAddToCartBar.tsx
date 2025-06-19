
'use client';

import React from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { ProductImage } from './ProductImage'; // Using existing ProductImage
import { cn } from '@/lib/utils';

interface StickyAddToCartBarProps {
  product: Product | null;
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  onAddToCart: () => void;
  isVisible: boolean;
}

export function StickyAddToCartBar({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  isVisible,
}: StickyAddToCartBarProps) {
  if (!product || !isVisible) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > product.stock) val = product.stock;
    onQuantityChange(val);
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-lg p-3 md:p-4 transform transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-3 md:gap-6">
        <div className="flex items-center gap-3 overflow-hidden">
          <ProductImage
            imageId={product.primaryImageId}
            alt={product.name}
            className="w-12 h-12 md:w-16 md:h-16 rounded-md border shrink-0"
            imageClassName="object-cover"
            width={64}
            height={64}
            placeholderIconSize="w-6 h-6"
            data-ai-hint="sticky bar product"
          />
          <div className="overflow-hidden">
            <p className="text-sm md:text-base font-semibold text-foreground truncate" title={product.name}>
              {product.name}
            </p>
            <p className="text-sm md:text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {product.stock > 0 ? (
            <>
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-9 md:w-9"
                  onClick={() => onQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={handleInputChange}
                  min="1"
                  max={product.stock}
                  className="w-10 h-8 md:w-12 md:h-9 text-center border-0 focus-visible:ring-0 text-sm md:text-base"
                  aria-label="Quantity"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-9 md:w-9"
                  onClick={() => onQuantityChange(quantity + 1)}
                  disabled={quantity >= product.stock}
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                md-size="default" // For potentially larger button on md+
                onClick={onAddToCart}
                className="shrink-0"
              >
                <ShoppingCart className="mr-1.5 h-4 w-4 md:mr-2 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Add to Cart</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </>
          ) : (
            <span className="text-sm font-medium text-destructive px-3 py-2 bg-destructive/10 rounded-md">
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
