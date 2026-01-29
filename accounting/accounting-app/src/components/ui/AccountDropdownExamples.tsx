import React from 'react';
import { AccountDropdown, AssetAccountDropdown, IncomeAccountDropdown, ExpenseAccountDropdown } from './AccountDropdown';

// Example usage component showing different ways to use the AccountDropdown
export function AccountDropdownExamples() {
  const [selectedAccount, setSelectedAccount] = React.useState<string>('');
  const [selectedAsset, setSelectedAsset] = React.useState<string>('');
  const [selectedIncome, setSelectedIncome] = React.useState<string>('');
  const [selectedExpense, setSelectedExpense] = React.useState<string>('');

  const clientId = 1; // Replace with actual client ID

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Account Dropdown Examples</h2>
      
      {/* Basic usage - all accounts */}
      <div className="space-y-2">
        <label className="text-sm font-medium">All Accounts (Basic)</label>
        <AccountDropdown
          clientId={clientId}
          value={selectedAccount}
          onValueChange={setSelectedAccount}
          placeholder="Select any account"
        />
      </div>

      {/* Asset accounts only */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Asset Accounts Only</label>
        <AssetAccountDropdown
          clientId={clientId}
          value={selectedAsset}
          onValueChange={setSelectedAsset}
          placeholder="Select asset account"
        />
      </div>

      {/* Income accounts with search and grouping */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Income Accounts (Searchable, Grouped)</label>
        <IncomeAccountDropdown
          clientId={clientId}
          value={selectedIncome}
          onValueChange={setSelectedIncome}
          placeholder="Select income account"
          searchable={true}
          groupByType={true}
          showAccountTypes={true}
        />
      </div>

      {/* Expense accounts with balances */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Expense Accounts (With Balances)</label>
        <ExpenseAccountDropdown
          clientId={clientId}
          value={selectedExpense}
          onValueChange={setSelectedExpense}
          placeholder="Select expense account"
          showBalances={true}
          showAccountNumbers={true}
        />
      </div>

      {/* Compact version */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Compact Version</label>
        <AccountDropdown
          clientId={clientId}
          value=""
          onValueChange={() => {}}
          placeholder="Compact dropdown"
          compact={true}
          showAccountNumbers={false}
        />
      </div>

      {/* Custom display */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Display</label>
        <AccountDropdown
          clientId={clientId}
          value=""
          onValueChange={() => {}}
          placeholder="Custom display"
          customDisplay={(account) => (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                {account.accountNumber || 'N/A'}
              </span>
              <span className="font-medium">{account.name}</span>
              <span className="text-xs text-muted-foreground">({account.type})</span>
            </div>
          )}
        />
      </div>

      {/* With error state */}
      <div className="space-y-2">
        <label className="text-sm font-medium">With Error</label>
        <AccountDropdown
          clientId={clientId}
          value=""
          onValueChange={() => {}}
          placeholder="Account with error"
          error="Please select a valid account"
          required={true}
        />
      </div>

      {/* Disabled state */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Disabled</label>
        <AccountDropdown
          clientId={clientId}
          value=""
          onValueChange={() => {}}
          placeholder="Disabled dropdown"
          disabled={true}
        />
      </div>

      {/* Modal context with high z-index */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Modal Context (High Z-Index)</label>
        <AccountDropdown
          clientId={clientId}
          value=""
          onValueChange={() => {}}
          placeholder="For use in modals"
          zIndex={99999}
        />
      </div>
    </div>
  );
}

// Usage in forms with react-hook-form
export function AccountDropdownFormExample() {
  const [formData, setFormData] = React.useState({
    assetAccount: '',
    incomeAccount: '',
    expenseAccount: '',
  });

  const clientId = 1;

  return (
    <form className="space-y-4 p-6">
      <h3 className="text-lg font-semibold">Form Integration Example</h3>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Asset Account *</label>
        <AssetAccountDropdown
          clientId={clientId}
          value={formData.assetAccount}
          onValueChange={(value) => setFormData(prev => ({ ...prev, assetAccount: value }))}
          placeholder="Select asset account"
          required={true}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Income Account *</label>
        <IncomeAccountDropdown
          clientId={clientId}
          value={formData.incomeAccount}
          onValueChange={(value) => setFormData(prev => ({ ...prev, incomeAccount: value }))}
          placeholder="Select income account"
          required={true}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Expense Account *</label>
        <ExpenseAccountDropdown
          clientId={clientId}
          value={formData.expenseAccount}
          onValueChange={(value) => setFormData(prev => ({ ...prev, expenseAccount: value }))}
          placeholder="Select expense account"
          required={true}
        />
      </div>

      <button 
        type="submit" 
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        disabled={!formData.assetAccount || !formData.incomeAccount || !formData.expenseAccount}
      >
        Submit
      </button>
    </form>
  );
}
