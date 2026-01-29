/**
 * Timezone Utilities for Automatic Timezone Detection and Date Handling
 * 
 * Automatically detects user's timezone and handles dates consistently
 * across the application using the detected timezone
 */

/**
 * Get user's timezone automatically
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Get timezone info for debugging
 */
export function getTimezoneInfo(): {
  timezone: string;
  offset: number;
  offsetHours: number;
  offsetString: string;
} {
  const timezone = getUserTimezone();
  const offset = getTimezoneOffset();
  const offsetHours = Math.abs(offset) / 60;
  const offsetSign = offset <= 0 ? '+' : '-';
  
  return {
    timezone,
    offset,
    offsetHours,
    offsetString: `UTC${offsetSign}${offsetHours}`
  };
}

/**
 * Convert a date to the user's timezone as YYYY-MM-DD string
 */
export function dateToUserTimezoneString(date: Date): string {
  const timezone = getUserTimezone();
  
  try {
    // Use Intl.DateTimeFormat to format date in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Failed to format date in user timezone, falling back to local:', error);
    // Fallback to local date formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Get current date in user's timezone as YYYY-MM-DD string
 */
export function getCurrentDateInUserTimezone(): string {
  return dateToUserTimezoneString(new Date());
}

/**
 * Get a future date in user's timezone as YYYY-MM-DD string
 */
export function getFutureDateInUserTimezone(daysFromNow: number): string {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  return dateToUserTimezoneString(futureDate);
}

/**
 * Parse a date string and return a Date object in user's timezone
 */
export function parseDateInUserTimezone(dateString: string): Date {
  if (!dateString) return new Date();
  
  const timezone = getUserTimezone();
  
  try {
    // If it's in YYYY-MM-DD format, create date in user's timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      
      // Create date in user's timezone
      const dateInTimezone = new Date();
      dateInTimezone.setFullYear(year, month - 1, day);
      dateInTimezone.setHours(12, 0, 0, 0); // Set to noon to avoid DST issues
      
      return dateInTimezone;
    }
    
    // For other formats, parse normally
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date();
    }
    
    return date;
  } catch (error) {
    console.warn('Failed to parse date in user timezone:', error);
    return new Date();
  }
}

/**
 * Convert a date to user's timezone and return as Date object
 */
export function convertToUserTimezone(date: Date): Date {
  const timezone = getUserTimezone();
  
  try {
    // Get the date components in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
    const month = parseInt(parts.find(part => part.type === 'month')?.value || '1') - 1;
    const day = parseInt(parts.find(part => part.type === 'day')?.value || '1');
    const hour = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(part => part.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(part => part.type === 'second')?.value || '0');
    
    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    console.warn('Failed to convert date to user timezone:', error);
    return date;
  }
}

/**
 * Format a date for display in user's timezone
 */
export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDateInUserTimezone(date) : date;
  const timezone = getUserTimezone();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.warn('Failed to format date for display:', error);
    // Fallback to local formatting
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

/**
 * Validate that a date string is in correct format and valid
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  
  const date = parseDateInUserTimezone(dateString);
  return !isNaN(date.getTime());
}

/**
 * Get timezone-aware date for API requests
 * This ensures dates are sent to the backend with timezone information
 */
export function getTimezoneAwareDateForAPI(dateString: string): {
  date: string;
  timezone: string;
  offset: number;
} {
  const timezone = getUserTimezone();
  const offset = getTimezoneOffset();
  
  return {
    date: dateString,
    timezone,
    offset
  };
}

/**
 * Debug function to log timezone information
 */
export function debugTimezoneInfo(): void {
  const info = getTimezoneInfo();
  console.log('🌍 Timezone Information:');
  console.log(`   Timezone: ${info.timezone}`);
  console.log(`   Offset: ${info.offset} minutes (${info.offsetString})`);
  console.log(`   Current date in timezone: ${getCurrentDateInUserTimezone()}`);
}
