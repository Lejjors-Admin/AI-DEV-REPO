/**
 * Enhanced Transaction Classification Card
 * Complete redesign with AI assistance, HST handling, customer/vendor selection, 
 * project tagging, and attachment support
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiConfig } from "@/lib/api-config";
import { AccountDropdown } from '@/components/ui/AccountDropdown';
import { 

  Brain, 
  Calculator, 
  CreditCard, 
  Upload, 
  FileText, 
  Building, 
  User, 
  FolderOpen,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  Tag,
  Plus,
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  Banknote,
  Wallet,
  Briefcase,
  MapPin
} from 'lucide-react';

interface TransactionClassificationCardProps {
  transaction: any;
  onSave: (transaction: any) => void;
  onClose: () => void;
  accounts: any[];
  clientId: number;
  billMatch?: {
    bill: any;
    contact: any;
    score: number;
    allMatches?: Array<{ bill: any; contact: any; score: number }>;
  };
  invoiceMatch?: {
    invoice: any;
    contact: any;
    score: number;
    allMatches?: Array<{ invoice: any; contact: any; score: number }>;
  };
}

export default function TransactionClassificationCard({
  transaction,
  onSave,
  onClose,
  accounts,
  clientId,
  billMatch,
  invoiceMatch
}: TransactionClassificationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Enhanced state management
  const [editedTransaction, setEditedTransaction] = useState(transaction);
  const [miltonSuggestion, setMiltonSuggestion] = useState<any>(null);
  const [isLoadingMilton, setIsLoadingMilton] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [hstCalculation, setHstCalculation] = useState<any>(null);
  const [showNewLocationDialog, setShowNewLocationDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  // Remove tab state - using single scrollable interface
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [newContactType, setNewContactType] = useState<'customer' | 'vendor'>('customer');
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [defaultTaxSetting, setDefaultTaxSetting] = useState<any>(null);
  const [isLoadingTaxSettings, setIsLoadingTaxSettings] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [showCreateRuleDialog, setShowCreateRuleDialog] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleMatchType, setNewRuleMatchType] = useState('contains');
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [newContactData, setNewContactData] = useState({ name: '', email: '' });
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [showNewClassDialog, setShowNewClassDialog] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [linkBill, setLinkBill] = useState(billMatch ? true : false); // Auto-check if bill match exists
  const [selectedBillId, setSelectedBillId] = useState<number | null>(
    billMatch?.bill?.id || null
  ); // Track which bill is selected for linking
  const [linkInvoice, setLinkInvoice] = useState(invoiceMatch ? true : false); // Auto-check if invoice match exists
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    invoiceMatch?.invoice?.id || null
  ); // Track which invoice is selected for linking
  
  // Account Split Functionality State
  const [isAccountSplit, setIsAccountSplit] = useState(false);
  const [accountSplits, setAccountSplits] = useState<Array<{
    id: string;
    accountId: number | null;
    amount: number;
    description: string;
    taxCode: string;
    netAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
  }>>([]);
  const [splitDataLoaded, setSplitDataLoaded] = useState(false);
  const [showAccountSplitDialog, setShowAccountSplitDialog] = useState(false);
  const [splitValidationErrors, setSplitValidationErrors] = useState<string[]>([]);

  // Determine transaction direction
  const isMoneyIn = editedTransaction.debitAmount > 0 || editedTransaction.amount > 0;
  const isMoneyOut = editedTransaction.creditAmount > 0 || editedTransaction.amount < 0;
  const transactionAmount = Math.abs(editedTransaction.debitAmount || editedTransaction.creditAmount || editedTransaction.amount || 0);

  // Load supporting data
  useEffect(() => {
    loadSupportingData();
    loadTaxSettings();
    getMiltonSuggestion();
    loadRules();
  }, []);

  // Update editedTransaction when transaction prop changes
  useEffect(() => {
    console.log('🔄 Transaction changed, initializing for transaction ID:', transaction.id, {
      taxCode: transaction.taxCode,
      taxSettingId: transaction.taxSettingId,
      taxName: transaction.taxName
    });
    
    // Initialize editedTransaction with transaction data
    // Tax code will be properly mapped in the mapping effect once tax settings are loaded
    setEditedTransaction({
      ...transaction,
      // Preserve taxCode if it exists, it will be mapped later
      taxCode: transaction.taxCode || transaction.taxSettingId || null
    });
    
    // Reset HST calculation when switching transactions to prevent stale data
    setHstCalculation(null);
    
    // Initialize bill selection when billMatch changes
    if (billMatch?.bill) {
      setSelectedBillId(billMatch.bill.id);
      setLinkBill(true);
    } else {
      setSelectedBillId(null);
      setLinkBill(false);
    }
  }, [transaction, billMatch]);

  // Recalculate HST when tax code, amount, tax settings, or transaction changes
  useEffect(() => {
    // Add a delay to ensure tax code mapping has completed (tax code mapping uses 100ms delay)
    const hstCalculationTimeout = setTimeout(() => {
      // Only calculate if tax settings are loaded and we have a valid transaction
      if (!isLoadingTaxSettings && taxSettings.length > 0 && editedTransaction.id) {
        // Check if tax code exists and is valid
        const hasTaxCode = editedTransaction.taxCode && editedTransaction.taxCode !== 'exempt' && editedTransaction.taxCode !== null && editedTransaction.taxCode !== undefined;
        
        if (hasTaxCode && transactionAmount > 0) {
          // Verify the tax code exists in tax settings
          const taxSetting = taxSettings.find(tax => String(tax.id) === String(editedTransaction.taxCode));
          if (taxSetting) {
            console.log('🔄 Recalculating HST - taxCode:', editedTransaction.taxCode, 'amount:', transactionAmount, 'transactionId:', editedTransaction.id, 'taxSettings count:', taxSettings.length);
            calculateHST(editedTransaction.taxCode);
          } else {
            console.log('⚠️ Tax code not found in tax settings:', editedTransaction.taxCode, 'for transaction:', editedTransaction.id);
            // Don't clear HST here - tax code mapping might still be processing
            // The tax code mapping effect will handle setting HST when it finds a valid tax code
          }
        } else if (editedTransaction.taxCode === 'exempt') {
          // Only clear if explicitly exempt
          console.log('🔄 Clearing HST calculation - taxCode is exempt, transactionId:', editedTransaction.id);
          setHstCalculation(null);
        }
        // If tax code is null/undefined, don't clear HST - tax code mapping might still be in progress
        // The tax code mapping effect will handle setting/clearing HST appropriately
      }
    }, 200); // 200ms delay to ensure tax code mapping (100ms) has completed and state has settled
    
    return () => clearTimeout(hstCalculationTimeout);
    // Note: This effect depends on editedTransaction.id to ensure it runs when switching transactions
    // even if the tax code is the same as the previous transaction
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedTransaction.taxCode, transactionAmount, taxSettings.length, isLoadingTaxSettings, editedTransaction.id]);

  // Load split data when transaction ID is available
  useEffect(() => {
    if (editedTransaction.id) {
      console.log('🔍 Loading split data for transaction ID:', editedTransaction.id);
      setSplitDataLoaded(false); // Reset the flag when transaction changes
      loadSplitData();
    }
  }, [editedTransaction.id]);

  // Check if transaction is split based on category (only if no splits are already loaded)
  useEffect(() => {
    if (editedTransaction.category === 'Split Transaction' && !splitDataLoaded) {
      console.log('🔍 Transaction is marked as Split Transaction, enabling split view');
      console.log('🔍 Current accountSplits:', accountSplits);
      console.log('🔍 Transaction amount:', transactionAmount);
      console.log('🔍 Split data loaded flag:', splitDataLoaded);
      setIsAccountSplit(true);
      
      // Only initialize with default splits if none exist AND we haven't loaded from backend/localStorage
      if (accountSplits.length === 0) {
        console.log('🔍 No existing splits found, initializing with defaults');
        // Find a different account for split 2 (preferably an expense account if the first is income, or vice versa)
        const firstAccount = accounts.find(acc => acc.id === editedTransaction.accountId);
        let secondAccountId = null;
        
        if (firstAccount) {
          // If first account is income, find an expense account for split 2
          if (firstAccount.type === 'income') {
            const expenseAccount = accounts.find(acc => acc.type === 'expense');
            secondAccountId = expenseAccount?.id || null;
          }
          // If first account is expense, find an income account for split 2
          else if (firstAccount.type === 'expense') {
            const incomeAccount = accounts.find(acc => acc.type === 'income');
            secondAccountId = incomeAccount?.id || null;
          }
          // If first account is asset, find another asset account for split 2
          else if (firstAccount.type === 'asset') {
            const otherAssetAccount = accounts.find(acc => acc.type === 'asset' && acc.id !== editedTransaction.accountId);
            secondAccountId = otherAssetAccount?.id || null;
          }
        }
        
        setAccountSplits([
          {
            id: '1',
            accountId: editedTransaction.accountId,
            amount: transactionAmount * 0.5,
            description: editedTransaction.description || '',
            taxCode: editedTransaction.taxCode || defaultTaxSetting?.id || 'exempt'
          },
          {
            id: '2',
            accountId: secondAccountId,
            amount: transactionAmount * 0.5,
            description: editedTransaction.description || '',
            taxCode: editedTransaction.taxCode || defaultTaxSetting?.id || 'exempt'
          }
        ]);
      } else {
        console.log('🔍 Transaction is split and has existing splits, not overriding:', accountSplits);
      }
    } else if (editedTransaction.category === 'Split Transaction' && splitDataLoaded) {
      console.log('🔍 Transaction is split and data already loaded, not overriding:', accountSplits);
      setIsAccountSplit(true);
    }
  }, [editedTransaction.category, editedTransaction.id, accounts, splitDataLoaded]);

  // Map tax code when both transaction and tax settings are available
  useEffect(() => {
    if (transaction && taxSettings.length > 0 && !isLoadingTaxSettings) {
      // Add delay to ensure state updates have completed before mapping
      const mappingTimeout = setTimeout(() => {
        let mappedTaxCode = transaction.taxCode || transaction.taxSettingId;
        
        console.log('🔍 Mapping tax code for transaction:', {
          transactionId: transaction.id,
          taxCode: transaction.taxCode,
          taxSettingId: transaction.taxSettingId,
          taxName: transaction.taxName,
          availableTaxSettings: taxSettings.map(t => ({ id: t.id, name: t.name }))
        });
        
        // First, check if taxCode/taxSettingId already matches a tax setting ID
        if (mappedTaxCode) {
          const directMatch = taxSettings.find(
            (tax: any) => String(tax.id) === String(mappedTaxCode)
          );
          if (directMatch) {
            console.log(`✅ Direct tax code match found: ${mappedTaxCode} -> ${directMatch.name}`);
            mappedTaxCode = directMatch.id;
          } else {
            // Try to find by name if taxCode is a string name
            const nameMatch = taxSettings.find(
              (tax: any) => tax.name?.toLowerCase() === String(mappedTaxCode).toLowerCase() ||
                           tax.displayText?.toLowerCase().includes(String(mappedTaxCode).toLowerCase())
            );
            if (nameMatch) {
              console.log(`✅ Tax code matched by name: "${mappedTaxCode}" -> ${nameMatch.id} (${nameMatch.name})`);
              mappedTaxCode = nameMatch.id;
            } else {
              console.log(`⚠️ Tax code "${mappedTaxCode}" not found in tax settings, will try other methods`);
            }
          }
        }
        
        // If we have a taxName but no taxCode, try to find the matching tax setting
        if (transaction.taxName && !mappedTaxCode) {
          const matchingTax = taxSettings.find(
            (tax: any) => tax.name?.toLowerCase() === transaction.taxName?.toLowerCase()
          );
          if (matchingTax) {
            mappedTaxCode = matchingTax.id;
            console.log(`🔍 Mapped tax name "${transaction.taxName}" to tax code "${mappedTaxCode}"`);
          }
        }
        
        // If we have a taxSettingId but no taxCode, use the taxSettingId
        if (transaction.taxSettingId && !mappedTaxCode) {
          mappedTaxCode = transaction.taxSettingId;
          console.log(`🔍 Using taxSettingId "${transaction.taxSettingId}" as tax code`);
        }
        
        // If no tax code was found, try using the default tax setting
        if (!mappedTaxCode && defaultTaxSetting && defaultTaxSetting.id !== 'exempt') {
          mappedTaxCode = defaultTaxSetting.id;
          console.log(`🔍 No tax code found, using default tax setting: "${mappedTaxCode}" (${defaultTaxSetting.name})`);
        }
        
        // Update the edited transaction with the mapped tax code and calculate HST
        if (mappedTaxCode) {
          const currentAmount = Math.abs(transaction.debitAmount || transaction.creditAmount || transaction.amount || 0);
          
          if (String(mappedTaxCode) !== String(editedTransaction.taxCode)) {
            console.log(`🔄 Updating tax code from "${editedTransaction.taxCode}" to "${mappedTaxCode}"`);
            setEditedTransaction((prev: any) => ({
              ...prev,
              taxCode: mappedTaxCode
            }));
            // HST calculation will be triggered by the HST calculation effect when taxCode changes
          } else {
            // Tax code is already correct, but we should still ensure HST is calculated
            // This handles the case where we switch to a transaction with the same tax code
            console.log(`✅ Tax code already matches: "${mappedTaxCode}", ensuring HST is calculated for amount: ${currentAmount}`);
            // Calculate HST directly since tax code hasn't changed (so HST effect won't run)
            // Use a small delay to ensure state has settled
            setTimeout(() => {
              if (mappedTaxCode !== 'exempt' && currentAmount > 0) {
                calculateHST(mappedTaxCode);
              }
            }, 50);
          }
        } else if (!mappedTaxCode) {
          console.log('⚠️ No tax code found for transaction and no default tax setting available');
          // Only clear HST if we're sure there's no tax code and no default
          // Keep the current tax code value (might be from a previous mapping attempt)
          if (!editedTransaction.taxCode) {
            setHstCalculation(null);
          }
        }
      }, 100); // 100ms delay to ensure state updates have completed
      
      // Cleanup timeout on unmount or when dependencies change
      return () => clearTimeout(mappingTimeout);
    }
  }, [transaction?.id, taxSettings, isLoadingTaxSettings, defaultTaxSetting]);


  const createNewLocation = async () => {
    if (!newLocationName.trim()) return;
    
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/locations/${clientId}`), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: newLocationName,
          clientId: clientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLocations([...locations, result.data]);
        setEditedTransaction({
          ...editedTransaction,
          locationId: result.data.id
        });
        setShowNewLocationDialog(false);
        setNewLocationName('');
        
        // Invalidate cache so other components see the new location
        queryClient.invalidateQueries({ queryKey: ['/api/locations', clientId] });
        
        toast({
          title: "Location Created",
          description: `Location '${newLocationName}' has been created and assigned to this transaction`,
        });
      }
    } catch (error) {
      console.error('Error creating location:', error);
      toast({
        title: "Error",
        description: "Could not create location",
        variant: "destructive"
      });
    }
  };

  const createNewClass = async () => {
    if (!newClassName.trim()) return;
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/classes/${clientId}`), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: newClassName,
          clientId: clientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setClasses([...classes, result.data]);
        setEditedTransaction({
          ...editedTransaction,
          classId: result.data.id
        });
        setShowNewClassDialog(false);
        setNewClassName('');
        
        // Invalidate cache so other components see the new class
        queryClient.invalidateQueries({ queryKey: ['/api/classes', clientId] });
        
        toast({
          title: "Class Created",
          description: `Class '${newClassName}' has been created and assigned to this transaction`,
        });
      }
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: "Error",
        description: "Could not create class",
        variant: "destructive"
      });
    }
  };

  const loadSupportingData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Load customers
      const customersResponse = await fetch(apiConfig.buildUrl(`/api/crm/contacts/${clientId}/customer`), { credentials: 'include', headers });
      if (customersResponse.ok) {
        const contentType = customersResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const customersData = await customersResponse.json();
          setCustomers(customersData.data || []);
        }
      } else {
        console.warn('Customers API returned status:', customersResponse.status);
      }

      // Load vendors
      const vendorsResponse = await fetch(apiConfig.buildUrl(`/api/crm/contacts/${clientId}/vendor`), { credentials: 'include', headers });
      if (vendorsResponse.ok) {
        const contentType = vendorsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const vendorsData = await vendorsResponse.json();
          setVendors(vendorsData.data || []);
        }
      } else {
        console.warn('Vendors API returned status:', vendorsResponse.status);
      }

      // Load projects
      const projectsResponse = await fetch(apiConfig.buildUrl(`/api/projects/${clientId}`), { credentials: 'include', headers });
      if (projectsResponse.ok) {
        const contentType = projectsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const projectsData = await projectsResponse.json();
          setProjects(projectsData.data || []);
        }
      } else {
        console.warn('Projects API returned status:', projectsResponse.status);
      }

      // Load locations
      const locationsResponse = await fetch(apiConfig.buildUrl(`/api/locations/${clientId}`), { credentials: 'include', headers });
      if (locationsResponse.ok) {
        const contentType = locationsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const locationsData = await locationsResponse.json();
          setLocations(locationsData.data || []);
        }
      } else {
        console.warn('Locations API returned status:', locationsResponse.status);
      }

      // Load classes
      const classesResponse = await fetch(apiConfig.buildUrl(`/api/classes/${clientId}`), { credentials: 'include', headers });
      if (classesResponse.ok) {
        const contentType = classesResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const classesData = await classesResponse.json();
          setClasses(classesData.data || []);
        }
      } else {
        console.warn('Classes API returned status:', classesResponse.status);
      }

      // Load attachments
      const attachmentsResponse = await fetch(apiConfig.buildUrl(`/api/transactions/${editedTransaction.id}/attachments`), { credentials: 'include', headers });
      if (attachmentsResponse.ok) {
        const contentType = attachmentsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const attachmentsData = await attachmentsResponse.json();
          setAttachments(attachmentsData.data || []);
        }
      } else {
        console.warn('Attachments API returned status:', attachmentsResponse.status);
      }
    } catch (error) {
      console.error('Error loading supporting data:', error);
    }
  };

  const loadTaxSettings = async () => {
    try {
      setIsLoadingTaxSettings(true);
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      console.log('🔍 Loading bookkeeping settings for client:', clientId);
      const response = await fetch(apiConfig.buildUrl(`/api/clients/${clientId}/bookkeeping-settings`), {
        credentials: 'include',
        headers,
      });
      console.log('🔍 Bookkeeping settings response status:', response.status);
      if (response.ok) {
        const settings = await response.json();
        console.log('🔍 Bookkeeping settings (full response):', settings);
        
        // Extract tax settings from bookkeeping settings
        // Only use if useTaxSettings is enabled and taxSettings array exists
        let taxOptions: any[] = [];
        let defaultOption: any = null;
        
        if (
          Array.isArray(settings.taxSettings) &&
          settings.taxSettings.length > 0
        ) {
          console.log('✅ Tax settings enabled and available, processing...');
          
          // Filter to only include active tax settings
          const activeTaxSettings = settings.taxSettings.filter(
            (tax: any) => tax.isActive !== false
          );
          console.log('🔍 Active tax settings count:', activeTaxSettings.length);
          
          // Format tax settings for dropdown
          taxOptions = activeTaxSettings.map((tax: any) => {
            // Handle rate - might be stored as percentage (13) or decimal (0.13)
            let rate = typeof tax.rate === 'number' ? tax.rate : parseFloat(tax.rate) || 0;
            if (rate > 1) {
              rate = rate / 100;
              console.log(`🔍 Converted rate from ${tax.rate}% to ${rate} decimal`);
            }
            return {
              id: tax.id,
              name: tax.name,
              rate: rate,
              accountId: tax.accountId,
              displayText: `${tax.name} ${(rate * 100).toFixed(1)}%`,
            };
          });
          
          // Add Tax Exempt option
          taxOptions.push({
            id: "exempt",
            name: "Exempt",
            rate: 0,
            accountId: 0,
            displayText: "Tax Exempt",
          });
          
          // Find default tax setting
          const defaultTax = activeTaxSettings.find(
            (tax: any) => tax.isDefault === true
          );
          if (defaultTax) {
            let defaultRate = typeof defaultTax.rate === 'number' ? defaultTax.rate : parseFloat(defaultTax.rate) || 0;
            if (defaultRate > 1) {
              defaultRate = defaultRate / 100;
            }
            defaultOption = {
              id: defaultTax.id,
              name: defaultTax.name,
              rate: defaultRate,
              accountId: defaultTax.accountId,
              displayText: `${defaultTax.name} ${(defaultRate * 100).toFixed(1)}%`,
            };
          } else if (taxOptions.length > 0) {
            // Use first option as default if no explicit default
            defaultOption = taxOptions[0];
          }
          
          console.log('🔍 Processed tax options:', taxOptions);
          console.log('🔍 Default tax option:', defaultOption);
        } else {
          console.log('🔍 Tax settings not enabled or not configured:');
          console.log('  - useTaxSettings:', settings.useTaxSettings);
          console.log('  - taxSettings is array:', Array.isArray(settings.taxSettings));
          console.log('  - taxSettings length:', settings.taxSettings?.length);
        }
        
        setTaxSettings(taxOptions);
        setDefaultTaxSetting(defaultOption);
        
        // Map tax information from transaction data
        let mappedTaxCode = editedTransaction.taxCode;
        
        // If we have a taxName but no taxCode, try to find the matching tax setting
        if (transaction.taxName && !mappedTaxCode && taxOptions.length > 0) {
          const matchingTax = taxOptions.find(
            (tax: any) => tax.name === transaction.taxName
          );
          if (matchingTax) {
            mappedTaxCode = matchingTax.id;
            console.log(`🔍 Mapped tax name "${transaction.taxName}" to tax code "${mappedTaxCode}"`);
          }
        }
        
        // If we have a taxSettingId but no taxCode, use the taxSettingId
        if (transaction.taxSettingId && !mappedTaxCode) {
          mappedTaxCode = transaction.taxSettingId;
          console.log(`🔍 Using taxSettingId "${transaction.taxSettingId}" as tax code`);
        }
        
        // Set default tax code if none is selected
        if (!mappedTaxCode && defaultOption) {
          mappedTaxCode = defaultOption.id;
          console.log(`🔍 Using default tax code "${mappedTaxCode}"`);
        }
        
        // Update the edited transaction with the mapped tax code
        if (mappedTaxCode && mappedTaxCode !== editedTransaction.taxCode) {
          setEditedTransaction({
            ...editedTransaction,
            taxCode: mappedTaxCode
          });
        }
        
        // Trigger HST calculation via useEffect by updating tax settings state
        // The useEffect hook will handle recalculating when taxSettings and taxCode are available
      } else {
        console.error('🔍 Bookkeeping settings request failed:', response.status);
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error('🔍 Error response body:', errorText);
        setTaxSettings([]);
        setDefaultTaxSetting(null);
      }
    } catch (error) {
      console.error('❌ Error loading tax settings:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      setTaxSettings([]);
      setDefaultTaxSetting(null);
    } finally {
      setIsLoadingTaxSettings(false);
    }
  };

  const loadSplitData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      console.log('🔍 Loading split data for transaction:', editedTransaction.id);
      console.log('🔍 Transaction details:', editedTransaction);
      
      // Try the backend endpoint FIRST to get fresh data
      // Only use localStorage as fallback if backend is unavailable
      const response = await fetch(apiConfig.buildUrl(`/api/transactions/classification/split-data/${editedTransaction.id}`), {
        credentials: 'include',
        headers,
      });
      
      console.log('🔍 Split data API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Split data response:', data);
        
        if (data.isSplit && data.splits && data.splits.length > 0) {
          console.log('🔍 Transaction is split, loading split data from backend:', data.splits);
          
          // Validate and fix split data before setting
          const validatedSplits = data.splits.map((split: any, index: number) => {
            console.log(`🔍 Validating backend split ${index + 1}:`, split);
            
            // Ensure amount is a number and not NaN
            const amount = typeof split.amount === 'number' ? split.amount : parseFloat(split.amount) || 0;
            
            // Ensure accountId is preserved (could be 0 or any number, don't convert to null)
            const accountId = split.accountId !== undefined && split.accountId !== null 
              ? (typeof split.accountId === 'number' ? split.accountId : parseInt(split.accountId))
              : null;
            
            console.log(`🔍 Backend split ${index + 1} accountId validation:`, {
              original: split.accountId,
              type: typeof split.accountId,
              validated: accountId
            });
            
            return {
              id: split.id || `split-${index + 1}`,
              accountId: accountId,
              amount: amount,
              description: split.description || editedTransaction.description || '',
              taxCode: split.taxCode || 'exempt'
            };
          });
          
          // Check if split amounts add up to transaction amount
          const totalSplitAmount = validatedSplits.reduce((sum: number, split: any) => sum + split.amount, 0);
          const transactionAmount = Math.abs(parseFloat(editedTransaction.debitAmount?.toString() || '0') || parseFloat(editedTransaction.creditAmount?.toString() || '0') || parseFloat(editedTransaction.amount?.toString() || '0') || 0);
          
          console.log('🔍 Backend split validation:', {
            totalSplitAmount,
            transactionAmount,
            isValid: Math.abs(totalSplitAmount - transactionAmount) < 0.01
          });
          
          // If amounts don't match, recalculate proportionally
          if (Math.abs(totalSplitAmount - transactionAmount) > 0.01 && totalSplitAmount > 0) {
            console.log('🔍 Recalculating backend split amounts to match transaction amount');
            console.log('🔍 Backend before recalculation:', {
              totalSplitAmount,
              transactionAmount,
              ratio: transactionAmount / totalSplitAmount
            });
            
            const ratio = transactionAmount / totalSplitAmount;
            validatedSplits.forEach((split: any) => {
              const oldAmount = split.amount;
              split.amount = Math.round(split.amount * ratio * 100) / 100; // Round to 2 decimal places
              console.log(`🔍 Backend split ${split.id}: ${oldAmount} -> ${split.amount}`);
            });
            
            const newTotal = validatedSplits.reduce((sum: number, split: any) => sum + split.amount, 0);
            console.log('🔍 Backend after recalculation:', {
              newTotal,
              transactionAmount,
              difference: Math.abs(newTotal - transactionAmount)
            });
          } else if (Math.abs(totalSplitAmount - transactionAmount) <= 0.01) {
            console.log('🔍 Backend split amounts already match transaction amount');
          } else {
            console.log('🔍 Backend cannot recalculate: totalSplitAmount is 0 or invalid');
            // If we can't recalculate, create proper default splits
            console.log('🔍 Creating proper backend default splits for transaction amount:', transactionAmount);
            const halfAmount = Math.round(transactionAmount / 2 * 100) / 100;
            const firstAccount = accounts.find(acc => acc.id === editedTransaction.accountId);
            const secondAccount = accounts.find(acc => acc.type === 'asset' && acc.id !== editedTransaction.accountId) || 
                                accounts.find(acc => acc.type === 'expense') || 
                                accounts.find(acc => acc.type === 'income');
            
            validatedSplits[0] = {
              id: '1',
              accountId: editedTransaction.accountId,
              amount: halfAmount,
              description: editedTransaction.description || '',
              taxCode: 'exempt'
            };
            
            if (validatedSplits.length > 1) {
              validatedSplits[1] = {
                id: '2',
                accountId: secondAccount?.id || null,
                amount: transactionAmount - halfAmount,
                description: editedTransaction.description || '',
                taxCode: 'exempt'
              };
            }
            
            console.log('🔍 Created backend default splits:', validatedSplits);
          }
          
          console.log('🔍 Final validated backend splits:', validatedSplits);
          console.log('🔍 Account IDs in validated splits:', validatedSplits.map((s, idx) => ({ 
            splitIndex: idx + 1,
            id: s.id, 
            accountId: s.accountId, 
            accountIdType: typeof s.accountId,
            amount: s.amount,
            taxCode: s.taxCode
          })));
          
          // Verify the account names match
          validatedSplits.forEach((split, idx) => {
            const account = accounts.find(acc => acc.id === split.accountId);
            const tax = taxSettings.find(t => t.id === split.taxCode);
            console.log(`🔍 Split ${idx + 1} verification:`, {
              splitId: split.id,
              accountId: split.accountId,
              accountName: account?.name || 'NOT FOUND',
              taxCode: split.taxCode,
              taxName: tax?.name || tax?.displayText || 'NOT FOUND',
              amount: split.amount
            });
          });
          
          // Update localStorage with fresh backend data (this overwrites stale cache)
          localStorage.setItem(`split-data-${editedTransaction.id}`, JSON.stringify({
            isSplit: true,
            splits: validatedSplits
          }));
          console.log('🔍 Updated localStorage with backend data');
          
          // Set the split state
          setIsAccountSplit(true);
          setAccountSplits(validatedSplits);
          setSplitDataLoaded(true);
          
          // Update the transaction description to show it's a split
          setEditedTransaction((prev: any) => ({
            ...prev,
            description: prev.description?.replace('Split: ', '') || prev.description
          }));
          return; // Exit early if we got data from backend
        }
      } else {
        console.warn('Split data API returned status:', response.status);
        const errorText = await response.text();
        console.warn('Error response:', errorText);
        
        // Fallback to localStorage if backend unavailable
        const cachedSplitData = localStorage.getItem(`split-data-${editedTransaction.id}`);
        if (cachedSplitData) {
          try {
            const parsedData = JSON.parse(cachedSplitData);
            console.log('🔍 Backend unavailable, using localStorage cache:', parsedData);
            if (parsedData.splits && parsedData.splits.length > 0) {
              const validatedSplits = parsedData.splits.map((split: any, index: number) => {
                const accountId = split.accountId !== undefined && split.accountId !== null 
                  ? (typeof split.accountId === 'number' ? split.accountId : parseInt(split.accountId))
                  : null;
                return {
                  id: split.id || `split-${index + 1}`,
                  accountId: accountId,
                  amount: typeof split.amount === 'number' ? split.amount : parseFloat(split.amount) || 0,
                  description: split.description || editedTransaction.description || '',
                  taxCode: split.taxCode || 'exempt'
                };
              });
              setIsAccountSplit(true);
              setAccountSplits(validatedSplits);
              setSplitDataLoaded(true);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached split data:', e);
          }
        }
      }
      
      // Fallback: Check if transaction has split data in memo or other fields
      if (editedTransaction.memo && editedTransaction.memo.includes('Split into')) {
        console.log('🔍 Found split indicator in memo, enabling split view');
        setIsAccountSplit(true);
        // Don't initialize splits here - let the category check handle it
      } else {
        console.log('🔍 No split data found, transaction is not split');
        setIsAccountSplit(false);
        setAccountSplits([]);
      }
    } catch (error) {
      console.error('Error loading split data:', error);
      // Fallback: Check if transaction has split data in memo or other fields
      if (editedTransaction.memo && editedTransaction.memo.includes('Split into')) {
        console.log('🔍 Found split indicator in memo, enabling split view');
        setIsAccountSplit(true);
      }
    }
  };

  const getMiltonSuggestion = async () => {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    setIsLoadingMilton(true);
    try {
      const response = await fetch(apiConfig.buildUrl('/api/milton/categorize-smart'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          description: editedTransaction.description,
          amount: transactionAmount,
          clientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const suggestion = result.categorization;
          setMiltonSuggestion(suggestion);
          
          // Auto-apply Milton's suggestion to pre-select account
          applyMiltonSuggestion(suggestion);
        }
      }
    } catch (error) {
      console.error('Milton suggestion error:', error);
    } finally {
      setIsLoadingMilton(false);
    }
  };

  // One-click AI categorize function
  const handleOneClickAICategorize = async () => {
    if (!editedTransaction.description) {
      toast({
        title: "Description Required",
        description: "Please add a description to enable AI categorization",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingMilton(true);
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      // Get Milton's suggestion
      const response = await fetch(apiConfig.buildUrl('/api/milton/categorize-smart'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          description: editedTransaction.description,
          amount: transactionAmount,
          clientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.categorization) {
          const suggestion = result.categorization;
          setMiltonSuggestion(suggestion);
          
          // Apply the suggestion to the transaction
          const suggestedAccount = accounts.find(acc => acc.id === suggestion.accountId);
          if (suggestedAccount) {
            // Map tax code name to tax setting ID with improved matching
            const taxCodeName = suggestion.taxCode || 'HST';
            const taxCodeId = mapTaxCodeToTaxSettingId(taxCodeName);
            
            console.log('🔍 One-click AI categorization:', {
              taxCodeFromAPI: taxCodeName,
              mappedTaxCodeId: taxCodeId,
              accountId: suggestion.accountId
            });
            
            // Apply all the AI suggestions
            const updatedTransaction = {
              ...editedTransaction,
              accountId: suggestion.accountId,
              category: suggestion.category || suggestedAccount.name,
              taxCode: taxCodeId,
              contactId: suggestion.contactId || null,
              projectId: suggestion.projectId || null,
              status: 'categorized'
            };
            
            setEditedTransaction(updatedTransaction);
            calculateHST(taxCodeId);
            
            // Automatically save the categorized transaction
            const transactionData = {
              ...updatedTransaction,
              hstCalculation
            };

            // Save the transaction using the existing save handler
            await onSave(transactionData);
            
            // Show success message with longer duration for better UX
            toast({
              title: "🤖 AI Categorization Complete!",
              description: `Transaction categorized to "${suggestedAccount.name}" with ${Math.round((suggestion.confidence || 0.8) * 100)}% confidence. Review the details and close when ready.`,
              duration: 6000, // Longer duration so users can review
            });
            
            // Let users manually close after seeing success message
            // Removed auto-close for better UX - users can review the categorization result
            
          } else {
            toast({
              title: "AI Suggestion Issue",
              description: "Could not find the suggested account. Please categorize manually.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "AI Categorization Failed",
            description: "Milton AI could not categorize this transaction. Please categorize manually.",
            variant: "destructive"
          });
        }
      } else {
        throw new Error('Failed to get AI suggestion');
      }
    } catch (error) {
      console.error('One-click AI categorization error:', error);
      toast({
        title: "AI Categorization Error",
        description: "There was an error with AI categorization. Please try again or categorize manually.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMilton(false);
      setIsProcessing(false);
    }
  };

  // Helper function to map tax code name to tax setting ID
  const mapTaxCodeToTaxSettingId = (taxCodeName: string): string => {
    if (!taxCodeName || taxSettings.length === 0) {
      return defaultTaxSetting?.id || 'exempt';
    }
    
    const normalizedTaxCode = taxCodeName.trim().toUpperCase();
    
    // Try exact match first (case-insensitive)
    let taxSetting = taxSettings.find(tax => 
      tax.name?.toUpperCase() === normalizedTaxCode
    );
    
    // Try partial match (e.g., "HST" matches "HST 13.0%")
    if (!taxSetting) {
      taxSetting = taxSettings.find(tax => 
        tax.name?.toUpperCase().startsWith(normalizedTaxCode) ||
        tax.name?.toUpperCase().includes(normalizedTaxCode) ||
        tax.displayText?.toUpperCase().includes(normalizedTaxCode)
      );
    }
    
    // Try matching common tax code patterns
    if (!taxSetting) {
      if (normalizedTaxCode === 'HST' || normalizedTaxCode === 'GST') {
        taxSetting = taxSettings.find(tax => 
          tax.name?.toUpperCase().includes('HST') || 
          tax.name?.toUpperCase().includes('GST')
        );
      }
    }
    
    if (taxSetting) {
      console.log(`✅ Mapped tax code "${taxCodeName}" to tax setting ID "${taxSetting.id}" (${taxSetting.name})`);
      return taxSetting.id;
    }
    
    console.log(`⚠️ Could not map tax code "${taxCodeName}", using default`);
    return defaultTaxSetting?.id || 'exempt';
  };

  const applyMiltonSuggestion = (suggestion: any) => {
    const suggestedAccount = accounts.find(acc => acc.id === suggestion.accountId);
    if (suggestedAccount) {
      // Map tax code name to tax setting ID with improved matching
      const taxCodeName = suggestion.taxCode || 'HST';
      const taxCodeId = mapTaxCodeToTaxSettingId(taxCodeName);
      
      console.log('🔍 Applying Milton suggestion:', {
        taxCodeFromAPI: taxCodeName,
        mappedTaxCodeId: taxCodeId,
        accountId: suggestion.accountId
      });
      
      setEditedTransaction({
        ...editedTransaction,
        accountId: suggestion.accountId,
        category: suggestion.category,
        taxCode: taxCodeId
      });
      calculateHST(taxCodeId);
    }
  };

  const calculateHST = (taxCode: string) => {
    // Find the selected tax setting
    const selectedTaxSetting = taxSettings.find(tax => tax.id === taxCode);
    
    console.log('🧮 calculateHST called - taxCode:', taxCode, 'selectedTaxSetting:', selectedTaxSetting, 'transactionAmount:', transactionAmount);
    
    if (selectedTaxSetting && selectedTaxSetting.rate > 0 && transactionAmount > 0) {
      // Tax inclusive calculation (most common for Canadian businesses)
      const netAmount = transactionAmount / (1 + selectedTaxSetting.rate);
      const taxAmount = transactionAmount - netAmount;
      
      console.log('🧮 HST Calculation:', {
        transactionAmount,
        rate: selectedTaxSetting.rate,
        netAmount,
        taxAmount
      });
      
      setHstCalculation({
        netAmount: netAmount.toFixed(2),
        hstAmount: taxAmount.toFixed(2),
        hstAccountId: selectedTaxSetting.accountId,
        hstAccountName: selectedTaxSetting.name,
        taxRate: selectedTaxSetting.rate,
        taxName: selectedTaxSetting.name
      });
    } else if (taxCode === 'exempt') {
      console.log('🧮 Tax code is exempt, clearing HST calculation');
      setHstCalculation(null);
    } else {
      console.log('🧮 No valid tax setting found or amount is 0, clearing HST calculation');
      setHstCalculation(null);
    }
  };

  const calculateHSTAmount = async (amount: number, taxCode: string) => {
    const selectedTaxSetting = taxSettings.find(tax => tax.id === taxCode);
    
    if (selectedTaxSetting && selectedTaxSetting.rate > 0) {
      const netAmount = amount / (1 + selectedTaxSetting.rate);
      const taxAmount = amount - netAmount;
      
      return {
        netAmount: parseFloat(netAmount.toFixed(2)),
        hstAmount: parseFloat(taxAmount.toFixed(2)),
        totalAmount: amount,
        hstAccountId: selectedTaxSetting.accountId,
        hstAccountName: selectedTaxSetting.name,
        taxRate: selectedTaxSetting.rate,
        taxName: selectedTaxSetting.name
      };
    }
    return null;
  };

  const validateAccountSplits = () => {
    const errors: string[] = [];
    
    if (accountSplits.length === 0) {
      errors.push('At least one split is required');
      return errors;
    }
    
    // Check each split has required fields
    accountSplits.forEach((split, index) => {
      if (!split.accountId) {
        errors.push(`Split ${index + 1}: Account is required`);
      }
      if (split.amount <= 0) {
        errors.push(`Split ${index + 1}: Amount must be greater than 0`);
      }
    });
    
    // Check total amount matches
    const totalSplitAmount = accountSplits.reduce((sum, split) => sum + split.amount, 0);
    const difference = Math.abs(totalSplitAmount - transactionAmount);
    if (difference > 0.01) {
      errors.push(`Split amounts total $${totalSplitAmount.toFixed(2)} but transaction amount is $${transactionAmount.toFixed(2)}`);
    }
    
    return errors;
  };

  const saveSplitTransaction = async (transactionData: any) => {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(apiConfig.buildUrl('/api/transactions/classification/save-split'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        transactionId: transactionData.id,
        splits: transactionData.splits,
        clientId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save split transaction');
    }
    
    return response.json();
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      // Clear previous validation errors
      setSplitValidationErrors([]);
      
      // Handle account split scenario
      if (isAccountSplit) {
        // Validate splits
        const validationErrors = validateAccountSplits();
        if (validationErrors.length > 0) {
          setSplitValidationErrors(validationErrors);
          toast({
            title: "Validation Error",
            description: validationErrors.join('; '),
            variant: "destructive"
          });
          return;
        }

        // Send original split amounts to backend - backend validation requires splits to total transaction amount
        // The backend will handle HST calculation per split if taxCode is provided
        const splitsToSave = accountSplits.map(split => ({
          ...split,
          // Keep original amount - backend expects splits to total the original transaction amount
          amount: split.amount,
          taxCode: split.taxCode || 'exempt'
        }));
        
        const totalSplitAmount = splitsToSave.reduce((sum, s) => sum + s.amount, 0);
        console.log('🔍 Saving split transaction:', {
          originalSplits: accountSplits.map(s => ({ id: s.id, accountId: s.accountId, amount: s.amount, taxCode: s.taxCode })),
          splitsToSave: splitsToSave.map(s => ({ id: s.id, accountId: s.accountId, amount: s.amount, taxCode: s.taxCode })),
          transactionAmount: transactionAmount,
          totalSplitAmount: totalSplitAmount,
          difference: Math.abs(totalSplitAmount - transactionAmount)
        });

        // Validate before sending to avoid backend error
        if (Math.abs(totalSplitAmount - transactionAmount) > 0.01) {
          toast({
            title: "Split Amount Mismatch",
            description: `Split amounts total $${totalSplitAmount.toFixed(2)} but transaction amount is $${transactionAmount.toFixed(2)}. Please adjust split amounts.`,
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }

        // Save split transaction
        const splitTransactionData = {
          ...editedTransaction,
          splits: splitsToSave, // Send original amounts - backend will handle HST per split based on taxCode
          isAccountSplit: true,
          status: 'categorized'
        };

        // Cache the split data in localStorage
        const splitData = {
          isSplit: true,
          splits: accountSplits
        };
        localStorage.setItem(`split-data-${editedTransaction.id}`, JSON.stringify(splitData));

        // Also store split data in transaction memo for backend reconstruction
        // Format: "Split into N accounts: accountId:amount:taxCode, accountId:amount:taxCode"
        const updatedTransaction = {
          ...splitTransactionData,
          memo: `Split into ${accountSplits.length} accounts: ${accountSplits.map(s => `${s.accountId}:${s.amount}:${s.taxCode || 'exempt'}`).join(', ')}`
        };

        await saveSplitTransaction(updatedTransaction);
      } else {
        // Regular single-account transaction
        if (!editedTransaction.accountId) {
          toast({
            title: "Account Required",
            description: "Please select an account for this transaction",
            variant: "destructive"
          });
          return;
        }

        // Create transaction data
        const transactionData = {
          ...editedTransaction,
          hstCalculation,
          status: 'categorized'
        };

        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Try the enhanced save first, fallback to simple save if it fails
        let savedTransactionId = transaction.id; // Use existing ID if available
        try {
          await onSave(transactionData);
          // If transaction was just created, we might need to get the ID from the response
          // For now, we'll use the existing transaction.id which should be available
        } catch (enhancedError) {
          console.log('Enhanced save failed, trying simple save:', enhancedError);
          
          // Fallback to simple save endpoint
          const response = await fetch(apiConfig.buildUrl('/api/transactions/classification/save'), {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              transaction: transactionData,
              clientId
            })
          });
          
          if (!response.ok) {
            throw new Error('Simple save also failed');
          }
          
          const result = await response.json();
          console.log('Simple save successful:', result);
          // Update savedTransactionId if we got a new ID from the response
          if (result.transaction?.id) {
            savedTransactionId = result.transaction.id;
          }
        }

        // Link bill if checkbox is checked and bill match exists (AFTER save to ensure we have transaction ID)
        if (linkBill && billMatch?.bill && selectedBillId && savedTransactionId) {
          try {
            // Find the selected bill from all matches
            const selectedBill = billMatch.allMatches?.find(m => m.bill.id === selectedBillId) || billMatch;
            const billToLink = selectedBill.bill;
            
            const token = localStorage.getItem('authToken');
            const headers: HeadersInit = {
              'Content-Type': 'application/json'
            };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            // Record bill payment and link to transaction
            const transactionAmount = Math.abs(
              parseFloat(transaction.debitAmount || 0) || 
              parseFloat(transaction.creditAmount || 0)
            );
            const billAmount = parseFloat(billToLink.totalAmount || 0);
            const paymentAmount = Math.min(transactionAmount, billAmount);

            const paymentResponse = await fetch(
              apiConfig.buildUrl(`/api/crm/bill/${billToLink.id}/payment`),
              {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                  amount: paymentAmount,
                  paymentDate: new Date(transaction.transactionDate || transaction.date || new Date()).toISOString().split('T')[0],
                  paymentMethod: 'bank_transfer',
                  reference: `Transaction ${savedTransactionId}`,
                  notes: '', // Let backend handle notes with transactionId
                  transactionId: savedTransactionId
                })
              }
            );

            if (paymentResponse.ok) {
              console.log('✅ Bill payment recorded and linked to transaction');
              toast({
                title: "Bill Linked",
                description: `Bill ${billToLink.billNumber} marked as paid and linked to transaction`,
              });
              // Invalidate bills query to refresh bill status
              queryClient.invalidateQueries({ queryKey: ["bills", clientId] });
            } else {
              const errorText = await paymentResponse.text();
              console.error('Failed to link bill:', errorText);
              toast({
                title: "Bill Linking Failed",
                description: `Failed to link bill: ${errorText}`,
                variant: "destructive"
              });
            }
          } catch (billError) {
            console.error('Error linking bill:', billError);
            // Don't fail the transaction save if bill linking fails
            toast({
              title: "Bill Linking Failed",
              description: "Transaction saved but bill could not be linked. You can link it manually later.",
              variant: "destructive"
            });
          }
        }

        // Link invoice if checkbox is checked and invoice match exists (AFTER save to ensure we have transaction ID)
        if (linkInvoice && invoiceMatch?.invoice && selectedInvoiceId && savedTransactionId) {
          try {
            // Find the selected invoice from all matches
            const selectedInvoice = invoiceMatch.allMatches?.find(m => m.invoice.id === selectedInvoiceId) || invoiceMatch;
            const invoiceToLink = selectedInvoice.invoice;
            
            const token = localStorage.getItem('authToken');
            const headers: HeadersInit = {
              'Content-Type': 'application/json'
            };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            // Record invoice payment and link to transaction
            const transactionAmount = Math.abs(
              parseFloat(transaction.debitAmount || 0) || 
              parseFloat(transaction.creditAmount || 0)
            );
            const invoiceAmount = parseFloat(invoiceToLink.totalAmount || 0);
            const paymentAmount = Math.min(transactionAmount, invoiceAmount);

            const paymentResponse = await fetch(
              apiConfig.buildUrl(`/api/crm/invoice/${invoiceToLink.id}/payment`),
              {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                  amount: paymentAmount,
                  paymentDate: new Date(transaction.transactionDate || transaction.date || new Date()).toISOString().split('T')[0],
                  paymentMethod: 'bank_transfer',
                  transactionId: savedTransactionId
                })
              }
            );

            if (paymentResponse.ok) {
              console.log('✅ Invoice payment recorded and linked to transaction');
              toast({
                title: "Invoice Linked",
                description: `Invoice ${invoiceToLink.invoiceNumber} marked as paid and linked to transaction`,
              });
              // Invalidate invoices query to refresh invoice status
              queryClient.invalidateQueries({ queryKey: ["invoices", clientId] });
            } else {
              const errorText = await paymentResponse.text();
              console.error('Failed to link invoice:', errorText);
              toast({
                title: "Invoice Linking Failed",
                description: `Failed to link invoice: ${errorText}`,
                variant: "destructive"
              });
            }
          } catch (invoiceError) {
            console.error('Error linking invoice:', invoiceError);
            // Don't fail the transaction save if invoice linking fails
            toast({
              title: "Invoice Linking Failed",
              description: "Transaction saved but invoice could not be linked. You can link it manually later.",
              variant: "destructive"
            });
          }
        }
      }
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/journal-entries`, clientId] });
      
      toast({
        title: "Transaction Saved",
        description: isAccountSplit 
          ? `Transaction split into ${accountSplits.length} accounts with HST calculations`
          : "Transaction has been successfully categorized with HST calculation",
      });
      
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Could not save transaction classification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadRules = async () => {
    try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

      const response = await fetch(apiConfig.buildUrl(`/api/rules?clientId=${clientId}`), {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setRules(data.rules || []);
          // Auto-apply matching rules after loading
          checkAndApplyMatchingRules(data.rules || []);
        }
      } else {
        console.warn('Rules API returned status:', response.status);
      }
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const checkAndApplyMatchingRules = (rulesToCheck: any[]) => {
    if (!editedTransaction.description || rulesToCheck.length === 0) return;
    
    const description = editedTransaction.description.toLowerCase();
    
    // Find the first matching rule
    const matchingRule = rulesToCheck.find(rule => {
      const pattern = rule.pattern?.toLowerCase() || '';
      const matchType = rule.match_type || 'contains';
      
      switch (matchType) {
        case 'contains':
          return description.includes(pattern);
        case 'exact':
          return description === pattern;
        case 'starts_with':
          return description.startsWith(pattern);
        default:
          return description.includes(pattern);
      }
    });
    
    if (matchingRule) {
      // Use default tax setting since rules don't store tax codes directly
      const taxCodeId = defaultTaxSetting?.id || 'exempt';
      
      setEditedTransaction({
        ...editedTransaction,
        accountId: matchingRule.account_id,
        taxCode: taxCodeId,
        memo: editedTransaction.memo,
        category: accounts.find(acc => acc.id === matchingRule.account_id)?.name || 'Uncategorized'
      });
      
      calculateHST(taxCodeId);
      
      toast({
        title: "Rule Auto-Applied",
        description: `Applied rule: ${matchingRule.name}`,
      });
    }
  };

  const applyRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === parseInt(ruleId));
    if (rule) {
      // Map tax code name to tax setting ID
      const taxCodeName = rule.tax_code;
      const taxSetting = taxCodeName ? taxSettings.find(tax => tax.name === taxCodeName) : null;
      const taxCodeId = taxSetting?.id || editedTransaction.taxCode || defaultTaxSetting?.id || 'exempt';
      
      setEditedTransaction({
        ...editedTransaction,
        accountId: rule.account_id,
        taxCode: taxCodeId,
        memo: rule.memo || editedTransaction.memo,
        category: accounts.find(acc => acc.id === rule.account_id)?.name || 'General'
      });
      
      calculateHST(taxCodeId);
      
      toast({
        title: "Rule Applied",
        description: `Applied rule: ${rule.rule_name}`,
      });
    }
  };

  const createRule = async (ruleData: any) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl('/api/rules'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ...ruleData,
          clientId,
          accountId: editedTransaction.accountId,
          taxCode: taxSettings.find(tax => tax.id === editedTransaction.taxCode)?.name || 'HST'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setRules([...rules, result.rule]);
        setShowCreateRuleDialog(false);
        toast({
          title: "Rule Created",
          description: `New rule '${ruleData.ruleName}' has been created`,
        });
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Error",
        description: "Could not create rule",
        variant: "destructive"
      });
    }
  };

  const createNewContact = async (contactData: any) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/contacts`), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          ...contactData,
          clientId,
          type: newContactType
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        const newContact = responseData.data; // Backend returns contact in data field
        
        if (newContactType === 'customer') {
          setCustomers([...customers, newContact]);
        } else {
          setVendors([...vendors, newContact]);
        }
        
        setEditedTransaction({
          ...editedTransaction,
          contactId: newContact.id,
          contactType: newContactType
        });
        
        setShowNewContactDialog(false);
        toast({
          title: "Contact Created",
          description: `New ${newContactType} has been created and linked to this transaction`,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error Creating Contact",
          description: errorData.error || `Failed to create ${newContactType}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: "Could not create new contact",
        variant: "destructive"
      });
    }
  };

  const createNewProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/projects/${clientId}`), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: '',
          status: 'active'
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        const newProject = responseData.data; // Backend returns project in data field
        
        setProjects([...projects, newProject]);
        setEditedTransaction({
          ...editedTransaction,
          projectId: newProject.id
        });
        setShowNewProjectDialog(false);
        setNewProjectName('');
        toast({
          title: "Project Created",
          description: `Project '${newProjectName}' has been created and assigned to this transaction`,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error Creating Project",
          description: errorData.message || "Failed to create project",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Could not create project",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('transactionId', editedTransaction.id.toString());
        formData.append('clientId', clientId.toString());

        const response = await fetch(apiConfig.buildUrl(`/api/transactions/${editedTransaction.id}/attachments`), {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include'
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
            if (result.success) {
              // Add the new attachment to the list
              setAttachments(prev => [...prev, result.attachment]);
            }
          }
        } else {
          console.error(`Failed to upload ${file.name}:`, response.status);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          });
        }
      }

      // Invalidate attachments query
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${editedTransaction.id}/attachments`] });
      
      toast({
        title: "Files Uploaded",
        description: `Successfully uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Error",
        description: "Could not upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingFiles(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-2">
      {/* Mobile-Friendly Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isMoneyIn ? 'bg-green-100' : 'bg-red-100'}`}>
            {isMoneyIn ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">
              {editedTransaction.description || 'Transaction'}
            </h3>
            <p className={`text-lg font-semibold ${isMoneyIn ? 'text-green-600' : 'text-red-600'}`}>
              ${transactionAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* One-Click AI Categorize Button */}
          <Button 
            onClick={handleOneClickAICategorize}
            disabled={isLoadingMilton || isProcessing || !editedTransaction.description}
            className="h-9 px-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            data-testid="button-ai-categorize"
          >
            {isLoadingMilton || isProcessing ? (
              <>
                <Brain className="h-4 w-4 mr-1 animate-pulse" />
                <span className="text-xs sm:text-sm">Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                <span className="text-xs sm:text-sm font-semibold">🤖 AI Categorize</span>
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 transition-colors" 
            data-testid="button-close-card"
            title="Close categorization panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile-Optimized Linear Layout */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Row 1: Description (Full Width) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Input
              value={editedTransaction.description || ''}
              onChange={(e) => setEditedTransaction({
                ...editedTransaction,
                description: e.target.value
              })}
              placeholder="Transaction description"
              className="text-sm h-10"
              data-testid="input-description"
            />
          </div>

          {/* Row 2: Account Selection with Enhanced AI Integration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Account</Label>
              {isLoadingMilton && (
                <div className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-xs text-blue-600">AI analyzing...</span>
                </div>
              )}
              {miltonSuggestion && miltonSuggestion.accountId && (
                <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">AI Recommended</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 text-xs px-1 py-0">
                    {Math.round((miltonSuggestion.confidence || 0.8) * 100)}%
                  </Badge>
                </div>
              )}
            </div>
            <AccountDropdown
              clientId={clientId}
              value={editedTransaction.accountId?.toString() || ''}
              onValueChange={(value) => {
                const accountId = parseInt(value);
                const selectedAccount = accounts.find(acc => acc.id === accountId);
                setEditedTransaction({
                  ...editedTransaction,
                  accountId,
                  category: selectedAccount?.name || 'Uncategorized'
                });
              }}
              placeholder="Select account"
              className="text-sm h-10"
              searchable={true}
              showAccountNumbers={true}
              groupByType={true}
              showAccountTypes={false}
              compact={false}
              zIndex={9999}
            />
            
            {/* Account Split Toggle */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="account-split"
                  checked={isAccountSplit}
                  onChange={(e) => {
                    setIsAccountSplit(e.target.checked);
                    if (e.target.checked && accountSplits.length === 0) {
                      // Initialize with two splits
                      setAccountSplits([
                        {
                          id: '1',
                          accountId: editedTransaction.accountId,
                          amount: Math.round(transactionAmount * 0.7 * 100) / 100,
                          description: editedTransaction.description || '',
                          taxCode: editedTransaction.taxCode || defaultTaxSetting?.id || 'HST'
                        },
                        {
                          id: '2',
                          accountId: null,
                          amount: Math.round(transactionAmount * 0.3 * 100) / 100,
                          description: editedTransaction.description || '',
                          taxCode: editedTransaction.taxCode || defaultTaxSetting?.id || 'HST'
                        }
                      ]);
                    }
                  }}
                  className="rounded border-gray-300"
                  data-testid="checkbox-account-split"
                />
                <Label htmlFor="account-split" className="text-sm font-medium cursor-pointer">
                  Split across multiple accounts
                </Label>
              </div>
              {isAccountSplit && (
                <Badge variant="outline" className="text-xs">
                  {accountSplits.length} splits
                </Badge>
              )}
            </div>
          </div>

          {/* Account Splits Interface */}
          {isAccountSplit && (
            <div className="space-y-3 border border-blue-200 rounded-lg p-3 bg-blue-50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-blue-800">Account Splits</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newSplit = {
                      id: Date.now().toString(),
                      accountId: null,
                      amount: 0,
                      description: editedTransaction.description || '',
                      taxCode: defaultTaxSetting?.id || 'HST'
                    };
                    setAccountSplits([...accountSplits, newSplit]);
                  }}
                  className="h-8 px-2 text-xs"
                  data-testid="button-add-split"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Split
                </Button>
              </div>
              
              {accountSplits.map((split, index) => (
                <div key={split.id} className="bg-white border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">Split {index + 1}</span>
                    {accountSplits.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAccountSplits(accountSplits.filter(s => s.id !== split.id));
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        data-testid={`button-remove-split-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Account</Label>
                      <Select
                        value={split.accountId !== null && split.accountId !== undefined ? String(split.accountId) : ''}
                        onValueChange={(value) => {
                          console.log(`🔍 Split ${index + 1} account changed from ${split.accountId} to ${value}`);
                          const updatedSplits = accountSplits.map(s => 
                            s.id === split.id 
                              ? { ...s, accountId: parseInt(value) }
                              : s
                          );
                          console.log('🔍 Updated splits:', updatedSplits.map(s => ({ id: s.id, accountId: s.accountId })));
                          setAccountSplits(updatedSplits);
                        }}
                      >
                        <SelectTrigger className="text-xs h-8" data-testid={`select-split-account-${index}`}>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {['income', 'expense', 'asset', 'liability', 'equity'].map(type => {
                            const typeAccounts = accounts.filter(acc => acc.type === type);
                            if (typeAccounts.length === 0) return null;
                            
                            return (
                              <div key={type}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                                  {type} Accounts
                                </div>
                                {typeAccounts.map(account => (
                                  <SelectItem key={account.id} value={account.id.toString()}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </div>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          type="number"
                          value={split.amount}
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value) || 0;
                            const updatedSplits = accountSplits.map(s => 
                              s.id === split.id 
                                ? { ...s, amount: newAmount }
                                : s
                            );
                            setAccountSplits(updatedSplits);
                          }}
                          className="pl-6 text-xs h-8"
                          placeholder="0.00"
                          data-testid={`input-split-amount-${index}`}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Tax Code</Label>
                      {isLoadingTaxSettings ? (
                        <div className="flex items-center justify-center h-8 border rounded-md bg-muted text-muted-foreground text-xs">
                          Loading...
                        </div>
                      ) : taxSettings.length > 0 ? (
                        <Select
                          value={split.taxCode || defaultTaxSetting?.id || 'exempt'}
                          onValueChange={(value) => {
                            console.log(`🔍 Split ${index + 1} tax code changed from ${split.taxCode} to ${value}`);
                            const updatedSplits = accountSplits.map(s => 
                              s.id === split.id 
                                ? { ...s, taxCode: value }
                                : s
                            );
                            setAccountSplits(updatedSplits);
                          }}
                        >
                          <SelectTrigger className="text-xs h-8" data-testid={`select-split-tax-${index}`}>
                            <SelectValue placeholder="Select tax code" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            {taxSettings.map((tax) => (
                              <SelectItem key={tax.id} value={tax.id}>
                                {tax.displayText || tax.name || `Tax ${tax.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center justify-center h-8 border rounded-md bg-muted text-muted-foreground text-xs">
                          Tax settings not configured
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={split.description}
                      onChange={(e) => {
                        const updatedSplits = accountSplits.map(s => 
                          s.id === split.id 
                            ? { ...s, description: e.target.value }
                            : s
                        );
                        setAccountSplits(updatedSplits);
                      }}
                      className="text-xs h-8"
                      placeholder="Description for this split"
                      data-testid={`input-split-description-${index}`}
                    />
                  </div>
                  
                  {/* Tax Calculation for this split */}
                  {split.taxCode && split.amount > 0 && (() => {
                    const selectedTaxSetting = taxSettings.find(tax => tax.id === split.taxCode);
                    if (selectedTaxSetting && selectedTaxSetting.rate > 0) {
                      const netAmount = split.amount / (1 + selectedTaxSetting.rate);
                      const taxAmount = split.amount - netAmount;
                      
                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded p-2">
                          <div className="text-xs font-medium text-gray-700 mb-1">Tax Calculation</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <div className="text-gray-500">Net Amount</div>
                              <div className="font-medium">${netAmount.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">Tax ({selectedTaxSetting.rate * 100}%)</div>
                              <div className="font-medium text-blue-600">${taxAmount.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">Total</div>
                              <div className="font-medium">${split.amount.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
              
              <div className="mt-2 p-2 bg-white rounded border">
                <div className="text-xs text-gray-600 mb-1">Split Summary:</div>
                <div className="flex justify-between text-xs">
                  <span>Total Split Amount: ${accountSplits.reduce((sum, split) => sum + split.amount, 0).toFixed(2)}</span>
                  <span className={accountSplits.reduce((sum, split) => sum + split.amount, 0) === transactionAmount ? 'text-green-600' : 'text-red-600'}>
                    Original: ${transactionAmount.toFixed(2)}
                  </span>
                </div>
                {Math.abs(accountSplits.reduce((sum, split) => sum + split.amount, 0) - transactionAmount) > 0.01 && (
                  <div className="text-xs text-red-600 mt-1">
                    ⚠️ Split amounts don't match original transaction amount
                  </div>
                )}
                
                {/* Tax Summary */}
                {(() => {
                  const totalTaxAmount = accountSplits.reduce((sum, split) => {
                    const selectedTaxSetting = taxSettings.find(tax => tax.id === split.taxCode);
                    if (selectedTaxSetting && selectedTaxSetting.rate > 0 && split.amount > 0) {
                      const netAmount = split.amount / (1 + selectedTaxSetting.rate);
                      return sum + (split.amount - netAmount);
                    }
                    return sum;
                  }, 0);
                  
                  const totalNetAmount = accountSplits.reduce((sum, split) => {
                    const selectedTaxSetting = taxSettings.find(tax => tax.id === split.taxCode);
                    if (selectedTaxSetting && selectedTaxSetting.rate > 0 && split.amount > 0) {
                      const netAmount = split.amount / (1 + selectedTaxSetting.rate);
                      return sum + netAmount;
                    }
                    return sum + split.amount;
                  }, 0);
                  
                  if (totalTaxAmount > 0) {
                    return (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs font-medium text-gray-700 mb-1">Tax Summary:</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-gray-500">Total Net</div>
                            <div className="font-medium">${totalNetAmount.toFixed(2)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">Total Tax</div>
                            <div className="font-medium text-blue-600">${totalTaxAmount.toFixed(2)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">Total Amount</div>
                            <div className="font-medium">${(totalNetAmount + totalTaxAmount).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}

          {/* Row 3: Amount & Tax on same line (hidden when splitting) */}
          {!isAccountSplit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => {
                    const newAmount = parseFloat(e.target.value) || 0;
                    setEditedTransaction({
                      ...editedTransaction,
                      amount: isMoneyIn ? newAmount : -newAmount,
                      debitAmount: isMoneyIn ? newAmount : 0,
                      creditAmount: isMoneyOut ? newAmount : 0
                    });
                  }}
                  className="pl-10 text-sm h-10"
                  placeholder="0.00"
                  data-testid="input-amount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tax Code</Label>
              {isLoadingTaxSettings ? (
                <div className="flex items-center justify-center h-10 border rounded-md bg-muted text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : taxSettings.length > 0 ? (
                <Select
                  value={editedTransaction.taxCode || (defaultTaxSetting && defaultTaxSetting.id !== 'exempt' ? defaultTaxSetting.id : 'exempt')}
                  onValueChange={(value) => {
                    console.log('Tax code dropdown changed to:', value);
                    console.log('Current editedTransaction.taxCode:', editedTransaction.taxCode);
                    console.log('defaultTaxSetting?.id:', defaultTaxSetting?.id);
                    setEditedTransaction({
                      ...editedTransaction,
                      taxCode: value
                    });
                    calculateHST(value);
                  }}
                >
                  <SelectTrigger className="text-sm h-10" data-testid="select-tax">
                    <SelectValue placeholder="Tax" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {taxSettings.map((tax) => {
                      console.log('🔍 Rendering tax option:', tax);
                      return (
                        <SelectItem key={tax.id} value={tax.id}>
                          {tax.displayText || tax.name || `Tax ${tax.id}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-col items-start justify-center min-h-10 p-2 border rounded-md bg-muted text-muted-foreground text-xs">
                  <div>Tax settings not configured</div>
                  <div className="mt-1 text-xs opacity-75">
                    Length: {taxSettings.length} | Loading: {isLoadingTaxSettings ? 'Yes' : 'No'}
                  </div>
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-1 text-xs opacity-50">
                      Check browser console for API response details
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Row 4: Rules with Enhanced Indicators */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Quick Rules</Label>
              {(() => {
                // Check if any rule matches current transaction description
                const matchingRule = rules.find(rule => {
                  const description = editedTransaction.description?.toLowerCase() || '';
                  const pattern = rule.pattern?.toLowerCase() || '';
                  switch (rule.match_type) {
                    case 'exact':
                      return description === pattern;
                    case 'starts_with':
                      return description.startsWith(pattern);
                    case 'contains':
                    default:
                      return description.includes(pattern);
                  }
                });
                
                if (matchingRule) {
                  return (
                    <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                      <div className="h-3 w-3 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">R</span>
                      </div>
                      <span className="text-xs font-medium text-orange-700">Rule Match: {matchingRule.rule_name}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex gap-2">
              <Select value={selectedRule} onValueChange={(value) => {
                setSelectedRule(value);
                if (value) {
                  applyRule(value);
                }
              }} data-testid="select-rule">
                <SelectTrigger className="text-sm h-10 flex-1">
                  <SelectValue placeholder="Apply rule" />
                </SelectTrigger>
                <SelectContent>
                  {rules.length === 0 ? (
                    <SelectItem value="none" disabled>No rules available</SelectItem>
                  ) : (
                    rules.map(rule => {
                      // Check if this rule matches current transaction
                      const description = editedTransaction.description?.toLowerCase() || '';
                      const pattern = rule.pattern?.toLowerCase() || '';
                      let isMatch = false;
                      switch (rule.match_type) {
                        case 'exact':
                          isMatch = description === pattern;
                          break;
                        case 'starts_with':
                          isMatch = description.startsWith(pattern);
                          break;
                        case 'contains':
                        default:
                          isMatch = description.includes(pattern);
                      }
                      
                      return (
                        <SelectItem 
                          key={rule.id} 
                          value={rule.id.toString()}
                          className={isMatch ? "bg-orange-50 border-l-4 border-orange-400" : ""}
                        >
                          <div className="flex items-center gap-2">
                            {isMatch && (
                              <div className="h-3 w-3 bg-orange-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">R</span>
                              </div>
                            )}
                            <span className={isMatch ? "font-medium text-orange-800" : ""}>{rule.rule_name}</span>
                            {isMatch && (
                              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">Match</Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 px-3"
                onClick={() => setShowCreateRuleDialog(true)}
                data-testid="button-create-rule"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* HST Calculation */}
          {hstCalculation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">HST Calculation</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Net Amount</div>
                  <div className="font-medium">${hstCalculation.netAmount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">HST Tax</div>
                  <div className="font-medium">${hstCalculation.hstAmount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">HST Account</div>
                  <div className="font-medium text-xs">{hstCalculation.hstAccountName}</div>
                </div>
              </div>
            </div>
          )}

          {/* Row 5: Vendor/Customer and Project on same line */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{isMoneyIn ? 'Customer' : 'Vendor'}</Label>
              <Select
                value={editedTransaction.contactId?.toString() || ''}
                onValueChange={(value) => {
                  if (value === 'new') {
                    setNewContactType(isMoneyIn ? 'customer' : 'vendor');
                    setShowNewContactDialog(true);
                  } else {
                    setEditedTransaction({
                      ...editedTransaction,
                      contactId: parseInt(value) || null,
                      contactType: isMoneyIn ? 'customer' : 'vendor'
                    });
                  }
                }}
              >
                <SelectTrigger className="text-sm h-10" data-testid="select-contact">
                  <SelectValue placeholder={`Select ${isMoneyIn ? 'customer' : 'vendor'}`}>
                    {editedTransaction.contactId ? 
                      (isMoneyIn ? customers : vendors).find(contact => contact.id === editedTransaction.contactId)?.name || "Unknown contact" 
                      : `Select ${isMoneyIn ? 'customer' : 'vendor'}`
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create New {isMoneyIn ? 'Customer' : 'Vendor'}
                    </div>
                  </SelectItem>
                  {(isMoneyIn ? customers : vendors).map(contact => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {contact.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Project</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setShowNewProjectDialog(true)}
                  data-testid="button-add-project"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={editedTransaction.projectId?.toString() || ''}
                onValueChange={(value) => {
                  setEditedTransaction({
                    ...editedTransaction,
                    projectId: value === "0" ? null : parseInt(value)
                  });
                }}
              >
                <SelectTrigger className="text-sm h-10" data-testid="select-project">
                  <SelectValue placeholder="No project">
                    {editedTransaction.projectId ? 
                      projects.find(proj => proj.id === editedTransaction.projectId)?.name || "Unknown project" 
                      : "No project"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Project</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5.5: Location and Class */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Location</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setShowNewLocationDialog(true)}
                  data-testid="button-add-location"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={editedTransaction.locationId?.toString() || ''}
                onValueChange={(value) => {
                  setEditedTransaction({
                    ...editedTransaction,
                    locationId: value === "0" ? null : parseInt(value)
                  });
                }}
              >
                <SelectTrigger className="text-sm h-10" data-testid="select-location">
                  <SelectValue placeholder="No location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Location</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Class/Department</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setShowNewClassDialog(true)}
                  data-testid="button-add-class"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={editedTransaction.classId?.toString() || ''}
                onValueChange={(value) => {
                  setEditedTransaction({
                    ...editedTransaction,
                    classId: value === "0" ? null : parseInt(value)
                  });
                }}
              >
                <SelectTrigger className="text-sm h-10" data-testid="select-class">
                  <SelectValue placeholder="No class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Class</SelectItem>
                  {classes.map(classItem => (
                    <SelectItem key={classItem.id} value={classItem.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {classItem.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6: Attachments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachments</Label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                id="attachment-upload"
                onChange={handleFileUpload}
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('attachment-upload')?.click()}
                className="h-10 px-4"
                disabled={isUploadingFiles}
                data-testid="button-upload"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploadingFiles ? 'Uploading...' : 'Upload Files'}
              </Button>
              {attachments.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
                </span>
              )}
            </div>
          </div>

          {/* Row 7: Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <textarea
              className="w-full h-20 p-3 border rounded-md resize-none text-sm"
              placeholder="Additional notes for this transaction..."
              value={editedTransaction.memo || ''}
              onChange={(e) => setEditedTransaction({
                ...editedTransaction,
                memo: e.target.value
              })}
              data-testid="textarea-notes"
            />
          </div>

          {/* Row 8: Bill Match Section */}
          {billMatch && (
            <div className="space-y-2 p-4 bg-purple-50 border border-purple-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-purple-600" />
                <Label className="text-sm font-medium text-purple-900">
                  {billMatch.allMatches && billMatch.allMatches.length > 1 
                    ? `Matched Bills (${billMatch.allMatches.length})` 
                    : 'Matched Bill'}
                </Label>
              </div>
              
              {/* Show all matching bills if multiple */}
              {billMatch.allMatches && billMatch.allMatches.length > 1 ? (
                <div className="space-y-3">
                  <p className="text-xs text-purple-700 mb-2">
                    Multiple bills match this transaction. Select which one to link:
                  </p>
                  {billMatch.allMatches.map((match, index) => (
                    <div
                      key={match.bill.id}
                      className={`p-3 rounded-md border-2 cursor-pointer transition-all ${
                        selectedBillId === match.bill.id
                          ? 'border-purple-500 bg-purple-100'
                          : 'border-purple-200 bg-white hover:border-purple-300'
                      }`}
                      onClick={() => {
                        setSelectedBillId(match.bill.id);
                        setLinkBill(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="selected-bill"
                            checked={selectedBillId === match.bill.id}
                            onChange={() => {
                              setSelectedBillId(match.bill.id);
                              setLinkBill(true);
                            }}
                            className="h-4 w-4 text-purple-600"
                          />
                          <span className="font-medium text-sm">{match.bill.billNumber}</span>
                        </div>
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                          {match.score}% match
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs ml-6">
                        {match.contact && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vendor:</span>
                            <span className="font-medium">{match.contact.name || match.contact.companyName}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">${parseFloat(match.bill.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">
                            {new Date(match.bill.billDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={match.bill.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {match.bill.status || 'draft'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Single match - show details
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                      {billMatch.score}% match
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill Number:</span>
                    <span className="font-medium">{billMatch.bill.billNumber}</span>
                  </div>
                  {billMatch.contact && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span className="font-medium">{billMatch.contact.name || billMatch.contact.companyName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill Amount:</span>
                    <span className="font-medium">${parseFloat(billMatch.bill.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill Date:</span>
                    <span className="font-medium">
                      {new Date(billMatch.bill.billDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={billMatch.bill.status === 'paid' ? 'default' : 'secondary'}>
                      {billMatch.bill.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-purple-300">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="link-bill"
                    checked={linkBill && selectedBillId !== null}
                    onChange={(e) => {
                      setLinkBill(e.target.checked);
                      if (e.target.checked && !selectedBillId) {
                        // Auto-select the best match if none selected
                        setSelectedBillId(billMatch.bill.id);
                      }
                    }}
                    className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    data-testid="checkbox-link-bill"
                  />
                  <Label htmlFor="link-bill" className="text-sm font-medium text-purple-900 cursor-pointer">
                    Link this transaction to {billMatch.allMatches && billMatch.allMatches.length > 1 ? 'selected bill' : 'bill'} and mark as paid
                  </Label>
                </div>
                <p className="text-xs text-purple-700 mt-1 ml-6">
                  When saved, the bill will be marked as paid and linked to this transaction
                </p>
              </div>
            </div>
          )}

          {/* Row 9: Invoice Match Section (for positive transactions/income) */}
          {invoiceMatch && (
            <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-medium text-green-900">
                  {invoiceMatch.allMatches && invoiceMatch.allMatches.length > 1 
                    ? `Matched Invoices (${invoiceMatch.allMatches.length})` 
                    : 'Matched Invoice'}
                </Label>
              </div>
              
              {/* Show all matching invoices if multiple */}
              {invoiceMatch.allMatches && invoiceMatch.allMatches.length > 1 ? (
                <div className="space-y-3">
                  <p className="text-xs text-green-700 mb-2">
                    Multiple invoices match this transaction. Select which one to link:
                  </p>
                  {invoiceMatch.allMatches.map((match, index) => (
                    <div
                      key={match.invoice.id}
                      className={`p-3 rounded-md border-2 cursor-pointer transition-all ${
                        selectedInvoiceId === match.invoice.id
                          ? 'border-green-500 bg-green-100'
                          : 'border-green-200 bg-white hover:border-green-300'
                      }`}
                      onClick={() => {
                        setSelectedInvoiceId(match.invoice.id);
                        setLinkInvoice(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="selected-invoice"
                            checked={selectedInvoiceId === match.invoice.id}
                            onChange={() => {
                              setSelectedInvoiceId(match.invoice.id);
                              setLinkInvoice(true);
                            }}
                            className="h-4 w-4 text-green-600"
                          />
                          <span className="font-medium text-sm">{match.invoice.invoiceNumber}</span>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          {match.score}% match
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs ml-6">
                        {match.contact && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="font-medium">{match.contact.name || match.contact.companyName}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">${parseFloat(match.invoice.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">
                            {new Date(match.invoice.invoiceDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={match.invoice.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {match.invoice.status || 'draft'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Single match - show details
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      {invoiceMatch.score}% match
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Number:</span>
                    <span className="font-medium">{invoiceMatch.invoice.invoiceNumber}</span>
                  </div>
                  {invoiceMatch.contact && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{invoiceMatch.contact.name || invoiceMatch.contact.companyName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Amount:</span>
                    <span className="font-medium">${parseFloat(invoiceMatch.invoice.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span className="font-medium">
                      {new Date(invoiceMatch.invoice.invoiceDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={invoiceMatch.invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoiceMatch.invoice.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-green-300">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="link-invoice"
                    checked={linkInvoice && selectedInvoiceId !== null}
                    onChange={(e) => {
                      setLinkInvoice(e.target.checked);
                      if (e.target.checked && !selectedInvoiceId) {
                        // Auto-select the best match if none selected
                        setSelectedInvoiceId(invoiceMatch.invoice.id);
                      }
                    }}
                    className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                    data-testid="checkbox-link-invoice"
                  />
                  <Label htmlFor="link-invoice" className="text-sm font-medium text-green-900 cursor-pointer">
                    Link this transaction to {invoiceMatch.allMatches && invoiceMatch.allMatches.length > 1 ? 'selected invoice' : 'invoice'} and mark as paid
                  </Label>
                </div>
                <p className="text-xs text-green-700 mt-1 ml-6">
                  When saved, the invoice will be marked as paid and linked to this transaction
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons - Fixed Mobile Layout */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6 sticky bottom-0 sm:static bg-white sm:bg-transparent p-4 sm:p-0 border-t sm:border-t-0 -mx-4 sm:mx-0 -mb-4 sm:mb-0">
        <Button
          onClick={handleSave}
          disabled={isProcessing || !editedTransaction.accountId}
          className="flex-1 h-12 sm:h-10 text-base sm:text-sm"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save & Classify
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onClose} className="h-12 sm:h-10 text-base sm:text-sm">
          Cancel
        </Button>
      </div>

      {/* New Contact Dialog */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {newContactType === 'customer' ? 'Customer' : 'Vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input 
                placeholder={`Enter ${newContactType} name`} 
                value={newContactData.name}
                onChange={(e) => setNewContactData({...newContactData, name: e.target.value})}
                data-testid="input-contact-name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email" 
                placeholder="Enter email address" 
                value={newContactData.email}
                onChange={(e) => setNewContactData({...newContactData, email: e.target.value})}
                data-testid="input-contact-email"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                setShowNewContactDialog(false);
                setNewContactData({ name: '', email: '' });
              }} variant="outline" data-testid="button-cancel-contact">
                Cancel
              </Button>
              <Button onClick={() => {
                if (newContactData.name.trim()) {
                  createNewContact(newContactData);
                  setNewContactData({ name: '', email: '' });
                } else {
                  toast({
                    title: "Name Required",
                    description: "Please enter a name for the contact",
                    variant: "destructive"
                  });
                }
              }} data-testid="button-create-contact">
                Create {newContactType === 'customer' ? 'Customer' : 'Vendor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={showCreateRuleDialog} onOpenChange={setShowCreateRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input 
                placeholder="Enter rule name" 
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                data-testid="input-rule-name"
              />
            </div>
            <div>
              <Label>Description Pattern</Label>
              <Input 
                placeholder="Text to match in transaction description" 
                value={newRulePattern || editedTransaction.description || ''}
                onChange={(e) => setNewRulePattern(e.target.value)}
                data-testid="input-rule-pattern"
              />
            </div>
            <div>
              <Label>Match Type</Label>
              <Select value={newRuleMatchType} onValueChange={setNewRuleMatchType}>
                <SelectTrigger data-testid="select-rule-match-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="exact">Exact Match</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              This rule will automatically classify transactions to: <strong>{accounts.find(acc => acc.id === editedTransaction.accountId)?.name || 'Selected Account'}</strong>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                setShowCreateRuleDialog(false);
                setNewRuleName('');
                setNewRulePattern('');
                setNewRuleMatchType('contains');
              }} variant="outline" data-testid="button-cancel-rule">
                Cancel
              </Button>
              <Button onClick={() => {
                if (newRuleName && newRulePattern) {
                  createRule({
                    ruleName: newRuleName,
                    pattern: newRulePattern,
                    matchType: newRuleMatchType
                  });
                  setNewRuleName('');
                  setNewRulePattern('');
                  setNewRuleMatchType('contains');
                } else {
                  toast({
                    title: "Missing Information",
                    description: "Please enter both rule name and pattern",
                    variant: "destructive"
                  });
                }
              }} data-testid="button-create-rule">
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  data-testid="input-project-name"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewProjectDialog(false);
                    setNewProjectName('');
                  }}
                  data-testid="button-cancel-project"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createNewProject}
                  disabled={!newProjectName.trim()}
                  data-testid="button-save-project"
                >
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
      )}

        {/* New Location Dialog */}
        {showNewLocationDialog && (
        <Dialog open={showNewLocationDialog} onOpenChange={setShowNewLocationDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Enter location name"
                  data-testid="input-location-name"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewLocationDialog(false);
                    setNewLocationName('');
                  }}
                  data-testid="button-cancel-location"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createNewLocation}
                  disabled={!newLocationName.trim()}
                  data-testid="button-save-location"
                >
                  Create Location
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Class Dialog */}
      {showNewClassDialog && (
        <Dialog open={showNewClassDialog} onOpenChange={setShowNewClassDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Class/Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="className">Class/Department Name</Label>
                <Input
                  id="className"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Enter class or department name"
                  data-testid="input-class-name"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewClassDialog(false);
                    setNewClassName('');
                  }}
                  data-testid="button-cancel-class"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createNewClass}
                  disabled={!newClassName.trim()}
                  data-testid="button-save-class"
                >
                  Create Class
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

}