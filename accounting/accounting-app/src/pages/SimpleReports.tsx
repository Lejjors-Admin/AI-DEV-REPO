import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SimpleReports() {
  const [selectedClient, setSelectedClient] = useState<string>("2");
  const [reportType, setReportType] = useState<string>("balance-sheet");
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const fetchReport = async () => {
    if (!selectedClient) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      let url = `/api/reports/${reportType}/${selectedClient}`;
      
      if (reportType === 'profit-loss') {
        url += `?startDate=2024-01-01&endDate=2024-12-31`;
      } else {
        url += `?date=2024-12-31`;
      }
      
      console.log('Fetching:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      setReportData(data);
      
    } catch (err: any) {
      console.error('Report fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      fetchReport();
    }
  }, [selectedClient, reportType]);

  const renderBalanceSheet = () => {
    if (!reportData || !reportData.assets) return null;
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Balance Sheet</h2>
        <p className="text-center text-gray-600">As of December 31, 2024</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Assets */}
          <div>
            <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">ASSETS</h3>
            
            {/* Current Assets */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Current Assets</h4>
              {reportData.assets.currentAssets?.accounts?.map((account: any) => (
                <div key={account.id} className="flex justify-between py-2 pl-4">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.accountNumber}</div>
                  </div>
                  <div className="font-medium">{formatCurrency(account.balance)}</div>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Current Assets</span>
                <span>{formatCurrency(reportData.assets.currentAssets?.total || 0)}</span>
              </div>
            </div>

            {/* Fixed Assets */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Fixed Assets</h4>
              {reportData.assets.fixedAssets?.accounts?.length > 0 ? (
                reportData.assets.fixedAssets.accounts.map((account: any) => (
                  <div key={account.id} className="flex justify-between py-2 pl-4">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.accountNumber}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 pl-4">No fixed assets</div>
              )}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Fixed Assets</span>
                <span>{formatCurrency(reportData.assets.fixedAssets?.total || 0)}</span>
              </div>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-black font-bold text-xl">
              <span>TOTAL ASSETS</span>
              <span>{formatCurrency(reportData.totals?.totalAssets || 0)}</span>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div>
            <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">LIABILITIES & EQUITY</h3>
            
            {/* Current Liabilities */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Current Liabilities</h4>
              {reportData.liabilities.currentLiabilities?.accounts?.length > 0 ? (
                reportData.liabilities.currentLiabilities.accounts.map((account: any) => (
                  <div key={account.id} className="flex justify-between py-2 pl-4">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.accountNumber}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 pl-4">No current liabilities</div>
              )}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Current Liabilities</span>
                <span>{formatCurrency(reportData.liabilities.currentLiabilities?.total || 0)}</span>
              </div>
            </div>

            {/* Long-term Liabilities */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Long-term Liabilities</h4>
              {reportData.liabilities.longTermLiabilities?.accounts?.length > 0 ? (
                reportData.liabilities.longTermLiabilities.accounts.map((account: any) => (
                  <div key={account.id} className="flex justify-between py-2 pl-4">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.accountNumber}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 pl-4">No long-term liabilities</div>
              )}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Long-term Liabilities</span>
                <span>{formatCurrency(reportData.liabilities.longTermLiabilities?.total || 0)}</span>
              </div>
            </div>

            {/* Total Liabilities */}
            <div className="flex justify-between py-2 border-t font-bold mb-6">
              <span>Total Liabilities</span>
              <span>{formatCurrency(reportData.liabilities?.total || 0)}</span>
            </div>

            {/* Equity */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Equity</h4>
              {reportData.equity.accounts?.map((account: any) => (
                <div key={account.id} className="flex justify-between py-2 pl-4">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.accountNumber}</div>
                  </div>
                  <div className="font-medium">{formatCurrency(account.balance)}</div>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Equity</span>
                <span>{formatCurrency(reportData.equity?.total || 0)}</span>
              </div>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-black font-bold text-xl">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span>{formatCurrency(reportData.totals?.totalLiabilitiesAndEquity || 0)}</span>
            </div>
          </div>
        </div>

        {/* Balance Status */}
        <div className={`text-center p-4 rounded-lg ${reportData.isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <h3 className="font-bold text-lg">
            {reportData.isBalanced ? '✓ Balance Sheet is BALANCED' : '✗ Balance Sheet is NOT BALANCED'}
          </h3>
          <p>Assets = Liabilities + Equity</p>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (!reportData || !reportData.accounts) return null;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Trial Balance</h2>
        <p className="text-center text-gray-600">As of December 31, 2024</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Debits</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.summary?.totalDebits || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Credits</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.totalCredits || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Status</h3>
              <p className={`text-2xl font-bold ${reportData.summary?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.summary?.isBalanced ? 'BALANCED' : 'UNBALANCED'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Account</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Account Number</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Debit</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.accounts).map(([type, accounts]: [string, any]) => {
                if (!accounts || accounts.length === 0) return null;
                
                const typeName = type === 'costOfSales' ? 'Cost of Sales' : 
                                type.charAt(0).toUpperCase() + type.slice(1);
                
                return [
                  <tr key={`${type}-header`} className="bg-gray-100">
                    <td colSpan={4} className="border border-gray-300 px-4 py-2 font-bold">{typeName}</td>
                  </tr>,
                  ...accounts.map((account: any) => (
                    <tr key={account.id}>
                      <td className="border border-gray-300 px-4 py-2">{account.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{account.accountNumber}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : '-'}
                      </td>
                    </tr>
                  ))
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProfitLoss = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Profit & Loss Statement</h2>
        <p className="text-center text-gray-600">January 1, 2024 to December 31, 2024</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.income?.total || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Expenses</h3>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.expenses?.total || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Net Income</h3>
              <p className={`text-2xl font-bold ${reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(reportData.netIncome || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Income */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">REVENUE</h3>
          {reportData.income?.accounts?.map((account: any) => (
            account.balance > 0 && (
              <div key={account.id} className="flex justify-between py-2 pl-4">
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.accountNumber}</div>
                </div>
                <div className="font-medium">{formatCurrency(account.balance)}</div>
              </div>
            )
          ))}
          <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
            <span>Total Revenue</span>
            <span>{formatCurrency(reportData.income?.total || 0)}</span>
          </div>
        </div>

        {/* Cost of Sales */}
        {reportData.costOfSales?.total > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">COST OF SALES</h3>
            {reportData.costOfSales.accounts?.map((account: any) => (
              account.balance > 0 && (
                <div key={account.id} className="flex justify-between py-2 pl-4">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.accountNumber}</div>
                  </div>
                  <div className="font-medium">{formatCurrency(account.balance)}</div>
                </div>
              )
            ))}
            <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
              <span>Total Cost of Sales</span>
              <span>{formatCurrency(reportData.costOfSales.total)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-black font-bold text-xl">
              <span>GROSS PROFIT</span>
              <span>{formatCurrency(reportData.grossProfit || 0)}</span>
            </div>
          </div>
        )}

        {/* Expenses */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">EXPENSES</h3>
          {reportData.expenses?.accounts?.map((account: any) => (
            account.balance > 0 && (
              <div key={account.id} className="flex justify-between py-2 pl-4">
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.accountNumber}</div>
                </div>
                <div className="font-medium">{formatCurrency(account.balance)}</div>
              </div>
            )
          ))}
          <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
            <span>Total Expenses</span>
            <span>{formatCurrency(reportData.expenses?.total || 0)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div className="flex justify-between py-4 border-t-4 border-black font-bold text-2xl">
          <span>NET INCOME</span>
          <span className={reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(reportData.netIncome || 0)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-gray-600">Generate and view financial reports</p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                  <SelectItem value="trial-balance">Trial Balance</SelectItem>
                  <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={isLoading} className="w-full">
                {isLoading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="text-red-600">
              <h3 className="font-bold">Error</h3>
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      {reportData && (
        <Card className="border-blue-500">
          <CardContent className="p-4">
            <h3 className="font-bold text-blue-600">Data Loaded Successfully</h3>
            <p>Report Type: {reportType}</p>
            <p>Client: {selectedClient}</p>
            <p>Data Keys: {Object.keys(reportData).join(', ')}</p>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading report...</div>
          </CardContent>
        </Card>
      ) : reportData ? (
        <Card>
          <CardContent className="p-6">
            {reportType === 'balance-sheet' && renderBalanceSheet()}
            {reportType === 'trial-balance' && renderTrialBalance()}
            {reportType === 'profit-loss' && renderProfitLoss()}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              Select a client and report type to view financial data
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}