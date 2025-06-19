'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { localStorageService } from '@/lib/localStorage';
import type { Theme, User } from '@/types';
import { AuthContext } from './AuthContext'; // Import AuthContext to access user

interface ThemeContextType {
  theme: Theme; // User's choice (light, dark, system) or global choice
  setTheme: (theme: Theme) => void;
  appliedTheme: 'light' | 'dark'; // Actual theme applied after considering system preference
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const [theme, setThemeState] = useState<Theme>('system'); // Default to system, will be overridden
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>('light');

  // Function to determine and apply the correct theme
  const applyThemePreference = useCallback((currentThemeChoice: Theme) => {
    let finalTheme: 'light' | 'dark';
    if (currentThemeChoice === 'system') {
      finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      finalTheme = currentThemeChoice;
    }
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(finalTheme);
    setAppliedTheme(finalTheme);
  }, []);

  // Effect to initialize theme based on user preference or global storage
  useEffect(() => {
    if (authContext && !authContext.isLoading) { // Ensure auth context is loaded
      if (authContext.currentUser && authContext.currentUser.themePreference) {
        setThemeState(authContext.currentUser.themePreference);
        applyThemePreference(authContext.currentUser.themePreference);
      } else {
        const globalTheme = localStorageService.getGlobalTheme();
        setThemeState(globalTheme);
        applyThemePreference(globalTheme);
      }
    } else if (!authContext) { // Fallback if AuthContext is not yet available (e.g., initial SSR or context not wrapped)
        const globalTheme = localStorageService.getGlobalTheme();
        setThemeState(globalTheme);
        applyThemePreference(globalTheme);
    }
  }, [authContext, applyThemePreference]);


  // Effect to listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Re-apply theme only if the current choice is 'system' or derived from it
      if (theme === 'system' || (authContext?.currentUser?.themePreference === 'system' && !authContext?.currentUser)) {
         applyThemePreference('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, authContext, applyThemePreference]);

  // setTheme function that updates user preference if logged in, else global
  const setTheme = (newThemeChoice: Theme) => {
    if (authContext && authContext.currentUser) {
      authContext.updateUserThemePreference(newThemeChoice); // This will trigger user update & context refresh
    } else {
      localStorageService.setGlobalTheme(newThemeChoice); // Update global theme
    }
    setThemeState(newThemeChoice); // Update local state for immediate UI reflection if needed
    applyThemePreference(newThemeChoice); // Apply the new theme choice directly
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, appliedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
