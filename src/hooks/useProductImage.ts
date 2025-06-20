
'use client';

import { useState, useEffect } from 'react';
import { getImage as getImageFromIndexedDB } from '@/lib/indexedDbService';

interface UseProductImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  isExternalUrl: boolean; // To inform ProductImage component
}

export function useProductImage(imageId: string | null | undefined): UseProductImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isExternalUrl, setIsExternalUrl] = useState<boolean>(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadImage() {
      if (!imageId) {
        setImageUrl(null);
        setIsLoading(false);
        setError(null);
        setIsExternalUrl(false);
        // console.log('useProductImage: No imageId provided.');
        return;
      }

      // Check if imageId is an HTTP/HTTPS URL (Firebase Storage URL)
      if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
        // console.log(`useProductImage: Using external URL: ${imageId}`);
        setImageUrl(imageId);
        setIsExternalUrl(true);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Otherwise, assume it's an IndexedDB key
      // console.log(`useProductImage: Loading image from IndexedDB with ID: ${imageId}`);
      setIsLoading(true);
      setError(null);
      setIsExternalUrl(false);

      try {
        const blob = await getImageFromIndexedDB(imageId);
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
          // console.log(`useProductImage: Successfully loaded image from IndexedDB, Object URL: ${objectUrl}`);
        } else {
          setImageUrl(null);
          // console.warn(`useProductImage: Image not found in IndexedDB for ID: ${imageId}`);
        }
      } catch (e) {
        console.error('useProductImage: Error loading image from IndexedDB:', e);
        setError(e instanceof Error ? e : new Error('Failed to load image'));
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        // console.log('useProductImage: Revoked object URL:', objectUrl);
      }
    };
  }, [imageId]);

  return { imageUrl, isLoading, error, isExternalUrl };
}
