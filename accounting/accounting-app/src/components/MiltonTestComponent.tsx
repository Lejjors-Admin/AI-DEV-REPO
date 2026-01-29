/**
 * Milton AI Test Component - Testing Context-Aware AI with Shared Credentials
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Brain, CheckCircle, XCircle } from 'lucide-react';

interface MiltonTestResult {
  scenario: {
    module: string;
    action: string;
  };
  success: boolean;
  result?: any;
  error?: string;
}

export function MiltonTestComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [customContext, setCustomContext] = useState({
    module: 'transactions',
    action: 'analyze expense'
  });
  const [customData, setCustomData] = useState('{"description": "Lunch meeting at restaurant", "amount": 85.50}');
  const [customResult, setCustomResult] = useState<any>(null);

  const runAutomatedTests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/milton/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: 'Test execution failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const runCustomTest = async () => {
    setIsLoading(true);
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(customData);
      } catch {
        parsedData = { text: customData };
      }

      const response = await fetch('/api/milton/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: customContext,
          data: parsedData
        })
      });
      
      const data = await response.json();
      setCustomResult(data);
    } catch (error) {
      console.error('Custom test failed:', error);
      setCustomResult({ error: 'Custom test execution failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Milton AI Context-Aware Testing
          </CardTitle>
          <CardDescription>
            Test Milton's context-switching capabilities with shared Azure OpenAI credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={runAutomatedTests} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Automated Tests'
              )}
            </Button>
          </div>

          {testResults && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Test Results</h3>
              {testResults.error ? (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle className="h-4 w-4" />
                      Error: {testResults.error}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline">{testResults.sharedCredentials}</Badge>
                    <span className="text-sm text-gray-600">
                      {testResults.totalTests} tests completed
                    </span>
                  </div>
                  
                  {testResults.results?.map((result: MiltonTestResult, index: number) => (
                    <Card key={index} className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <Badge variant="secondary">{result.scenario.module}</Badge>
                              <span className="text-sm font-medium">{result.scenario.action}</span>
                            </div>
                            
                            {result.success && result.result && (
                              <div className="mt-2 p-2 bg-white rounded border text-sm">
                                <pre className="whitespace-pre-wrap text-xs">
                                  {typeof result.result === 'string' 
                                    ? result.result 
                                    : JSON.stringify(result.result, null, 2)
                                  }
                                </pre>
                              </div>
                            )}
                            
                            {!result.success && (
                              <p className="text-red-600 text-sm mt-1">{result.error}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Context Test</CardTitle>
          <CardDescription>
            Test Milton with your own context and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Module</label>
              <Select
                value={customContext.module}
                onValueChange={(value) => setCustomContext(prev => ({ ...prev, module: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="bills">Bills</SelectItem>
                  <SelectItem value="reconciliation">Reconciliation</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="accounts">Accounts</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <input
                type="text"
                value={customContext.action}
                onChange={(e) => setCustomContext(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., categorize expense"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data (JSON)</label>
            <Textarea
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              placeholder='{"description": "Office supplies", "amount": 45.99}'
              rows={3}
            />
          </div>

          <Button onClick={runCustomTest} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Custom Context'
            )}
          </Button>

          {customResult && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Custom Test Result</h4>
              <Card className={customResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CardContent className="pt-4">
                  {customResult.success ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge variant="secondary">{customResult.mode}</Badge>
                      </div>
                      <div className="p-2 bg-white rounded border text-sm">
                        <pre className="whitespace-pre-wrap text-xs">
                          {typeof customResult.result === 'string' 
                            ? customResult.result 
                            : JSON.stringify(customResult.result, null, 2)
                          }
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle className="h-4 w-4" />
                      Error: {customResult.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}