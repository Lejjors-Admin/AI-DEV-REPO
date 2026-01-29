/**
 * Frontend Date Utilities for Timezone-Safe Date Handling
 * 
 * Handles timezone-safe date formatting to avoid date shifts
 * when displaying dates from the backend
 */

/**
 * Format a date string safely without timezone conversion
 * @param dateStr - Date string in YYYY-MM-DD format or ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * @returns Formatted date string in MM/dd/yy format
 */
export function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  
  try {
    let datePart: string;
    
    // If it's already in YYYY-MM-DD format, use it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      datePart = dateStr;
    } 
    // If in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ), extract just the date part
    // This prevents timezone conversion issues
    else if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      datePart = dateStr.split('T')[0];
    }
    // For other formats, try to parse and extract date in UTC
    else {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      // Extract date components in UTC to avoid timezone shifts
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      datePart = `${year}-${month}-${day}`;
    }
    
    // Parse the date part safely without timezone conversion
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date in local timezone using exact date components
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
  } catch (error) {
    console.warn('Failed to format date:', dateStr, error);
    return 'Invalid Date';
  }
}

/**
 * Format a date string for display with full year
 * @param dateStr - Date string in YYYY-MM-DD format or ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * @returns Formatted date string in MM/dd/yyyy format
 */
export function formatDateSafeFullYear(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  
  try {
    let datePart: string;
    
    // If it's already in YYYY-MM-DD format, use it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      datePart = dateStr;
    } 
    // If in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ), extract just the date part
    // This prevents timezone conversion issues
    else if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      datePart = dateStr.split('T')[0];
    }
    // For other formats, try to parse and extract date in UTC
    else {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      // Extract date components in UTC to avoid timezone shifts
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      datePart = `${year}-${month}-${day}`;
    }
    
    // Parse the date part safely without timezone conversion
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date in local timezone using exact date components
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.warn('Failed to format date:', dateStr, error);
    return 'Invalid Date';
  }
}

/**
 * Get the best available date from transaction object
 * Converts ISO date strings to YYYY-MM-DD format to avoid timezone issues
 * @param transaction - Transaction object with potential date fields
 * @returns The best available date string in YYYY-MM-DD format, or null
 */
export function getTransactionDate(transaction: any): string | null {
  const dateStr = transaction.transactionDate || transaction.date || transaction.createdAt || null;
  
  if (!dateStr) return null;
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ), extract just the date part
  // This prevents timezone conversion issues when the date is parsed
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    return dateStr.split('T')[0];
  }
  
  // For other formats, try to parse and extract date in UTC
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    // Extract date components in UTC to avoid timezone shifts
    // This ensures the date stays the same regardless of server/client timezone
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Failed to parse transaction date:', dateStr, error);
    return null;
  }
}

/**
 * Get current date string in YYYY-MM-DD format
 * @returns Current date string
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get future date string in YYYY-MM-DD format
 * @param daysFromNow - Number of days to add to current date
 * @returns Future date string
 */
export function getFutureDateString(daysFromNow: number = 30): string {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  const year = futureDate.getFullYear();
  const month = String(futureDate.getMonth() + 1).padStart(2, '0');
  const day = String(futureDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}