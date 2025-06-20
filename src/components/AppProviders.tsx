
'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DataSourceProvider } from '@/contexts/DataSourceContext'; // Import DataSourceProvider

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <DataSourceProvider> {/* Wrap AuthProvider and ThemeProvider */}
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </DataSourceProvider>
  );
};
