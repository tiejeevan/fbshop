
'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { HelpCircle } from 'lucide-react'; // Fallback icon

// Remove the default export for LucideIcons if it exists to avoid conflicts
const {default: _, ...Icons} = LucideIcons;

// Dynamically generate the list of icons from lucide-react
const allIconNames = Object.keys(Icons).filter(name => name !== 'createLucideIcon' && name !== 'IconNode' && name !== 'LucideIcon');

export type IconName = keyof typeof Icons | null;

interface IconPickerProps {
  selectedIcon?: IconName;
  onIconSelect: (iconName: IconName) => void;
  className?: string;
}

export function IconPicker({ selectedIcon, onIconSelect, className }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return allIconNames;
    }
    return allIconNames.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const SelectedIconComponent = selectedIcon ? Icons[selectedIcon as keyof typeof Icons] as React.ElementType : null;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Select an Icon (Optional)</CardTitle>
        <CardDescription>Search and select an icon for your product.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        {SelectedIconComponent && (
          <div className="mb-4 p-4 border rounded-md flex flex-col items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <SelectedIconComponent className="h-16 w-16 text-primary" />
            <p className="mt-2 text-xs font-mono">{selectedIcon}</p>
          </div>
        )}
        {!SelectedIconComponent && (
            <div className="mb-4 p-4 border rounded-md flex items-center justify-center text-muted-foreground min-h-[100px] bg-muted/50">
               No icon selected
            </div>
        )}
        <ScrollArea className="h-72 w-full border rounded-md">
            {filteredIcons.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">No icons found matching "{searchTerm}".</div>
            )}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 p-2">
            {filteredIcons.map((name) => {
                const IconComponent = Icons[name as keyof typeof Icons] as React.ElementType;
                if (!IconComponent) return null; // Should not happen with the filter
                return (
                <Button
                    key={name}
                    variant="outline"
                    size="icon"
                    className={cn(
                    "flex flex-col items-center justify-center h-20 w-full p-1", // Adjusted for better text visibility
                    selectedIcon === name && "ring-2 ring-primary bg-accent text-accent-foreground"
                    )}
                    onClick={() => onIconSelect(selectedIcon === name ? null : name as IconName)}
                    title={name}
                >
                    <IconComponent className="h-6 w-6 mb-1" />
                    <span className="text-[10px] truncate w-full text-center leading-tight">{name}</span>
                </Button>
                );
            })}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper to render an icon by name (can be used elsewhere)
export const renderLucideIcon = (iconName: IconName, props?: LucideIcons.LucideProps): React.ReactNode | null => {
  if (!iconName) return null;
  const IconComponent = Icons[iconName as keyof typeof Icons] as React.ElementType | undefined;
  if (!IconComponent) return <HelpCircle {...props} />; // Fallback icon
  return <IconComponent {...props} />;
};
