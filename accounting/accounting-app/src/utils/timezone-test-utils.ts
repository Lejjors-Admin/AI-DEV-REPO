/**
 * Timezone Testing Utilities
 * 
 * Tools for testing timezone functionality across different countries
 * and simulating various timezone scenarios
 */

import { getUserTimezone, getTimezoneInfo, getCurrentDateInUserTimezone } from '@/lib/timezone-utils';

/**
 * Test timezone detection and display results
 */
export function testTimezoneDetection(): void {
  console.log('🌍 === TIMEZONE DETECTION TEST ===');
  
  const timezone = getUserTimezone();
  const info = getTimezoneInfo();
  const currentDate = getCurrentDateInUserTimezone();
  
  console.log('📍 Detected Timezone:', timezone);
  console.log('⏰ Timezone Info:', info);
  console.log('📅 Current Date (User Timezone):', currentDate);
  console.log('🕐 Current Time (Local):', new Date().toLocaleString());
  console.log('🕐 Current Time (UTC):', new Date().toUTCString());
  
  // Test date parsing
  const testDate = '2025-01-15';
  console.log('🧪 Test Date Input:', testDate);
  console.log('📅 Parsed Date:', new Date(testDate + 'T00:00:00').toLocaleString());
  
  console.log('=== END TEST ===\n');
}

/**
 * Simulate different timezones by overriding the Intl API
 * WARNING: This is for testing only - don't use in production!
 */
export function simulateTimezone(timezone: string): void {
  console.log(`🔄 Simulating timezone: ${timezone}`);
  
  // Store original function
  const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  
  // Override the function
  Intl.DateTimeFormat.prototype.resolvedOptions = function() {
    const original = originalResolvedOptions.call(this);
    return {
      ...original,
      timeZone: timezone
    };
  };
  
  // Test the simulation
  testTimezoneDetection();
  
  // Restore original function
  Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
}

/**
 * Test multiple countries/timezones
 */
export function testMultipleCountries(): void {
  const testTimezones = [
    // North America
    { country: 'Canada (Toronto)', timezone: 'America/Toronto' },
    { country: 'Canada (Vancouver)', timezone: 'America/Vancouver' },
    { country: 'USA (New York)', timezone: 'America/New_York' },
    { country: 'USA (Los Angeles)', timezone: 'America/Los_Angeles' },
    
    // Europe
    { country: 'UK (London)', timezone: 'Europe/London' },
    { country: 'Germany (Berlin)', timezone: 'Europe/Berlin' },
    { country: 'France (Paris)', timezone: 'Europe/Paris' },
    
    // Asia
    { country: 'Japan (Tokyo)', timezone: 'Asia/Tokyo' },
    { country: 'India (Mumbai)', timezone: 'Asia/Kolkata' },
    { country: 'China (Shanghai)', timezone: 'Asia/Shanghai' },
    
    // Australia
    { country: 'Australia (Sydney)', timezone: 'Australia/Sydney' },
    { country: 'Australia (Perth)', timezone: 'Australia/Perth' },
    
    // Other
    { country: 'Brazil (São Paulo)', timezone: 'America/Sao_Paulo' },
    { country: 'South Africa (Johannesburg)', timezone: 'Africa/Johannesburg' },
  ];
  
  console.log('🌍 === MULTI-COUNTRY TIMEZONE TEST ===');
  
  testTimezones.forEach(({ country, timezone }) => {
    console.log(`\n📍 Testing: ${country}`);
    simulateTimezone(timezone);
  });
  
  console.log('\n=== END MULTI-COUNTRY TEST ===');
}

/**
 * Test date edge cases across timezones
 */
export function testDateEdgeCases(): void {
  console.log('🧪 === DATE EDGE CASES TEST ===');
  
  const testDates = [
    '2025-01-01', // New Year
    '2025-06-15', // Mid-year
    '2025-12-31', // Year end
    '2024-02-29', // Leap year
  ];
  
  const testTimezones = [
    'America/Toronto',
    'America/Vancouver', 
    'Europe/London',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
  
  testTimezones.forEach(timezone => {
    console.log(`\n🕐 Testing timezone: ${timezone}`);
    
    // Simulate timezone
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      const original = originalResolvedOptions.call(this);
      return { ...original, timeZone: timezone };
    };
    
    testDates.forEach(date => {
      const parsed = new Date(date + 'T00:00:00');
      console.log(`  📅 ${date} → ${parsed.toLocaleString()} (${timezone})`);
    });
    
    // Restore original function
    Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
  });
  
  console.log('\n=== END EDGE CASES TEST ===');
}

/**
 * Test DST (Daylight Saving Time) transitions
 */
export function testDSTTransitions(): void {
  console.log('🕐 === DST TRANSITIONS TEST ===');
  
  // DST transition dates for 2025
  const dstDates = [
    '2025-03-09', // Spring forward (US/Canada)
    '2025-03-30', // Spring forward (Europe)
    '2025-11-02', // Fall back (US/Canada)
    '2025-10-26', // Fall back (Europe)
  ];
  
  const dstTimezones = [
    'America/Toronto', // Eastern Time
    'America/Vancouver', // Pacific Time
    'Europe/London', // GMT/BST
    'Europe/Berlin', // CET/CEST
  ];
  
  dstTimezones.forEach(timezone => {
    console.log(`\n🕐 DST Test for: ${timezone}`);
    
    // Simulate timezone
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      const original = originalResolvedOptions.call(this);
      return { ...original, timeZone: timezone };
    };
    
    dstDates.forEach(date => {
      const parsed = new Date(date + 'T00:00:00');
      const offset = parsed.getTimezoneOffset();
      console.log(`  📅 ${date} → ${parsed.toLocaleString()} (Offset: ${offset}min)`);
    });
    
    // Restore original function
    Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
  });
  
  console.log('\n=== END DST TEST ===');
}

/**
 * Run all timezone tests
 */
export function runAllTimezoneTests(): void {
  console.log('🚀 === COMPREHENSIVE TIMEZONE TESTING ===\n');
  
  testTimezoneDetection();
  testMultipleCountries();
  testDateEdgeCases();
  testDSTTransitions();
  
  console.log('\n✅ === ALL TESTS COMPLETED ===');
}
