import React, { useState } from 'react';
import { AccountDropdown } from './AccountDropdown';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export function AccountDropdownTest() {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [clientId] = useState(1); // Test with client ID 1

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AccountDropdown Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Account Selection</label>
          <AccountDropdown
            clientId={clientId}
            value={selectedAccount}
            onValueChange={setSelectedAccount}
            placeholder="Select an account to test"
            showAccountNumbers={true}
            searchable={true}
            groupByType={true}
            showAccountTypes={true}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Selected Account ID</label>
          <div className="p-2 bg-gray-100 rounded text-sm font-mono">
            {selectedAccount || 'None selected'}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Test Actions</label>
          <div className="flex gap-2">
            <Button 
              onClick={() => setSelectedAccount('')}
              variant="outline"
              size="sm"
            >
              Clear Selection
            </Button>
            <Button 
              onClick={() => console.log('Current selection:', selectedAccount)}
              variant="outline"
              size="sm"
            >
              Log Selection
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>Instructions:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Open the dropdown to see all accounts</li>
            <li>Use the search to filter accounts</li>
            <li>Use the refresh button to reload accounts</li>
            <li>Check browser console for debug logs</li>
            <li>Create a new account in Chart of Accounts and test if it appears</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
