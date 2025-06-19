
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { localStorageService } from '@/lib/localStorage';
import type { Theme } from '@/types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  appliedTheme: 'light' | 'dark'; // Actual theme applied after considering system preference
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => localStorageService.getGlobalTheme());
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>('light');


  const applyThemePreference = useCallback((currentTheme: Theme) => {
    let finalTheme: 'light' | 'dark';
    if (currentTheme === 'system') {
      finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      finalTheme = currentTheme;
    }
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(finalTheme);
    setAppliedTheme(finalTheme);
  }, []);

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme, applyThemePreference]);

  // Listener for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyThemePreference('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyThemePreference]);


  const setTheme = (newTheme: Theme) => {
    localStorageService.setGlobalTheme(newTheme);
    setThemeState(newTheme);
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
