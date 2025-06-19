
'use client';

// This component is currently not used as products now use uploaded images.
// Keeping the file in case CSS icons are needed elsewhere or as a future fallback.
// If it's confirmed to be entirely unused, it can be deleted.

import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CssIconDefinition {
  name: string; 
  className: string; 
  displayName: string; 
  tags?: string[]; 
}

const ALL_CSS_ICONS: CssIconDefinition[] = [
  { name: 'home', className: 'css-icon-home', displayName: 'Home', tags: ['house', 'main'] },
  { name: 'settings', className: 'css-icon-settings', displayName: 'Settings', tags: ['gear', 'options', 'configure'] },
  { name: 'user', className: 'css-icon-user', displayName: 'User', tags: ['person', 'profile', 'account'] },
  { name: 'camera', className: 'css-icon-camera', displayName: 'Camera', tags: ['photo', 'image', 'picture'] },
  { name: 'search', className: 'css-icon-search', displayName: 'Search', tags: ['find', 'magnify'] },
  { name: 'star', className: 'css-icon-star', displayName: 'Star', tags: ['favorite', 'rating', 'bookmark'] },
  { name: 'trash', className: 'css-icon-trash', displayName: 'Trash', tags: ['delete', 'remove', 'bin'] },
  { name: 'plus', className: 'css-icon-plus', displayName: 'Plus', tags: ['add', 'new', 'create'] },
  { name: 'minus', className: 'css-icon-minus', displayName: 'Minus', tags: ['remove', 'decrease', 'subtract'] },
  { name: 'check', className: 'css-icon-check', displayName: 'Check', tags: ['checkmark', 'select', 'confirm', 'done'] },
  { name: 'close', className: 'css-icon-close', displayName: 'Close', tags: ['x', 'cancel', 'exit', 'remove'] },
  { name: 'folder', className: 'css-icon-folder', displayName: 'Folder', tags: ['directory', 'files'] },
  { name: 'file', className: 'css-icon-file', displayName: 'File', tags: ['document', 'page'] },
  { name: 'heart', className: 'css-icon-heart', displayName: 'Heart', tags: ['love', 'like', 'favorite'] },
  { name: 'cart', className: 'css-icon-cart', displayName: 'Cart', tags: ['shopping', 'bag', 'basket', 'purchase'] },
  { name: 'bell', className: 'css-icon-bell', displayName: 'Bell', tags: ['notification', 'alert', 'alarm'] },
  { name: 'edit', className: 'css-icon-edit', displayName: 'Edit', tags: ['pencil', 'write', 'modify', 'change'] },
  { name: 'play', className: 'css-icon-play', displayName: 'Play', tags: ['start', 'run', 'video', 'music'] },
  { name: 'pause', className: 'css-icon-pause', displayName: 'Pause', tags: ['stop', 'hold', 'video', 'music'] },
  { name: 'arrow-left', className: 'css-icon-arrow-left', displayName: 'Arrow Left', tags: ['back', 'previous'] },
  { name: 'arrow-right', className: 'css-icon-arrow-right', displayName: 'Arrow Right', tags: ['forward', 'next'] },
  { name: 'globe', className: 'css-icon-globe', displayName: 'Globe', tags: ['world', 'web', 'internet', 'map'] },
  { name: 'image', className: 'css-icon-image', displayName: 'Image', tags: ['picture', 'photo', 'gallery'] },
  { name: 'link', className: 'css-icon-link', displayName: 'Link', tags: ['url', 'connect', 'chain'] },
  { name: 'calendar', className: 'css-icon-calendar', displayName: 'Calendar', tags: ['date', 'schedule', 'event'] },
].sort((a, b) => a.displayName.localeCompare(b.displayName));


export type CssIconClassName = typeof ALL_CSS_ICONS[number]['className'] | null;

interface IconPickerProps {
  selectedIconClassName?: CssIconClassName;
  onIconSelect: (iconClassName: CssIconClassName) => void;
  className?: string;
}

