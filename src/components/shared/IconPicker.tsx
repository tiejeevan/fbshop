
'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIconsModule from 'lucide-react';
import { HelpCircle } from 'lucide-react'; // Fallback icon

// Filter to get only actual icon component names from the LucideIconsModule
const allValidIconNames = Object.keys(LucideIconsModule)
  .filter(name => {
    const anExport = LucideIconsModule[name as keyof typeof LucideIconsModule];
    // Primary condition: It must be a function (React components are functions)
    if (typeof anExport !== 'function') {
      return false;
    }
    // Exclude known non-icon exports and internal helpers
    if (['default', 'createLucideIcon', 'IconNode', 'LucideIcon', 'createElement', 'icons', 'toPascalCase', 'लुसिडे'].includes(name)) {
      return false;
    }
    // Heuristic: Component names usually start with an uppercase letter.
    if (name[0] !== name[0].toUpperCase()) {
      return false;
    }
    // Further check: Lucide icons are often ForwardRef components.
    // Simple functional components are also possible. This check tries to be broad yet safe.
    // The main check is that it's a function and passes the name-based filters.
    return true;
  })
  .sort(); // Sort alphabetically for consistent order

export type IconName = typeof allValidIconNames[number] | null;

interface IconPickerProps {
  selectedIcon?: IconName;
  onIconSelect: (iconName: IconName) => void;
  className?: string;
}

export function IconPicker({ selectedIcon, onIconSelect, className }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    if (!searchTerm.trim()) {
      return allValidIconNames;
    }
    return allValidIconNames.filter(name =>
      name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );
  }, [searchTerm]);

  const SelectedIconComponent = useMemo(() => {
    if (selectedIcon && allValidIconNames.includes(selectedIcon)) {
      return LucideIconsModule[selectedIcon as keyof typeof LucideIconsModule] as React.ElementType;
    }
    return null;
  }, [selectedIcon]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Select an Icon (Optional)</CardTitle>
        <CardDescription>Search and select an icon for your product or category.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder={`Search ${allValidIconNames.length} icons...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        {SelectedIconComponent ? (
          <div className="mb-4 p-4 border rounded-md flex flex-col items-center justify-center bg-muted min-h-[120px]">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <SelectedIconComponent className="h-16 w-16 text-primary" />
            <p className="mt-2 text-xs font-mono">{selectedIcon}</p>
          </div>
        ) : (
            <div className="mb-4 p-4 border rounded-md flex items-center justify-center text-muted-foreground min-h-[120px] bg-muted/50">
               No icon selected
            </div>
        )}
        <ScrollArea className="h-72 w-full border rounded-md">
            {filteredIcons.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">No icons found matching "{searchTerm}".</div>
            )}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 p-2">
            {filteredIcons.map((name) => {
                const IconComponent = LucideIconsModule[name as keyof typeof LucideIconsModule] as React.ElementType | undefined;
                
                if (!IconComponent) { 
                    // This case should ideally not be hit if allValidIconNames is filtered correctly.
                    // console.warn(`IconPicker: Icon component for ${name} not found during map.`);
                    return null; 
                }

                return (
                <Button
                    key={name}
                    variant="outline"
                    size="icon" // Keeps padding consistent for icon buttons
                    className={cn(
                    "flex flex-col items-center justify-center h-20 w-full p-1 text-xs", // Text size for the name
                    selectedIcon === name && "ring-2 ring-primary bg-accent text-accent-foreground"
                    )}
                    onClick={() => onIconSelect(selectedIcon === name ? null : name as IconName)}
                    title={name}
                >
                    <IconComponent className="h-5 w-5 mb-1" /> {/* Icon visual */}
                    <span className="truncate w-full text-center leading-tight">{name}</span> {/* Icon name */}
                </Button>
                );
            })}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper to render an icon by name (can be used elsewhere in the app if needed)
export const renderLucideIcon = (iconName: IconName, props?: LucideIconsModule.LucideProps): React.ReactNode | null => {
  if (!iconName || !allValidIconNames.includes(iconName)) {
    return <HelpCircle {...props} />; 
  }
  
  const IconComponent = LucideIconsModule[iconName as keyof typeof LucideIconsModule] as React.ElementType | undefined;
  
  if (!IconComponent) { 
    // This case indicates a mismatch between allValidIconNames and actual exports
    // console.warn(`renderLucideIcon: Icon component for ${iconName} not found.`);
    return <HelpCircle {...props} />; 
  }
  return <IconComponent {...props} />;
};

