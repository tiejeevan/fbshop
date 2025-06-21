'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, CircleDot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import type { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading) {
      return;
    }
    try {
      const fetchedNotifications = await dataService.getNotifications(currentUser.id);
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [currentUser, dataService, isDataSourceLoading]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!currentUser || !dataService) return;
    setIsOpen(false);
    if (!notification.isRead) {
      try {
        await dataService.markNotificationAsRead(currentUser.id, notification.id);
        fetchNotifications();
      } catch (error) {
        console.error("Error marking notification as read", error);
      }
    }
    router.push(notification.link);
  };
  
  const handleMarkAllRead = async () => {
    if (!currentUser || !dataService || unreadCount === 0) return;
     try {
        await dataService.markAllNotificationsAsRead(currentUser.id);
        fetchNotifications();
      } catch (error) {
        console.error("Error marking all notifications as read", error);
      }
  };


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-medium text-sm">Notifications</h4>
           <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0} className="text-xs h-auto p-1">
             <CheckCheck className="mr-1 h-4 w-4"/>Mark all as read
           </Button>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-colors hover:bg-accent flex items-start gap-2",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className="mt-1">
                    {!notification.isRead ? (
                        <CircleDot className="h-3 w-3 text-primary shrink-0" />
                    ) : (
                        <div className="w-3 h-3"></div> 
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm leading-tight">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-10">You have no notifications.</p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
