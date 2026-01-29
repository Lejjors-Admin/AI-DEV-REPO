/**
 * Timezone Testing Page
 * 
 * A dedicated page for testing timezone functionality
 * across different countries and scenarios
 */

import React from 'react';
import { TimezoneDebugger } from '@/components/TimezoneDebugger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Clock, TestTube, AlertCircle } from 'lucide-react';

export default function TimezoneTestPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Globe className="h-8 w-8" />
          Timezone Testing Center
        </h1>
        <p className="text-muted-foreground">
          Test timezone functionality across multiple countries and scenarios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timezone Debugger */}
        <TimezoneDebugger />

        {/* Testing Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Testing Instructions
            </CardTitle>
            <CardDescription>
              How to test timezone functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Browser DevTools Method:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Open DevTools (F12)</li>
                <li>• Go to Console or Sensors tab</li>
                <li>• Override timezone to test different countries</li>
                <li>• Refresh page to see changes</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. Console Testing:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Open browser console</li>
                <li>• Use the test buttons above</li>
                <li>• Check console output for results</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. Manual Testing:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Create journal entries with different dates</li>
                <li>• Create invoices with various dates</li>
                <li>• Verify dates are saved correctly</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Test Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Test Countries
            </CardTitle>
            <CardDescription>
              Countries and timezones to test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline">🇨🇦 Canada (Toronto)</Badge>
              <Badge variant="outline">🇨🇦 Canada (Vancouver)</Badge>
              <Badge variant="outline">🇺🇸 USA (New York)</Badge>
              <Badge variant="outline">🇺🇸 USA (Los Angeles)</Badge>
              <Badge variant="outline">🇬🇧 UK (London)</Badge>
              <Badge variant="outline">🇩🇪 Germany (Berlin)</Badge>
              <Badge variant="outline">🇯🇵 Japan (Tokyo)</Badge>
              <Badge variant="outline">🇦🇺 Australia (Sydney)</Badge>
              <Badge variant="outline">🇮🇳 India (Mumbai)</Badge>
              <Badge variant="outline">🇧🇷 Brazil (São Paulo)</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Expected Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Expected Results
            </CardTitle>
            <CardDescription>
              What you should see when testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Success Indicators:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Timezone detected automatically</li>
                <li>• Dates display in local timezone</li>
                <li>• No date shifting when saving</li>
                <li>• DST transitions work correctly</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-red-600">❌ Failure Indicators:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Dates shifting by one day</li>
                <li>• Wrong timezone detected</li>
                <li>• DST dates showing incorrect time</li>
                <li>• API errors with timezone headers</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Console Output Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Console Output
          </CardTitle>
          <CardDescription>
            Check your browser console for detailed test results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            <div className="text-green-600">🌍 Timezone detected: America/Toronto</div>
            <div className="text-blue-600">⏰ Offset: UTC-5</div>
            <div className="text-purple-600">📅 Current date: 2025-01-15</div>
            <div className="text-orange-600">🧪 Test results: All tests passed</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
