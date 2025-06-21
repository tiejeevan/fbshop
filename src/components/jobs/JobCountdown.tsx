
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { parseISO, differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { Timer } from 'lucide-react';

interface JobCountdownProps {
  expiresAt: string;
  className?: string;
}

export function JobCountdown({ expiresAt, className }: JobCountdownProps) {
  const expiryDate = useMemo(() => parseISO(expiresAt), [expiresAt]);

  const calculateTimeLeft = useCallback(() => {
    const totalSeconds = differenceInSeconds(expiryDate, new Date());

    if (totalSeconds <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
      total: totalSeconds,
      days: Math.floor(totalSeconds / (60 * 60 * 24)),
      hours: Math.floor((totalSeconds / (60 * 60)) % 24),
      minutes: Math.floor((totalSeconds / 60) % 60),
      seconds: Math.floor(totalSeconds % 60),
      isExpired: false
    };
  }, [expiryDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    if (timeLeft.isExpired) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft.isExpired, calculateTimeLeft]);

  const formatTime = () => {
    if (timeLeft.isExpired) {
      return <span className="font-medium text-destructive">Expired</span>;
    }

    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`;
    }
    if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
    }
    if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    }
    return `${timeLeft.seconds}s`;
  };
  
  const colorClass = timeLeft.days < 1 && !timeLeft.isExpired ? (timeLeft.hours < 1 ? 'text-destructive' : 'text-amber-600') : 'text-muted-foreground';


  return (
    <div className={cn("flex items-center gap-1.5 text-xs", colorClass, className)}>
      <Timer className="h-3 w-3" />
      <span>Expires: {formatTime()}</span>
    </div>
  );
}
