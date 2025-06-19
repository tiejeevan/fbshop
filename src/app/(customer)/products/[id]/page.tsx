
'use client';

import React, { useEffect, useState, use, useCallback, ChangeEvent, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category, Review as ReviewType } from '@/types';
import { ArrowLeft, ShoppingCart, Minus, Plus, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, ImageOff, Edit3, Trash2, Save, Ban, UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WishlistButton } from '@/components/customer/WishlistButton';
import { ReviewList } from '@/components/product/ReviewList';
import { ReviewForm } from '@/components/product/ReviewForm';
import { StarRatingDisplay } from '@/components/product/StarRatingDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/product/ProductImage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label'; // Added import for Label
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService';
import { LoginModal } from '@/components/auth/LoginModal';


const MAX_TOTAL_IMAGES = 10;
const MAX_FILE_SIZE_MB = 0.5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface EditableImageData {
  id: string | null;
  file: File | null;
  previewUrl: string | null;
  toBeDeleted?: boolean;
}

export default function ProductDetailPage({ params: paramsPromise }: { params: Promise<{ id:string }> }) {
  const params = use(paramsPromise);
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editableProductData, setEditableProductData] = useState<Partial<Product>>({});
  const [editablePrimaryImage, setEditablePrimaryImage] = useState<EditableImageData | null>(null);
  const [editableAdditionalImages, setEditableAdditionalImages] = useState<EditableImageData[]>([]);
  const [reviewsToDelete, setReviewsToDelete] = useState<string[]>([]);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [allProductImageIdsState, setAllProductImageIdsState] = useState<string[]>([]);
  const [isZoomed, setIsZoomed] = useState(false);

  const fetchProductData = useCallback((productId: string) => {
    setIsLoading(true);
    const fetchedProduct = localStorageService.findProductById(productId);
    if (fetchedProduct) {
      setProduct(fetchedProduct);
      const imageIds = [
        fetchedProduct.primaryImageId,
        ...(fetchedProduct.additionalImageIds || [])
      ].filter((id): id is string => !!id);
      setAllProductImageIdsState(imageIds);

      if (fetchedProduct.categoryId) {
        const fetchedCategory = localStorageService.findCategoryById(fetchedProduct.categoryId);
        setCategory(fetchedCategory || null);
      }
      if(currentUser) {
        localStorageService.addRecentlyViewed(currentUser.id, fetchedProduct.id);
      }
      const productReviews = localStorageService.getReviewsForProduct(productId);
      setReviews(productReviews);
      const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
      setAverageRating(productReviews.length > 0 ? totalRating / productReviews.length : 0);
      
      setEditableProductData({ name: fetchedProduct.name, description: fetchedProduct.description, price: fetchedProduct.price, stock: fetchedProduct.stock, categoryId: fetchedProduct.categoryId });
      setEditablePrimaryImage({ id: fetchedProduct.primaryImageId || null, file: null, previewUrl: null, toBeDeleted: false });
      setEditableAdditionalImages(
        (fetchedProduct.additionalImageIds || []).map(id => ({ id, file: null, previewUrl: null, toBeDeleted: false }))
      );
      setReviewsToDelete([]);
    } else {
      toast({ title: "Product Not Found", variant: "destructive" });
      router.push('/products');
    }
    setIsLoading(false);
  }, [currentUser, router, toast]);

  useEffect(() => {
    fetchProductData(params.id);
  }, [params.id, fetchProductData]);

  const currentDisplayableImageIds = useMemo(() => {
    if (isEditing) {
        let ids: (string | null | undefined)[] = [];
        if (editablePrimaryImage && !editablePrimaryImage.toBeDeleted) {
            ids.push(editablePrimaryImage.file ? editablePrimaryImage.previewUrl : editablePrimaryImage.id);
        }
        editableAdditionalImages.forEach(img => {
            if (!img.toBeDeleted) {
                ids.push(img.file ? img.previewUrl : img.id);
            }
        });
        return ids.filter(Boolean) as string[];
    }
    return allProductImageIdsState;
  }, [isEditing, editablePrimaryImage, editableAdditionalImages, allProductImageIdsState]);

  const openImageViewer = useCallback((index: number) => {
    if (currentDisplayableImageIds.length > 0) {
      setSelectedImageIndex(index);
      setIsViewerOpen(true);
      setIsZoomed(false);
    }
  }, [currentDisplayableImageIds]);

  const closeImageViewer = useCallback(() => setIsViewerOpen(false), []);

  const nextImage = useCallback(() => {
    if (!currentDisplayableImageIds.length) return;
    setSelectedImageIndex((prevIndex) => (prevIndex + 1) % currentDisplayableImageIds.length);
    setIsZoomed(false);
  }, [currentDisplayableImageIds]);

  const prevImage = useCallback(() => {
    if (!currentDisplayableImageIds.length) return;
    setSelectedImageIndex((prevIndex) => (prevIndex - 1 + currentDisplayableImageIds.length) % currentDisplayableImageIds.length);
    setIsZoomed(false);
  }, [currentDisplayableImageIds]);

  const toggleZoom = useCallback(() => setIsZoomed(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isViewerOpen) return;
      if (event.key === 'Escape') closeImageViewer();
      if (event.key === 'ArrowRight') nextImage();
      if (event.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen, closeImageViewer, nextImage, prevImage]);


  const handleQuantityChange = (amount: number) => {
    if (!product) return;
    setQuantity(prev => {
      const newQuantity = prev + amount;
      if (newQuantity < 1) return 1;
      if (newQuantity > product.stock) return product.stock;
      return newQuantity;
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to add items to your cart.", variant: "destructive" });
      return;
    }
    const cart = localStorageService.getCart(currentUser.id) || { userId: currentUser.id, items: [], updatedAt: new Date().toISOString() };
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity <= product.stock) {
        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        toast({ title: "Stock Limit", description: `Max stock: ${product.stock}. You have ${cart.items[existingItemIndex].quantity} in cart.`, variant: "destructive" });
        return;
      }
    } else {
       if (quantity <= product.stock) {
        cart.items.push({
            productId: product.id,
            quantity,
            price: product.price,
            name: product.name,
            primaryImageId: product.primaryImageId
        });
      } else {
        toast({ title: "Stock Limit", description: `Max stock: ${product.stock}.`, variant: "destructive" });
        return;
      }
    }
    localStorageService.updateCart(cart);
    toast({ title: "Added to Cart", description: `${quantity} x ${product.name}` });
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const onReviewSubmitted = () => {
    if (product) fetchProductData(product.id);
  };

  const handleEnterEditMode = () => {
    if (!product) return;
    setEditableProductData({ name: product.name, description: product.description, price: product.price, stock: product.stock, categoryId: product.categoryId });
    setEditablePrimaryImage({ id: product.primaryImageId || null, file: null, previewUrl: null, toBeDeleted: false });
    setEditableAdditionalImages(
      (product.additionalImageIds || []).map(id => ({ id, file: null, previewUrl: null, toBeDeleted: false }))
    );
    setReviewsToDelete([]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (product) fetchProductData(product.id);
  };

  const handleSaveEdits = async () => {
    if (!product || !editableProductData) return;
    setIsLoading(true);
    
    let finalPrimaryImageId = editablePrimaryImage?.id || null;
    let finalAdditionalImageIds: string[] = [];

    if (editablePrimaryImage?.file) { 
      if (finalPrimaryImageId && editablePrimaryImage.id === finalPrimaryImageId) { 
          await deleteImageFromDB(finalPrimaryImageId);
      }
      finalPrimaryImageId = await saveImageToDB(product.id, 'primary', editablePrimaryImage.file);
    } else if (editablePrimaryImage?.toBeDeleted && finalPrimaryImageId) {
      await deleteImageFromDB(finalPrimaryImageId);
      finalPrimaryImageId = null;
    }

    const imagesToKeepOrAddNew: string[] = [];
    for (const imgData of editableAdditionalImages) {
      if (imgData.file) { 
        if (imgData.id && !imgData.toBeDeleted) { 
          await deleteImageFromDB(imgData.id);
        }
        const newId = await saveImageToDB(product.id, Date.now() + Math.random().toString(36).substring(2,7), imgData.file);
        imagesToKeepOrAddNew.push(newId);
      } else if (imgData.id && !imgData.toBeDeleted) { 
        imagesToKeepOrAddNew.push(imgData.id);
      } else if (imgData.id && imgData.toBeDeleted) { 
        await deleteImageFromDB(imgData.id);
      }
    }
    finalAdditionalImageIds = imagesToKeepOrAddNew;

    const updatedProductData: Product = {
      ...product,
      name: editableProductData.name || product.name,
      description: editableProductData.description || product.description,
      price: editableProductData.price !== undefined ? editableProductData.price : product.price,
      stock: editableProductData.stock !== undefined ? editableProductData.stock : product.stock,
      categoryId: editableProductData.categoryId || product.categoryId,
      primaryImageId: finalPrimaryImageId,
      additionalImageIds: finalAdditionalImageIds,
      updatedAt: new Date().toISOString(),
    };
    localStorageService.updateProduct(updatedProductData);

    for (const reviewId of reviewsToDelete) {
        localStorageService.deleteReview(reviewId);
    }

    toast({ title: "Product Updated Successfully" });
    setIsEditing(false);
    fetchProductData(product.id); 
  };

  const handleEditableFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableProductData(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? parseFloat(value) : value }));
  };
  
  const handlePrimaryImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editablePrimaryImage) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Primary image size should not exceed ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        e.target.value = ''; return;
      }
      if (editablePrimaryImage.previewUrl && editablePrimaryImage.previewUrl.startsWith('blob:')) URL.revokeObjectURL(editablePrimaryImage.previewUrl);
      setEditablePrimaryImage({ ...editablePrimaryImage, file: file, previewUrl: URL.createObjectURL(file), toBeDeleted: false });
    }
    e.target.value = '';
  };

  const removeEditablePrimaryImage = () => {
    if (editablePrimaryImage) {
      if (editablePrimaryImage.previewUrl && editablePrimaryImage.previewUrl.startsWith('blob:')) URL.revokeObjectURL(editablePrimaryImage.previewUrl);
      setEditablePrimaryImage({ ...editablePrimaryImage, file: null, previewUrl: null, toBeDeleted: !!editablePrimaryImage.id });
    }
  };

  const handleAdditionalImageChange = async (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
       if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Additional image size should not exceed ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        e.target.value = ''; return;
      }
      setEditableAdditionalImages(prev => {
        const newImages = [...prev];
        if (newImages[index].previewUrl && newImages[index].previewUrl!.startsWith('blob:')) URL.revokeObjectURL(newImages[index].previewUrl!);
        newImages[index] = { ...newImages[index], file: file, previewUrl: URL.createObjectURL(file), toBeDeleted: false };
        return newImages;
      });
    }
    e.target.value = '';
  };
  
  const addEditableAdditionalImageSlot = () => {
    const currentImageCount = (editablePrimaryImage?.id || editablePrimaryImage?.file ? 1 : 0) + editableAdditionalImages.filter(img => (img.id || img.file) && !img.toBeDeleted).length;
    if (currentImageCount < MAX_TOTAL_IMAGES) {
        setEditableAdditionalImages(prev => [...prev, { id: null, file: null, previewUrl: null, toBeDeleted: false }]);
    } else {
        toast({title: "Image Limit Reached", description: `Max ${MAX_TOTAL_IMAGES} total images (primary + additional).`});
    }
  };

  const removeEditableAdditionalImage = (index: number) => {
    setEditableAdditionalImages(prev => {
      const newImages = [...prev];
      const imgToRemove = newImages[index];
      if (imgToRemove.previewUrl && imgToRemove.previewUrl.startsWith('blob:')) URL.revokeObjectURL(imgToRemove.previewUrl);
      
      if (imgToRemove.id) { 
        newImages[index] = { ...imgToRemove, file: null, previewUrl: null, toBeDeleted: true };
      } else { 
        return newImages.filter((_, i) => i !== index);
      }
      return newImages;
    });
  };
  
  const setAdditionalAsPrimary = (index: number) => {
    if (!editableAdditionalImages[index] || (!editableAdditionalImages[index].id && !editableAdditionalImages[index].file)) {
        toast({ title: "Invalid Action", description: "Cannot set an empty slot as primary.", variant: "destructive" });
        return;
    }
    const newPrimaryCandidate = { ...editableAdditionalImages[index] };
    if (newPrimaryCandidate.toBeDeleted) {
      toast({ title: "Cannot Set Deleted Image", description: "This image is marked for deletion.", variant: "destructive" });
      return;
    }

    const oldPrimaryCandidate = editablePrimaryImage ? { ...editablePrimaryImage } : { id: null, file: null, previewUrl: null, toBeDeleted: false };

    setEditablePrimaryImage({ ...newPrimaryCandidate, toBeDeleted: false });
    
    setEditableAdditionalImages(prev => {
        let newAdditionals = [...prev];
        newAdditionals.splice(index, 1); 
        if(oldPrimaryCandidate.id || oldPrimaryCandidate.file) {
            newAdditionals.push({ ...oldPrimaryCandidate, toBeDeleted: false });
        }
        return newAdditionals.filter(img => img.id || img.file || img.previewUrl);
    });
    toast({title: "Primary Image Swapped", description: "Changes will be applied on save."});
  };

  const handleDeleteReview = (reviewId: string) => {
    setReviewsToDelete(prev => [...prev, reviewId]);
    setReviews(prev => prev.filter(r => r.id !== reviewId)); 
    toast({ title: "Review Marked for Deletion", description: "Changes will apply on save." });
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    await localStorageService.deleteProduct(product.id);
    toast({ title: "Product Deleted" });
    router.push('/admin/products'); 
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
         <Skeleton className="h-10 w-24 mb-8" />
         <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
                </div>
            </div>
            <div className="space-y-6">
                <Skeleton className="h-6 w-1/4 rounded-md" />
                <Skeleton className="h-12 w-3/4 rounded-md" />
                <Skeleton className="h-6 w-1/3 rounded-md" />
                <Skeleton className="h-8 w-1/4 rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-6 w-1/5 rounded-md" />
                <div className="flex items-center gap-4 pt-4">
                    <Skeleton className="h-10 w-28 rounded-md" />
                    <Skeleton className="h-12 w-40 rounded-md" />
                </div>
            </div>
         </div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 text-destructive">Product not found.</div>;
  }


  return (
    <div className="container mx-auto py-8 px-4">
       <div className="flex justify-between items-center mb-8">
        <Button variant="outline" onClick={() => router.back()} className="group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back
        </Button>
        {currentUser?.role === 'admin' && !isEditing && (
          <Button onClick={handleEnterEditMode} variant="secondary">
            <Edit3 className="mr-2 h-4 w-4" /> Enter Edit Mode
          </Button>
        )}
        {currentUser?.role === 'admin' && isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSaveEdits} variant="default" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
            </Button>
            <Button onClick={handleCancelEdit} variant="outline" disabled={isLoading}>
              <Ban className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </div>
        )}
      </div>

      {isEditing && (
         <div className="mb-6 p-4 border border-yellow-500 bg-yellow-500/10 rounded-md">
            <h2 className="text-lg font-semibold text-yellow-700 mb-2 flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Admin Edit Mode</h2>
            <p className="text-sm text-yellow-600">You are currently editing this product. Max {MAX_FILE_SIZE_MB}MB per image. Changes will be applied upon saving.</p>
         </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="space-y-3">
          {isEditing ? (
            <>
             <div className="space-y-2 border p-3 rounded-md bg-muted/20">
                <Label className="font-semibold text-foreground">Primary Image</Label>
                <Input type="file" accept="image/*" onChange={handlePrimaryImageChange} id="primaryImageFile" className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                {editablePrimaryImage?.previewUrl && !editablePrimaryImage.toBeDeleted && (
                  <div className="relative w-32 h-32 mt-2 group">
                    <Image src={editablePrimaryImage.previewUrl} alt="Primary preview" layout="fill" objectFit="cover" className="rounded-md border" data-ai-hint="admin product preview" unoptimized/>
                    <Button variant="destructive" size="icon" onClick={removeEditablePrimaryImage} className="absolute -top-2 -right-2 h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3"/></Button>
                  </div>
                )}
                {!editablePrimaryImage?.previewUrl && editablePrimaryImage?.id && !editablePrimaryImage?.toBeDeleted && ( 
                     <ProductImage imageId={editablePrimaryImage.id} alt="Current primary" className="w-32 h-32 rounded-md border group relative" data-ai-hint="admin product current primary">
                         <Button variant="destructive" size="icon" onClick={removeEditablePrimaryImage} className="absolute -top-2 -right-2 h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3"/></Button>
                     </ProductImage>
                )}
                 {editablePrimaryImage?.toBeDeleted && editablePrimaryImage?.id && <p className="text-xs text-destructive p-2 bg-destructive/10 rounded">Primary image will be removed on save.</p>}
              </div>
              <div className="space-y-3 border p-3 rounded-md bg-muted/20">
                 <Label className="font-semibold text-foreground">Additional Images (Max {MAX_TOTAL_IMAGES -1} additional)</Label>
                {editableAdditionalImages.map((imgData, index) => {
                  if (imgData.toBeDeleted && imgData.id) {
                    return (
                       <div key={imgData.id || `del-marker-${index}`} className="border-t pt-3 mt-3 text-xs text-destructive p-2 bg-destructive/10 rounded flex items-center gap-2">
                         <ImageOff className="h-5 w-5 inline-block"/>
                         Image <ProductImage imageId={imgData.id} alt="to delete" className="w-10 h-10 inline-block rounded border" data-ai-hint="image delete" /> will be removed on save.
                       </div>
                    );
                  }
                  return (
                  <div key={imgData.id || `edit-add-${index}`} className="border-t pt-3 mt-3 first:mt-0 first:border-t-0">
                    <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*" onChange={(e) => handleAdditionalImageChange(e, index)} className="flex-grow text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                        <Button variant="outline" size="sm" onClick={() => setAdditionalAsPrimary(index)} disabled={(!imgData.id && !imgData.file) || imgData.toBeDeleted}>Set Primary</Button>
                        <Button variant="ghost" size="icon" onClick={() => removeEditableAdditionalImage(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                    {imgData.previewUrl && !imgData.toBeDeleted && (
                      <div className="relative w-24 h-24 mt-2 group">
                        <Image src={imgData.previewUrl} alt={`Additional preview ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md border" data-ai-hint="admin product additional preview" unoptimized/>
                      </div>
                    )}
                     {!imgData.previewUrl && imgData.id && !imgData.toBeDeleted && ( 
                        <ProductImage imageId={imgData.id} alt={`Current additional ${index+1}`} className="w-24 h-24 mt-2 rounded-md border group relative" data-ai-hint="admin product current additional"/>
                    )}
                  </div>
                  );
                })}
                 {( (editablePrimaryImage?.id || editablePrimaryImage?.file ? (!editablePrimaryImage?.toBeDeleted ? 1:0) :0) + editableAdditionalImages.filter(img => (img.id || img.file) && !img.toBeDeleted).length) < MAX_TOTAL_IMAGES && (
                    <Button type="button" variant="outline" size="sm" onClick={addEditableAdditionalImageSlot} className="mt-3"><UploadCloud className="mr-2 h-4 w-4"/>Add Image Slot</Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div
                className="bg-card p-1 rounded-lg shadow-lg aspect-[4/3] relative overflow-hidden cursor-pointer group"
                onClick={() => currentDisplayableImageIds.length > 0 && openImageViewer(0)}
              >
                <ProductImage
                    imageId={product.primaryImageId}
                    alt={product.name}
                    fill
                    className="w-full h-full"
                    imageClassName="object-contain rounded-md transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    priority
                    placeholderIconSize="w-24 h-24"
                    data-ai-hint="product detail"
                />
                 {currentDisplayableImageIds.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center">
                      <Maximize className="h-3 w-3 mr-1" /> Click to view gallery
                  </div>
                 )}
                {currentUser && <WishlistButton productId={product.id} userId={currentUser.id} className="absolute top-2 right-2 bg-card/80 hover:bg-card p-1" />}
              </div>

              {currentDisplayableImageIds.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {currentDisplayableImageIds.map((imgIdOrUrl, index) => (
                    <div
                      key={imgIdOrUrl || `thumb-${index}`}
                      className={cn(
                        "aspect-square bg-card rounded-md overflow-hidden cursor-pointer border-2 hover:border-primary transition-all",
                        selectedImageIndex === index && isViewerOpen ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
                      )}
                      onClick={() => openImageViewer(index)}
                    >
                      <ProductImage 
                        imageId={imgIdOrUrl} 
                        alt={`${product.name} - image ${index + 1}`}
                        fill
                        className="w-full h-full"
                        imageClassName="object-cover"
                        sizes="100px"
                        placeholderIconSize="w-8 h-8"
                        data-ai-hint="product thumbnail"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          {category && !isEditing && (
             <Link href={`/products?category=${category.id}`} passHref>
                <Badge variant="secondary" className="text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">{category.name}</Badge>
             </Link>
          )}
          {isEditing ? (
            <Input name="name" value={editableProductData?.name || ''} onChange={handleEditableFieldChange} className="font-headline text-4xl lg:text-5xl text-primary h-auto p-2" />
          ) : (
            <h1 className="font-headline text-4xl lg:text-5xl text-primary">{product.name}</h1>
          )}
           {(reviews.length > 0 || product.averageRating) && !isEditing && (
            <div className="flex items-center gap-2">
              <StarRatingDisplay rating={product.averageRating || averageRating} />
              <span className="text-muted-foreground text-sm">({product.reviewCount || reviews.length} review{ (product.reviewCount || reviews.length) === 1 ? '' : 's'})</span>
            </div>
          )}
          
          {isEditing ? (
            <Input name="price" type="number" step="0.01" value={editableProductData?.price || 0} onChange={handleEditableFieldChange} className="text-2xl font-semibold text-foreground h-auto p-2" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">${product.price.toFixed(2)}</p>
          )}

          <div className="prose prose-lg max-w-none text-muted-foreground dark:prose-invert">
            <h2 className="font-headline text-xl text-foreground mb-2">Description</h2>
            {isEditing ? (
              <Textarea name="description" value={editableProductData?.description || ''} onChange={handleEditableFieldChange} rows={6} />
            ) : (
              <p>{product.description}</p>
            )}
          </div>
          
          {isEditing ? (
             <div className="space-y-1">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input id="stock" name="stock" type="number" min="0" value={editableProductData?.stock || 0} onChange={handleEditableFieldChange} className="h-auto p-2"/>
             </div>
          ) : product.stock > 0 ? (
            <Badge className="text-sm">In Stock: {product.stock} units</Badge>
          ) : (
            <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
          )}

          {product.stock > 0 && !isEditing && (
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}><Minus className="h-4 w-4" /></Button>
                <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(1)} disabled={quantity >= product.stock}><Plus className="h-4 w-4" /></Button>
              </div>
              <Button size="lg" onClick={handleAddToCart} className="flex-grow sm:flex-grow-0">
                <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground pt-4 border-t">
            <p>Product ID: {product.id.substring(0,8)}...</p>
            <p>Views: {product.views || 0}</p>
            <p>Purchases: {product.purchases || 0}</p>
          </div>

          {isEditing && currentUser?.role === 'admin' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full mt-4"><Trash2 className="mr-2 h-4 w-4" /> Delete This Product</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete Product?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete "{product.name}". This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete Product</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isViewerOpen && currentDisplayableImageIds.length > 0 && (
        <div
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
            onClick={closeImageViewer}
        >
          <div
            className="bg-card rounded-lg shadow-2xl relative max-w-4xl max-h-[95vh] w-full flex flex-col p-2 sm:p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" onClick={closeImageViewer} className="absolute top-2 right-2 z-[70] bg-card/50 hover:bg-card/80 h-8 w-8 sm:h-10 sm:w-10 rounded-full">
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <div className={cn("flex-grow flex items-center justify-center overflow-hidden relative aspect-video sm:aspect-[4/3] md:aspect-video", isZoomed ? "cursor-zoom-out" : "cursor-zoom-in")} onClick={toggleZoom}>
                <ProductImage
                    imageId={currentDisplayableImageIds[selectedImageIndex]}
                    alt={`${product?.name || 'Product'} - Image ${selectedImageIndex + 1}`}
                    fill
                    className="w-full h-full" 
                    imageClassName={cn("object-contain transition-transform duration-300 ease-in-out", isZoomed ? "scale-125 sm:scale-150 md:scale-175" : "scale-100")} 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 1000px"
                    priority={selectedImageIndex === 0}
                    placeholderIconSize="w-32 h-32"
                    data-ai-hint="product detail large"
                />
            </div>
            <div className="flex items-center justify-between p-1 sm:p-2 mt-1 sm:mt-2 relative z-[65]">
                <Button variant="outline" size="icon" onClick={prevImage} disabled={currentDisplayableImageIds.length <= 1}><ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" /></Button>
                <div className="flex flex-col items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">{selectedImageIndex + 1} / {currentDisplayableImageIds.length}</span>
                     <Button variant="ghost" size="sm" onClick={toggleZoom} className="mt-1 text-muted-foreground hover:text-foreground">
                      {isZoomed ? <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5 mr-1" /> : <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />}
                      {isZoomed ? "Zoom Out" : "Zoom In"}
                    </Button>
                </div>
                <Button variant="outline" size="icon" onClick={nextImage} disabled={currentDisplayableImageIds.length <= 1}><ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" /></Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 space-y-8">
        <h2 className="font-headline text-3xl text-primary border-b pb-2">Customer Reviews</h2>
        {currentUser && currentUser.role === 'customer' && !isEditing && ( 
          <ReviewForm productId={product.id} userId={currentUser.id} userName={currentUser.name || 'Anonymous'} onReviewSubmitted={onReviewSubmitted} />
        )}
        {!currentUser && !isEditing && (
          <p className="text-muted-foreground">Please <LoginModalTrigger /> to leave a review.</p>
        )}
        {(reviews.length > 0 || (product.reviewCount && product.reviewCount > 0)) ? (
          <ReviewList
            reviews={reviews} 
            adminView={isEditing && currentUser?.role === 'admin'}
            onDeleteReview={handleDeleteReview}
          />
        ) : (
          <p className="text-muted-foreground">No reviews yet for this product.</p>
        )}
      </div>
    </div>
  );
}

const LoginModalTrigger = () => {
    return <LoginModal />; 
};


