/**
 * Hook for making timezone-aware API requests
 * 
 * Automatically includes timezone information in API requests
 * to ensure consistent date handling between frontend and backend
 */

import { useTimezone } from '@/contexts/TimezoneContext';
import { getTimezoneAwareDateForAPI } from '@/lib/timezone-utils';

export function useTimezoneAwareAPI() {
  const { timezone, timezoneInfo } = useTimezone();

  /**
   * Convert a date to timezone-aware format for API requests
   */
  const prepareDateForAPI = (dateString: string) => {
    return getTimezoneAwareDateForAPI(dateString);
  };

  /**
   * Get headers with timezone information
   */
  const getTimezoneHeaders = () => {
    return {
      'X-User-Timezone': timezone,
      'X-Timezone-Offset': timezoneInfo.offset.toString(),
    };
  };

  /**
   * Enhanced fetch function that includes timezone headers
   */
  const fetchWithTimezone = async (url: string, options: RequestInit = {}) => {
    const timezoneHeaders = getTimezoneHeaders();
    
    const enhancedOptions: RequestInit = {
      ...options,
      headers: {
        ...timezoneHeaders,
        ...options.headers,
      },
    };

    return fetch(url, enhancedOptions);
  };

  /**
   * Prepare form data with timezone information
   */
  const prepareFormDataWithTimezone = (data: any) => {
    const timezoneData = {
      ...data,
      _timezone: {
        timezone,
        offset: timezoneInfo.offset,
        offsetString: timezoneInfo.offsetString,
      },
    };

    return timezoneData;
  };

  return {
    timezone,
    timezoneInfo,
    prepareDateForAPI,
    getTimezoneHeaders,
    fetchWithTimezone,
    prepareFormDataWithTimezone,
  };
}
