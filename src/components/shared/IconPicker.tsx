
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the structure for our CSS icons
interface CssIconDefinition {
  name: string; // Unique identifier/name for the icon
  className: string; // The CSS class that renders the icon
  displayName: string; // User-friendly name for display and search
  tags?: string[]; // Optional tags for searching
}

// Define CSS Icon Styles directly within the component using <style jsx global>
const CssIconStyles = () => (
  <style jsx global>{`
    .css-icon-base {
      display: inline-block;
      width: 24px; /* Base size, can be scaled with font-size or transform */
      height: 24px;
      position: relative;
      box-sizing: border-box;
    }

    /* Home Icon */
    .css-icon-home::before, .css-icon-home::after {
      content: "";
      position: absolute;
      background-color: currentColor; /* Use text color */
    }
    .css-icon-home::before { /* Roof */
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-bottom: 10px solid currentColor;
      top: 0px;
      left: 0px;
    }
    .css-icon-home::after { /* Body */
      width: 18px;
      height: 12px;
      top: 10px;
      left: 3px;
      background-color: currentColor;
    }

    /* Settings Icon (Gear) */
    .css-icon-settings {
      border-radius: 50%;
      border: 3px solid currentColor;
      width: 20px;
      height: 20px;
      margin: 2px; /* Adjust to center within 24x24 */
    }
    .css-icon-settings::before, .css-icon-settings::after,
    .css-icon-settings span::before, .css-icon-settings span::after {
      content: "";
      position: absolute;
      background-color: currentColor;
      width: 4px;
      height: 6px;
      left: 50%;
      transform: translateX(-50%);
    }
    .css-icon-settings::before { top: -5px; }
    .css-icon-settings::after { bottom: -5px; }
    .css-icon-settings span::before { left: -5px; top: 50%; transform: translateY(-50%) rotate(90deg); }
    .css-icon-settings span::after { right: -5px; top: 50%; transform: translateY(-50%) rotate(90deg); left: auto; }
    .css-icon-settings > span { /* Inner circle cutout */
        display: block;
        width: 8px;
        height: 8px;
        background: transparent; 
        border: 4px solid transparent;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 0 100px var(--card-bg-for-icon-cutout, white); /* Use CSS var for background color */
    }


    /* User Icon */
    .css-icon-user::before { /* Head */
      content: "";
      position: absolute;
      width: 10px;
      height: 10px;
      background-color: currentColor;
      border-radius: 50%;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
    }
    .css-icon-user::after { /* Body */
      content: "";
      position: absolute;
      width: 16px;
      height: 10px;
      background-color: currentColor;
      border-radius: 8px 8px 0 0; /* Rounded top */
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);
    }

    /* Camera Icon */
    .css-icon-camera {
      border: 3px solid currentColor;
      border-radius: 4px;
      width: 22px;
      height: 16px;
      margin: 4px 1px;
    }
    .css-icon-camera::before { /* Lens */
      content: "";
      position: absolute;
      width: 8px;
      height: 8px;
      background-color: currentColor;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .css-icon-camera::after { /* Button */
      content: "";
      position: absolute;
      width: 4px;
      height: 2px;
      background-color: currentColor;
      top: -4px; /* Above the main body */
      left: 4px;
    }
    
    /* Search Icon (Magnifying Glass) */
    .css-icon-search::before { /* Circle part */
      content: "";
      position: absolute;
      width: 14px;
      height: 14px;
      border: 3px solid currentColor;
      border-radius: 50%;
      top: 1px;
      left: 1px;
    }
    .css-icon-search::after { /* Handle part */
      content: "";
      position: absolute;
      width: 3px;
      height: 8px;
      background-color: currentColor;
      transform: rotate(45deg);
      bottom: 1px;
      right: 1px;
    }

    /* Star Icon */
    .css-icon-star {
      margin: 2px 0; /* Adjust vertical position */
    }
    .css-icon-star::before {
      content: "★"; /* Using a unicode character as a simple CSS star */
      font-size: 24px; /* Adjust size of the star */
      line-height: 1;
      color: currentColor;
    }

    /* Trash/Delete Icon */
    .css-icon-trash {
      border: 2px solid transparent; /* For spacing */
    }
    .css-icon-trash::before { /* Lid */
      content: "";
      position: absolute;
      width: 12px;
      height: 3px;
      background-color: currentColor;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 1px;
    }
    .css-icon-trash::after { /* Can body */
      content: "";
      position: absolute;
      width: 16px;
      height: 15px;
      background-color: currentColor;
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 0 0 2px 2px;
    }
    .css-icon-trash > span { /* Lid handle */
      position: absolute;
      width: 6px;
      height: 2px;
      background-color: currentColor;
      top: 0px;
      left: 50%;
      transform: translateX(-50%);
    }
     .css-icon-trash i::before, .css-icon-trash i::after, .css-icon-trash i em::before { /* Lines on can */
        content: "";
        position: absolute;
        width: 2px;
        height: 8px;
        background-color: var(--card-bg-for-icon-cutout, white); /* Use card background for "cutout" effect */
        bottom: 3px;
    }
    .css-icon-trash i::before { left: 5px; }
    .css-icon-trash i::after { right: 5px; }
    .css-icon-trash i em::before {left: 50%; transform: translateX(-50%);}


    /* Plus Icon */
    .css-icon-plus::before, .css-icon-plus::after {
      content: "";
      position: absolute;
      background-color: currentColor;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .css-icon-plus::before { /* Vertical bar */
      width: 3px;
      height: 16px;
    }
    .css-icon-plus::after { /* Horizontal bar */
      width: 16px;
      height: 3px;
    }

    /* Minus Icon */
    .css-icon-minus::before {
      content: "";
      position: absolute;
      background-color: currentColor;
      width: 16px;
      height: 3px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    /* Checkmark Icon */
    .css-icon-check {
      transform: rotate(0deg); /* Container for rotation point */
    }
    .css-icon-check::before {
      content: "";
      position: absolute;
      width: 14px;
      height: 3px;
      background-color: currentColor;
      transform: rotate(45deg);
      top: 12px;
      left: 6px;
    }
    .css-icon-check::after {
      content: "";
      position: absolute;
      width: 7px;
      height: 3px;
      background-color: currentColor;
      transform: rotate(-45deg);
      top: 10px;
      left: 2px;
    }

    /* X (Close) Icon */
    .css-icon-close::before, .css-icon-close::after {
      content: "";
      position: absolute;
      width: 20px;
      height: 3px;
      background-color: currentColor;
      top: 50%;
      left: 50%;
      transform-origin: center;
    }
    .css-icon-close::before { transform: translate(-50%, -50%) rotate(45deg); }
    .css-icon-close::after { transform: translate(-50%, -50%) rotate(-45deg); }
    
    /* Folder Icon */
    .css-icon-folder {
      background-color: currentColor;
      width: 20px;
      height: 16px;
      border-radius: 2px;
      position: relative;
      margin: 4px 2px;
    }
    .css-icon-folder::before { /* Tab part */
      content: "";
      position: absolute;
      background-color: currentColor;
      width: 8px;
      height: 4px;
      border-radius: 2px 2px 0 0;
      top: -4px;
      left: 1px;
    }

    /* File Icon */
    .css-icon-file {
      background-color: currentColor;
      width: 16px;
      height: 20px;
      border-radius: 2px;
      position: relative;
      margin: 2px 4px;
    }
    .css-icon-file::before { /* Folded corner */
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      border-width: 0 5px 5px 0; /* Triangle size */
      border-style: solid;
      border-color: transparent var(--card-bg-for-icon-cutout, white) transparent transparent; /* Use card background for "cutout" */
    }

    /* Heart Icon */
    .css-icon-heart::before, .css-icon-heart::after {
        content: "";
        position: absolute;
        width: 10px;
        height: 16px; 
        background: currentColor;
        border-radius: 50px 50px 0 0; 
        left: 6px; 
        top: 2px;
    }
    .css-icon-heart::before {
        transform: rotate(-45deg);
        left: 3px; 
    }
    .css-icon-heart::after {
        transform: rotate(45deg);
        left: 11px; 
    }

    /* Shopping Cart Icon */
    .css-icon-cart {
      border: 2px solid currentColor;
      width: 20px;
      height: 16px;
      margin: 6px 2px 2px 2px;
      border-radius: 2px;
      position: relative;
    }
    .css-icon-cart::before { /* Handle */
      content: "";
      position: absolute;
      width: 10px;
      height: 2px;
      background-color: currentColor;
      top: -4px;
      left: -2px;
      transform: rotate(-20deg);
    }
    .css-icon-cart::after { /* Wheels */
      content: "";
      position: absolute;
      width: 4px;
      height: 4px;
      background-color: currentColor;
      border-radius: 50%;
      bottom: -5px;
      left: 2px;
      box-shadow: 10px 0 currentColor; /* Second wheel */
    }
    
    /* Bell Icon */
    .css-icon-bell {
        width: 16px;
        height: 16px;
        background-color: currentColor;
        border-radius: 50% 50% 0 0; /* Dome shape */
        position: relative;
        margin: 4px;
    }
    .css-icon-bell::after { /* Clapper */
        content: "";
        position: absolute;
        width: 4px;
        height: 4px;
        background-color: currentColor;
        border-radius: 50%;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
    }
    .css-icon-bell::before { /* Lip of the bell */
        content: "";
        position: absolute;
        width: 20px; /* Wider than the bell body */
        height: 3px;
        background-color: currentColor;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        border-radius: 1px;
    }
    
    /* Edit/Pencil Icon */
    .css-icon-edit {
        width: 5px;
        height: 15px;
        background-color: currentColor;
        transform: rotate(-45deg);
        margin: 5px 10px;
        border-radius: 2px 2px 0 0;
    }
    .css-icon-edit::before { /* Tip */
        content: "";
        position: absolute;
        bottom: -3px;
        left: -1.5px; /* Adjust to center tip */
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 4px solid currentColor;
    }

    /* Play Icon */
    .css-icon-play::before {
      content: "";
      position: absolute;
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-bottom: 10px solid transparent;
      border-left: 16px solid currentColor;
      top: 2px;
      left: 6px;
    }

    /* Pause Icon */
    .css-icon-pause::before, .css-icon-pause::after {
      content: "";
      position: absolute;
      width: 6px;
      height: 16px;
      background-color: currentColor;
      top: 4px;
    }
    .css-icon-pause::before { left: 4px; }
    .css-icon-pause::after { right: 4px; }

    /* Arrow Left Icon */
    .css-icon-arrow-left::before {
      content: "";
      position: absolute;
      width: 12px;
      height: 12px;
      border-left: 3px solid currentColor;
      border-bottom: 3px solid currentColor;
      transform: rotate(45deg);
      top: 5px;
      left: 7px;
    }

    /* Arrow Right Icon */
    .css-icon-arrow-right::before {
      content: "";
      position: absolute;
      width: 12px;
      height: 12px;
      border-right: 3px solid currentColor;
      border-top: 3px solid currentColor;
      transform: rotate(45deg);
      top: 5px;
      left: 3px;
    }

    /* Globe Icon */
    .css-icon-globe {
      width: 20px;
      height: 20px;
      border: 2px solid currentColor;
      border-radius: 50%;
      margin: 2px;
      position: relative;
      overflow: hidden; /* Clip lines */
    }
    .css-icon-globe::before, .css-icon-globe::after { /* Equator and a meridian */
      content: "";
      position: absolute;
      background-color: currentColor;
    }
    .css-icon-globe::before { /* Equator */
      width: 100%;
      height: 2px;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
    }
    .css-icon-globe::after { /* Meridian */
      width: 2px;
      height: 100%;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
    }

    /* Image Icon */
    .css-icon-image {
      width: 20px;
      height: 16px;
      border: 2px solid currentColor;
      border-radius: 2px;
      margin: 4px 2px;
      position: relative;
    }
    .css-icon-image::before { /* Sun/moon */
      content: "";
      position: absolute;
      width: 5px;
      height: 5px;
      background-color: currentColor;
      border-radius: 50%;
      top: 2px;
      left: 2px;
    }
    .css-icon-image::after { /* Mountain */
      content: "";
      position: absolute;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 8px solid currentColor;
      bottom: 0;
      right: 1px;
    }

    /* Link Icon */
    .css-icon-link, .css-icon-link::before {
        display: inline-block;
        height: 6px;
        width: 10px;
        background-color: transparent;
        border: 2px solid currentColor;
        border-radius: 3px;
        transform: rotate(-45deg);
    }
    .css-icon-link {
        margin: 8px 7px;
    }
    .css-icon-link::before {
        content: '';
        position: absolute;
        left: -6px;
        top: -2px; 
    }
    .css-icon-link::after { /* Middle bar */
        content: "";
        position: absolute;
        width: 8px;
        height: 2px;
        background-color: currentColor;
        top: 1.5px; 
        left: 0.5px; 
        transform: rotate(90deg); 
        transform-origin: 2px 1px; 
    }

    /* Calendar Icon */
    .css-icon-calendar {
        width: 18px;
        height: 18px;
        border: 2px solid currentColor;
        border-radius: 2px;
        margin: 3px;
        position: relative;
    }
    .css-icon-calendar::before { /* Rings for binder */
        content: "";
        position: absolute;
        width: 2px;
        height: 4px;
        background-color: currentColor;
        top: -3px;
        left: 3px;
        box-shadow: 8px 0 currentColor;
    }
    .css-icon-calendar::after { /* First line of "days" */
        content: "";
        position: absolute;
        width: 12px;
        height: 2px;
        background-color: currentColor;
        top: 4px;
        left: 2px;
         box-shadow: 0 5px 0 currentColor; /* Second line */
    }
  `}</style>
);

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
  const [cardBgColorForCutout, setCardBgColorForCutout] = useState('white'); // Default

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const rootStyle = getComputedStyle(document.documentElement);
        let cardColor = rootStyle.getPropertyValue('--card').trim();
        if (!cardColor || cardColor === "0 0% 100%") { 
            cardColor = rootStyle.getPropertyValue('--background').trim();
        }
        
        if (cardColor) {
            if (cardColor.split(' ').length === 3 && !cardColor.includes('(')) {
                 setCardBgColorForCutout(`hsl(${cardColor})`);
            } else {
                 setCardBgColorForCutout(cardColor);
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
      <CssIconStyles />
      <Card 
        className={cn("w-full", className)} 
        style={{'--card-bg-for-icon-cutout': cardBgColorForCutout} as React.CSSProperties}
      >
        <CardHeader>
          <CardTitle className="text-lg">Select an Icon (Optional)</CardTitle>
          <CardDescription>
            Search and select a CSS-based icon. ({ALL_CSS_ICONS.length} icons available)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder={`Search ${ALL_CSS_ICONS.length} icons...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          <div 
            className="mb-4 p-4 border rounded-md flex flex-col items-center justify-center bg-muted min-h-[100px]"
            style={{'--card-bg-for-icon-cutout': cardBgColorForCutout} as React.CSSProperties} // Ensure variable is available here too
          >
            {selectedIconClassName ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                {/* This div is the one that provides the scaled size and color */}
                <div style={{ width: '48px', height: '48px', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* This span is the actual icon, scaled */}
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
        </CardContent>
      </Card>
    </>
  );
}