export function IconPicker({ selectedIconClassName, onIconSelect, className }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cardBgColorForCutout, setCardBgColorForCutout] = useState('hsl(var(--card))'); 

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const rootStyle = getComputedStyle(document.documentElement);
        let cardColor = rootStyle.getPropertyValue('--card').trim(); 
        
        if (cardColor) {
            if (cardColor.split(' ').length === 3 && !cardColor.includes('(')) {
                 setCardBgColorForCutout(`hsl(${cardColor})`);
            } else {
                 setCardBgColorForCutout(cardColor); 
            }
        } else {
            let bgColor = rootStyle.getPropertyValue('--background').trim();
            if (bgColor) {
                if (bgColor.split(' ').length === 3 && !bgColor.includes('(')) {
                    setCardBgColorForCutout(`hsl(${bgColor})`);
                } else {
                    setCardBgColorForCutout(bgColor);
                }
            } else {
                setCardBgColorForCutout('white'); 
            }
        }
    }
  }, []);


  const filteredIcons = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return ALL_CSS_ICONS;
    }
    return ALL_CSS_ICONS.filter(icon =>
      icon.displayName.toLowerCase().includes(term) ||
      icon.name.toLowerCase().includes(term) ||
      (icon.tags && icon.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }, [searchTerm]);

  return (
    <>
      <Card
        className={cn("w-full", className)}
        style={{
          '--icon-cutout-bg': cardBgColorForCutout, 
        } as React.CSSProperties}
      >
        <CardHeader>
          <CardTitle className="text-lg">Select an Icon (Optional - Deprecated for Products)</CardTitle>
          <CardDescription>
            This component is no longer used for product images. Product images are now uploaded directly.
          </CardDescription>
        </CardHeader>
        {/* Content hidden as it's deprecated for products */}
        {/* <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder={`Search ${ALL_CSS_ICONS.length} icons...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          <div
            className="mb-4 p-4 border rounded-md flex flex-col items-center justify-center bg-muted min-h-[100px]"
            style={{
              '--icon-cutout-bg': 'hsl(var(--muted))', 
            } as React.CSSProperties}
          >
            {selectedIconClassName ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <div style={{ width: '48px', height: '48px', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className={cn(selectedIconClassName, 'css-icon-base')} style={{ transform: 'scale(2)'}} >
                    {selectedIconClassName === 'css-icon-settings' && <span></span>}
                    {selectedIconClassName === 'css-icon-trash' && <i><em></em></i>}
                  </span>
                </div>
                <p className="mt-2 text-xs font-mono">{selectedIconClassName}</p>
              </>
            ) : (
              <div className="text-muted-foreground">No icon selected</div>
            )}
          </div>
          <ScrollArea className="h-72 w-full border rounded-md">
            {searchTerm.trim() !== '' && filteredIcons.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">No icons found matching "{searchTerm}".</div>
            )}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 p-2">
              {filteredIcons.map((icon) => (
                <Button
                  key={icon.name}
                  type="button"
                  variant="outline"
                  className={cn(
                    "flex flex-col items-center justify-center h-24 w-full p-1 text-xs",
                    selectedIconClassName === icon.className && "ring-2 ring-primary bg-accent text-accent-foreground"
                  )}
                  onClick={() => onIconSelect(selectedIconClassName === icon.className ? null : icon.className as CssIconClassName)}
                  title={icon.displayName}
                >
                  <div className="css-icon-base" style={{ color: 'currentColor', marginBottom: '4px' }}>
                     <span className={cn(icon.className, 'css-icon-base')}>
                        {icon.className === 'css-icon-settings' && <span></span>}
                        {icon.className === 'css-icon-trash' && <i><em></em></i>}
                     </span>
                  </div>
                  <span className="truncate w-full text-center leading-tight">{icon.displayName}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent> */}
      </Card>
    </>
  );
}
