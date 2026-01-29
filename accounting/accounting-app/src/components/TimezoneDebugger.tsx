/**
 * Timezone Debugger Component
 * 
 * Displays current timezone information for debugging
 * and testing timezone detection functionality
 */

import React, { useState } from 'react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { debugTimezoneInfo } from '@/lib/timezone-utils';
import { testTimezoneDetection, testMultipleCountries, runAllTimezoneTests } from '@/utils/timezone-test-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Clock, MapPin, TestTube, Play } from 'lucide-react';

export function TimezoneDebugger() {
  const { timezone, timezoneInfo, isDetected } = useTimezone();
  const [selectedTestTimezone, setSelectedTestTimezone] = useState<string>('');

  const handleDebugLog = () => {
    debugTimezoneInfo();
  };

  const handleTestCurrent = () => {
    testTimezoneDetection();
  };

  const handleTestMultiple = () => {
    testMultipleCountries();
  };

  const handleRunAllTests = () => {
    runAllTimezoneTests();
  };

  const handleSimulateTimezone = () => {
    if (selectedTestTimezone) {
      // Import and use the simulation function
      import('@/utils/timezone-test-utils').then(({ simulateTimezone }) => {
        simulateTimezone(selectedTestTimezone);
      });
    }
  };

  const testTimezones = [
    { label: 'Canada (Toronto)', value: 'America/Toronto' },
    { label: 'Canada (Vancouver)', value: 'America/Vancouver' },
    { label: 'USA (New York)', value: 'America/New_York' },
    { label: 'USA (Los Angeles)', value: 'America/Los_Angeles' },
    { label: 'UK (London)', value: 'Europe/London' },
    { label: 'Germany (Berlin)', value: 'Europe/Berlin' },
    { label: 'Japan (Tokyo)', value: 'Asia/Tokyo' },
    { label: 'Australia (Sydney)', value: 'Australia/Sydney' },
    { label: 'India (Mumbai)', value: 'Asia/Kolkata' },
    { label: 'Brazil (São Paulo)', value: 'America/Sao_Paulo' },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Timezone Information
        </CardTitle>
        <CardDescription>
          Current timezone detection status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={isDetected ? "default" : "destructive"}>
            {isDetected ? "Detected" : "Not Detected"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Timezone:</span>
          <Badge variant="outline" className="font-mono">
            {timezone}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Offset:</span>
          <Badge variant="outline" className="font-mono">
            {timezoneInfo.offsetString}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Offset (minutes):</span>
          <Badge variant="outline" className="font-mono">
            {timezoneInfo.offset}
          </Badge>
        </div>
        
        <div className="pt-2 space-y-2">
          <Button 
            onClick={handleDebugLog} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <Clock className="h-4 w-4 mr-2" />
            Log Debug Info
          </Button>
          
          <Button 
            onClick={handleTestCurrent} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Current Timezone
          </Button>
          
          <Button 
            onClick={handleTestMultiple} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <Globe className="h-4 w-4 mr-2" />
            Test Multiple Countries
          </Button>
          
          <Button 
            onClick={handleRunAllTests} 
            variant="default" 
            size="sm" 
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Run All Tests
          </Button>
        </div>
        
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Simulate Different Timezone:</h4>
          <Select value={selectedTestTimezone} onValueChange={setSelectedTestTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone to simulate" />
            </SelectTrigger>
            <SelectContent>
              {testTimezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleSimulateTimezone} 
            disabled={!selectedTestTimezone}
            variant="secondary" 
            size="sm" 
            className="w-full mt-2"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Simulate Selected Timezone
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>This component shows the automatically detected timezone information.</p>
          <p>Dates will be handled according to this timezone throughout the application.</p>
        </div>
      </CardContent>
    </Card>
  );
}
