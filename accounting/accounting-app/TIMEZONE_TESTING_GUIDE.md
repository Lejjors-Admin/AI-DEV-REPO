# 🌍 Timezone Testing Guide

## Quick Testing Methods

### 1. Browser Console Testing

Open your browser's developer console (F12) and run these commands:

```javascript
// Test current timezone detection
import('@/utils/timezone-test-utils').then(utils => {
  utils.testTimezoneDetection();
});

// Test multiple countries
import('@/utils/timezone-test-utils').then(utils => {
  utils.testMultipleCountries();
});

// Run all tests
import('@/utils/timezone-test-utils').then(utils => {
  utils.runAllTimezoneTests();
});

// Simulate specific timezone
import('@/utils/timezone-test-utils').then(utils => {
  utils.simulateTimezone('America/Toronto');
});
```

### 2. Browser DevTools Timezone Override

#### Chrome/Edge:
1. Open DevTools (F12)
2. Go to **Console** tab
3. Click **Settings** (⚙️) → **Experiments**
4. Enable **"Timezone override"**
5. Or use **Sensors** tab → **Location** → **Override timezone**

#### Firefox:
1. Open DevTools (F12)
2. Go to **Settings** (⚙️)
3. Check **"Enable timezone override"**
4. Use **Responsive Design Mode** → **Settings** → **Timezone**

### 3. Manual Timezone Simulation

```javascript
// Override timezone detection (for testing only)
const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
Intl.DateTimeFormat.prototype.resolvedOptions = function() {
  const original = originalResolvedOptions.call(this);
  return {
    ...original,
    timeZone: 'America/Toronto' // Change this to test different timezones
  };
};

// Test the override
console.log('Detected timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Restore original function
Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
```

## Test Scenarios

### 1. Basic Timezone Detection
- ✅ Current timezone is detected correctly
- ✅ Timezone offset is calculated properly
- ✅ Date formatting works in local timezone

### 2. Multiple Countries
Test these timezones:
- 🇨🇦 **Canada**: `America/Toronto`, `America/Vancouver`
- 🇺🇸 **USA**: `America/New_York`, `America/Los_Angeles`
- 🇬🇧 **UK**: `Europe/London`
- 🇩🇪 **Germany**: `Europe/Berlin`
- 🇯🇵 **Japan**: `Asia/Tokyo`
- 🇦🇺 **Australia**: `Australia/Sydney`
- 🇮🇳 **India**: `Asia/Kolkata`
- 🇧🇷 **Brazil**: `America/Sao_Paulo`

### 3. Date Edge Cases
- ✅ New Year dates (2025-01-01)
- ✅ Leap year dates (2024-02-29)
- ✅ Year-end dates (2025-12-31)
- ✅ DST transition dates

### 4. DST (Daylight Saving Time) Testing
- ✅ Spring forward transitions
- ✅ Fall back transitions
- ✅ Different DST rules per country

## Expected Results

### For Canadian Users:
```javascript
// Toronto (EST/EDT)
{
  timezone: "America/Toronto",
  offset: -300, // or -240 during DST
  offsetString: "UTC-5" // or "UTC-4" during DST
}

// Vancouver (PST/PDT)
{
  timezone: "America/Vancouver", 
  offset: -480, // or -420 during DST
  offsetString: "UTC-8" // or "UTC-7" during DST
}
```

### For International Users:
```javascript
// London (GMT/BST)
{
  timezone: "Europe/London",
  offset: 0, // or -60 during DST
  offsetString: "UTC+0" // or "UTC+1" during DST
}

// Tokyo (JST)
{
  timezone: "Asia/Tokyo",
  offset: -540,
  offsetString: "UTC+9"
}
```

## Testing Checklist

- [ ] Timezone detection works automatically
- [ ] Date inputs show correct local dates
- [ ] Date saving preserves selected dates
- [ ] API requests include timezone headers
- [ ] Backend processes timezone-aware dates
- [ ] DST transitions work correctly
- [ ] Edge cases (leap year, year boundaries) work
- [ ] Fallback to UTC works if detection fails

## Common Issues & Solutions

### Issue: Dates shifting by one day
**Solution**: Check if timezone offset is being applied correctly

### Issue: DST dates showing wrong time
**Solution**: Verify DST transition dates are handled properly

### Issue: Timezone not detected
**Solution**: Check browser compatibility and fallback to UTC

### Issue: API requests missing timezone info
**Solution**: Verify `useTimezoneAwareAPI` hook is being used

## Browser Compatibility

| Browser | Timezone Detection | DST Support | Testing Tools |
|---------|-------------------|-------------|---------------|
| Chrome 24+ | ✅ | ✅ | DevTools Override |
| Firefox 29+ | ✅ | ✅ | Responsive Mode |
| Safari 10+ | ✅ | ✅ | Limited Override |
| Edge 12+ | ✅ | ✅ | DevTools Override |

## Automated Testing

For CI/CD pipelines, you can test with:

```bash
# Test with different timezone environment variables
TZ=America/Toronto npm test
TZ=Europe/London npm test
TZ=Asia/Tokyo npm test
```
