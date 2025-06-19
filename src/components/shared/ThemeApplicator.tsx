
'use client';

import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// This component's sole purpose is to apply the theme class to the <html> tag
// It should be placed high in the component tree, ideally in RootLayout
export function ThemeApplicator() {
  const { theme } = useTheme(); // This will trigger re-evaluation when theme changes

  useEffect(() => {
    // The actual class application logic is handled within ThemeProvider itself
    // This component just ensures that ThemeProvider's effect runs when theme changes
    // by virtue of consuming the context.
  }, [theme]);

  return null; // This component does not render anything
}
