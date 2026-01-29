/**
 * Timezone Context for Application-Wide Timezone Management
 * 
 * Provides timezone information throughout the application
 * and ensures consistent timezone handling
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserTimezone, getTimezoneInfo } from '@/lib/timezone-utils';

interface TimezoneContextType {
  timezone: string;
  timezoneInfo: {
    timezone: string;
    offset: number;
    offsetHours: number;
    offsetString: string;
  };
  isDetected: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [timezoneInfo, setTimezoneInfo] = useState({
    timezone: 'UTC',
    offset: 0,
    offsetHours: 0,
    offsetString: 'UTC+0'
  });
  const [isDetected, setIsDetected] = useState(false);

  useEffect(() => {
    try {
      const detectedTimezone = getUserTimezone();
      const info = getTimezoneInfo();
      
      setTimezone(detectedTimezone);
      setTimezoneInfo(info);
      setIsDetected(true);
      
      console.log('🌍 Timezone detected:', {
        timezone: detectedTimezone,
        offset: info.offsetString,
        info
      });
    } catch (error) {
      console.error('Failed to detect timezone:', error);
      setIsDetected(false);
    }
  }, []);

  return (
    <TimezoneContext.Provider value={{ timezone, timezoneInfo, isDetected }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
