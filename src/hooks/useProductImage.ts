
'use client';

import { useState, useEffect } from 'react';
import { getImage } from '@/lib/indexedDbService';

interface UseProductImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useProductImage(imageId: string | null | undefined): UseProductImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadImage() {
      if (!imageId) {
        setImageUrl(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const blob = await getImage(imageId);
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        } else {
          setImageUrl(null);
          // console.warn(`Image not found in IndexedDB for ID: ${imageId}`);
        }
      } catch (e) {
        console.error('Error loading image from IndexedDB:', e);
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
        // console.log('Revoked object URL:', objectUrl);
      }
    };
  }, [imageId]);

  return { imageUrl, isLoading, error };
}
