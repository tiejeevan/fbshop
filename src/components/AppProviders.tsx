'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
// import { CartProvider } from '@/contexts/CartContext'; // Example if you add a CartContext

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      {/* <CartProvider> */}
        {children}
      {/* </CartProvider> */}
    </AuthProvider>
  );
};
