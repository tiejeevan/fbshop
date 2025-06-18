
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as LucideIcons from 'lucide-react';

// A selection of ~30 common Lucide icons
const iconList = [
  { name: 'Home', IconComponent: LucideIcons.Home },
  { name: 'Settings', IconComponent: LucideIcons.Settings },
  { name: 'User', IconComponent: LucideIcons.User },
  { name: 'Users', IconComponent: LucideIcons.Users },
  { name: 'Camera', IconComponent: LucideIcons.Camera },
  { name: 'Mail', IconComponent: LucideIcons.Mail },
  { name: 'Search', IconComponent: LucideIcons.Search },
  { name: 'Trash2', IconComponent: LucideIcons.Trash2 },
  { name: 'Star', IconComponent: LucideIcons.Star },
  { name: 'AlertCircle', IconComponent: LucideIcons.AlertCircle },
  { name: 'CheckCircle', IconComponent: LucideIcons.CheckCircle },
  { name: 'XCircle', IconComponent: LucideIcons.XCircle },
  { name: 'PlusCircle', IconComponent: LucideIcons.PlusCircle },
  { name: 'MinusCircle', IconComponent: LucideIcons.MinusCircle },
  { name: 'Edit3', IconComponent: LucideIcons.Edit3 },
  { name: 'FileText', IconComponent: LucideIcons.FileText },
  { name: 'Folder', IconComponent: LucideIcons.Folder },
  { name: 'Image', IconComponent: LucideIcons.Image },
  { name: 'Link', IconComponent: LucideIcons.Link },
  { name: 'ExternalLink', IconComponent: LucideIcons.ExternalLink },
  { name: 'Calendar', IconComponent: LucideIcons.Calendar },
  { name: 'Clock', IconComponent: LucideIcons.Clock },
  { name: 'MapPin', IconComponent: LucideIcons.MapPin },
  { name: 'ShoppingCart', IconComponent: LucideIcons.ShoppingCart },
  { name: 'DollarSign', IconComponent: LucideIcons.DollarSign },
  { name: 'CreditCard', IconComponent: LucideIcons.CreditCard },
  { name: 'BarChart2', IconComponent: LucideIcons.BarChart2 },
  { name: 'Sliders', IconComponent: LucideIcons.Sliders },
  { name: 'Coffee', IconComponent: LucideIcons.Coffee },
  { name: 'Gift', IconComponent: LucideIcons.Gift },
  { name: 'Award', IconComponent: LucideIcons.Award },
  { name: 'Briefcase', IconComponent: LucideIcons.Briefcase },
  { name: 'Zap', IconComponent: LucideIcons.Zap },
  { name: 'Shield', IconComponent: LucideIcons.Shield },
  { name: 'Package', IconComponent: LucideIcons.Package },
  { name: 'Globe', IconComponent: LucideIcons.Globe },
] as const; // Use 'as const' for better type inference on names

export type IconName = typeof iconList[number]['name'] | null;

interface IconPickerProps {
  selectedIcon?: IconName;
  onIconSelect: (iconName: IconName) => void;
  className?: string;
}

export function IconPicker({ selectedIcon, onIconSelect, className }: IconPickerProps) {
  const SelectedIconComponent = selectedIcon ? iconList.find(i => i.name === selectedIcon)?.IconComponent : null;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Select an Icon (Optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
          {iconList.map(({ name, IconComponent }) => (
            <Button
              key={name}
              variant="outline"
              size="icon"
              className={cn(
                "flex flex-col items-center justify-center h-16 w-16 p-2",
                selectedIcon === name && "ring-2 ring-primary bg-accent text-accent-foreground"
              )}
              onClick={() => onIconSelect(selectedIcon === name ? null : name)}
              title={name}
            >
              <IconComponent className="h-6 w-6 mb-1" />
              <span className="text-xs truncate w-full text-center">{name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to render an icon by name (can be used elsewhere)
export const renderLucideIcon = (iconName: IconName, props?: LucideIcons.LucideProps): React.ReactNode | null => {
  if (!iconName) return null;
  const iconDetail = iconList.find(i => i.name === iconName);
  if (!iconDetail) return <LucideIcons.HelpCircle {...props} />; // Fallback icon
  const Icon = iconDetail.IconComponent as React.ElementType;
  return <Icon {...props} />;
};
