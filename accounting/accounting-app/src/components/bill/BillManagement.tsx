import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AllAccountDropdown } from "@/components/ui/AccountDropdown";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
  Building,
  Receipt,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";
import { getCurrentDateString, getFutureDateString } from "@/lib/date-utils";
import {
  parseDateInUserTimezone,
  formatDateForDisplay,
  dateToUserTimezoneString,
} from "@/lib/timezone-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears } from "date-fns";

const billSchema = z.object({
  vendorId: z.number().min(1, "Vendor is required"),
  billNumber: z.string().min(1, "Bill number is required"),
  billDate: z.string().min(1, "Date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  projectId: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().min(0.01, "Quantity must be greater than 0"),
        rate: z.number().min(0.01, "Rate must be greater than 0"),
        amount: z.number().min(0.01, "Amount must be greater than 0"),
        accountId: z.number().min(1, "Account is required"),
      })
    )
    .min(1, "At least one item is required"),
  subtotal: z.number().min(0, "Subtotal must be positive"),
  discountPercent: z
    .number()
    .min(0)
    .max(100, "Discount must be between 0 and 100"),
  discountAmount: z.number().min(0, "Discount amount must be positive"),
  taxSettingId: z.string().optional(),
  taxAmount: z.number().min(0, "Tax amount must be positive"),
  totalAmount: z.number().min(0.01, "Total amount must be greater than 0"),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  status: z
    .enum([
      "draft",
      "sent",
      "received",
      "approved",
      "paid",
      "overdue",
      "cancelled",
    ])
    .default("draft"),
});

type BillFormData = z.infer<typeof billSchema>;

interface BillItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  accountId: number;
}

interface BillManagementProps {
  clientId: number | null;
}

export default function BillManagement({ clientId }: BillManagementProps) {
  console.log("🚀 BillManagement mounted with clientId:", clientId);

  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([
    { id: "1", description: "", quantity: 1, rate: 0, amount: 0, accountId: 0 },
  ]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] =
    useState<any>(null);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [defaultTaxSetting, setDefaultTaxSetting] = useState<any>(null);
  const [editingBillTaxRate, setEditingBillTaxRate] = useState<number | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<
    number | null
  >(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentTermDiscountInfo, setPaymentTermDiscountInfo] = useState<
    string | null
  >(null);
  const [discountConflictError, setDiscountConflictError] = useState<
    string | null
  >(null);
  const [paymentDiscountPreview, setPaymentDiscountPreview] = useState<{
    eligible: boolean;
    discountAmount: number;
    payableAmount: number;
    fullAmount: number;
    discountDays: number;
  }>({
    eligible: false,
    discountAmount: 0,
    payableAmount: 0,
    fullAmount: 0,
    discountDays: 0,
  });
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [selectedBillForAttachments, setSelectedBillForAttachments] =
    useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const [showPaymentTermsDialog, setShowPaymentTermsDialog] = useState(false);
  const [customPaymentTerms, setCustomPaymentTerms] = useState<
    Array<{
      id: string;
      label: string;
      days: number;
      discountPercent?: number;
      discountDays?: number;
    }>
  >([]);
  const [newPaymentTerm, setNewPaymentTerm] = useState({
    label: "",
    days: 30,
    hasDiscount: false,
    discountPercent: 0,
    discountDays: 10,
  });
  const [useManualTax, setUseManualTax] = useState(false);
  const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] =
    useState(false);
  const [selectedBillForPaymentDetails, setSelectedBillForPaymentDetails] =
    useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Sorting state
  const [sortField, setSortField] = useState<'billNumber' | 'vendorName' | 'billDate' | 'dueDate' | 'totalAmount' | 'status'>('billDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Date range filter state
  const [datePreset, setDatePreset] = useState<string>('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [dateFilterStart, setDateFilterStart] = useState<string>('');
  const [dateFilterEnd, setDateFilterEnd] = useState<string>('');

  const form = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      vendorId: 0,
      billNumber: "",
      billDate: getCurrentDateString(),
      dueDate: getFutureDateString(30),
      projectId: null,
      items: [],
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxSettingId: "tax-exempt",
      taxAmount: 0,
      totalAmount: 0,
      notes: "",
      paymentTerms: "Net 30",
      status: "draft",
    },
  });

  // Fetch vendors
  const {
    data: vendorsResponse,
    isLoading: vendorsLoading,
    error: vendorsError,
  } = useQuery({
    queryKey: ["/api/crm/vendors", clientId],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("🔍 Fetching vendors for clientId:", clientId);
      const response = await fetch(
        apiConfig.buildUrl(`/api/crm/vendors?clientId=${clientId}`),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) {
        console.error(
          "❌ Failed to fetch vendors:",
          response.status,
          response.statusText
        );
        throw new Error("Failed to fetch vendors");
      }
      const data = await response.json();
      console.log("✅ Vendors response:", data);
      return data;
    },
    enabled: !!clientId,
  });

  const vendors = (vendorsResponse as any)?.data || [];

  // Debug logging
  console.log("🚀 BillManagement - Vendors state:", {
    clientId,
    vendorsLoading,
    vendorsError,
    vendorsResponse,
    vendors,
    vendorsCount: vendors.length,
  });

  // Load custom payment terms from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`paymentTerms_${clientId}`);
    if (stored) {
      try {
        setCustomPaymentTerms(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading custom payment terms:", e);
      }
    }
  }, [clientId]);

  // Save custom payment terms to localStorage
  const saveCustomPaymentTerms = (terms: typeof customPaymentTerms) => {
    localStorage.setItem(`paymentTerms_${clientId}`, JSON.stringify(terms));
    setCustomPaymentTerms(terms);
  };

  // Add new payment term
  const handleAddPaymentTerm = () => {
    if (newPaymentTerm.days < 0) {
      toast({
        title: "Error",
        description: "Payment days must be a positive number",
        variant: "destructive",
      });
      return;
    }
    if (newPaymentTerm.days === 0) {
      toast({
        title: "Error",
        description: "Payment days must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    if (newPaymentTerm.hasDiscount) {
      if (newPaymentTerm.discountPercent <= 0) {
        toast({
          title: "Error",
          description: "Discount percent must be greater than 0",
          variant: "destructive",
        });
        return;
      }
      if (newPaymentTerm.discountDays <= 0) {
        toast({
          title: "Error",
          description: "Discount days must be greater than 0",
          variant: "destructive",
        });
        return;
      }
      // Validation: Discount days must be less than or equal to payment days
      if (newPaymentTerm.discountDays > newPaymentTerm.days) {
        toast({
          title: "Validation Error",
          description: `Discount days (${newPaymentTerm.discountDays}) cannot be greater than payment days (${newPaymentTerm.days}). The discount must be available before the payment due date.`,
          variant: "destructive",
        });
        return;
      }
    }

    const termId = `custom_${Date.now()}`;
    let label = newPaymentTerm.label;

    // Format label based on discount
    if (newPaymentTerm.hasDiscount) {
      label = `${newPaymentTerm.discountPercent}%/${newPaymentTerm.discountDays} Net ${newPaymentTerm.days}`;
    } else {
      label = label || `Net ${newPaymentTerm.days}`;
    }

    const newTerm = {
      id: termId,
      label,
      days: newPaymentTerm.days,
      ...(newPaymentTerm.hasDiscount && {
        discountPercent: newPaymentTerm.discountPercent,
        discountDays: newPaymentTerm.discountDays,
      }),
    };

    saveCustomPaymentTerms([...customPaymentTerms, newTerm]);
    setNewPaymentTerm({
      label: "",
      days: 30,
      hasDiscount: false,
      discountPercent: 0,
      discountDays: 10,
    });
    setShowPaymentTermsDialog(false);
    toast({ title: "Success", description: "Payment term added successfully" });
  };

  // Delete custom payment term
  const handleDeletePaymentTerm = (id: string) => {
    saveCustomPaymentTerms(customPaymentTerms.filter((t) => t.id !== id));
    toast({
      title: "Success",
      description: "Payment term deleted successfully",
    });
  };

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", clientId],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/projects/${clientId}`),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) throw new Error("Failed to fetch projects");
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!clientId,
  });

  // Fetch Chart of Accounts (All accounts for bills)
  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ["accounts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/accounts/${clientId}`),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) return [];
      const result = await response.json();
      console.log("🚀 Accounts API response:", result);
      return result.accounts || result.data || [];
    },
    enabled: !!clientId,
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });

  // Use all accounts from Chart of Accounts for bill line items
  const allAccounts = accounts as any[];

  // Filter bank accounts for payment recording (for bank transfer and check)
  const bankAccounts = useMemo(() => {
    return (accounts as any[]).filter(
      (account: any) =>
        account.type === "asset" &&
        (account.subtype === "bank" || account.subtype === "banklink")
    );
  }, [accounts]);

  // Filter credit card accounts for payment recording
  const creditCardAccounts = useMemo(() => {
    return (accounts as any[]).filter(
      (account: any) =>
        account.type === "liability" && account.subtype === "credit_card"
    );
  }, [accounts]);

  // Debug logging
  console.log("🚀 All accounts:", accounts);
  console.log("🚀 All accounts:", allAccounts);
  console.log("🏦 Bank accounts:", bankAccounts);

  // Fetch bills with date range filtering
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["bills", clientId, dateFilterStart, dateFilterEnd],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (dateFilterStart) {
        params.append("startDate", dateFilterStart);
      }
      if (dateFilterEnd) {
        params.append("endDate", dateFilterEnd);
      }

      const queryString = params.toString();
      const url = queryString 
        ? `/api/crm/bills/${clientId}?${queryString}`
        : `/api/crm/bills/${clientId}`;

      const response = await fetch(
        apiConfig.buildUrl(url),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) throw new Error("Failed to fetch bills");
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!clientId,
  });

  // Get date range based on preset
  const getDateRange = (preset: string) => {
    const now = new Date();
    
    switch (preset) {
      case 'all':
        return { start: '', end: '' };
      case 'current-month':
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        return { 
          start: `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}-${String(currentMonthStart.getDate()).padStart(2, '0')}`,
          end: `${currentMonthEnd.getFullYear()}-${String(currentMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(currentMonthEnd.getDate()).padStart(2, '0')}`
        };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);
        return { 
          start: `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}-${String(lastMonthStart.getDate()).padStart(2, '0')}`,
          end: `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`
        };
      case 'current-quarter':
        const currentQuarterStart = startOfQuarter(now);
        const currentQuarterEnd = endOfQuarter(now);
        return { 
          start: `${currentQuarterStart.getFullYear()}-${String(currentQuarterStart.getMonth() + 1).padStart(2, '0')}-${String(currentQuarterStart.getDate()).padStart(2, '0')}`,
          end: `${currentQuarterEnd.getFullYear()}-${String(currentQuarterEnd.getMonth() + 1).padStart(2, '0')}-${String(currentQuarterEnd.getDate()).padStart(2, '0')}`
        };
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        const lastQuarterStart = startOfQuarter(lastQuarter);
        const lastQuarterEnd = endOfQuarter(lastQuarter);
        return { 
          start: `${lastQuarterStart.getFullYear()}-${String(lastQuarterStart.getMonth() + 1).padStart(2, '0')}-${String(lastQuarterStart.getDate()).padStart(2, '0')}`,
          end: `${lastQuarterEnd.getFullYear()}-${String(lastQuarterEnd.getMonth() + 1).padStart(2, '0')}-${String(lastQuarterEnd.getDate()).padStart(2, '0')}`
        };
      case 'current-year':
        const currentYearStart = startOfYear(now);
        const currentYearEnd = endOfYear(now);
        return { 
          start: `${currentYearStart.getFullYear()}-${String(currentYearStart.getMonth() + 1).padStart(2, '0')}-${String(currentYearStart.getDate()).padStart(2, '0')}`,
          end: `${currentYearEnd.getFullYear()}-${String(currentYearEnd.getMonth() + 1).padStart(2, '0')}-${String(currentYearEnd.getDate()).padStart(2, '0')}`
        };
      case 'last-year':
        const lastYear = subYears(now, 1);
        const lastYearStart = startOfYear(lastYear);
        const lastYearEnd = endOfYear(lastYear);
        return { 
          start: `${lastYearStart.getFullYear()}-${String(lastYearStart.getMonth() + 1).padStart(2, '0')}-${String(lastYearStart.getDate()).padStart(2, '0')}`,
          end: `${lastYearEnd.getFullYear()}-${String(lastYearEnd.getMonth() + 1).padStart(2, '0')}-${String(lastYearEnd.getDate()).padStart(2, '0')}`
        };
      case 'year-to-date':
        const ytdStart = startOfYear(now);
        return { 
          start: `${ytdStart.getFullYear()}-${String(ytdStart.getMonth() + 1).padStart(2, '0')}-${String(ytdStart.getDate()).padStart(2, '0')}`,
          end: ''
        };
      default:
        return { start: '', end: '' };
    }
  };

  // Update date filters when preset changes
  useEffect(() => {
    if (!showCustomDate && datePreset !== 'custom') {
      const range = getDateRange(datePreset);
      setDateFilterStart(range.start);
      setDateFilterEnd(range.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, showCustomDate]);

  // Sort bills (date filtering is handled by backend)
  const sortedBills = useMemo(() => {
    // Sort the bills (already filtered by backend based on date range)
    return [...bills].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'billNumber':
          aValue = a.billNumber || '';
          bValue = b.billNumber || '';
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        case 'vendorName':
          aValue = a.vendorName || '';
          bValue = b.vendorName || '';
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        case 'billDate':
          aValue = a.billDate ? new Date(a.billDate).getTime() : 0;
          bValue = b.billDate ? new Date(b.billDate).getTime() : 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'totalAmount':
          aValue = parseFloat(a.totalAmount || 0);
          bValue = parseFloat(b.totalAmount || 0);
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        default:
          return 0;
      }
    });
  }, [bills, sortField, sortDirection]);

  // Handle sorting
  const handleSort = (field: 'billNumber' | 'vendorName' | 'billDate' | 'dueDate' | 'totalAmount' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fetch bookkeeping settings to get tax settings
  const { data: bookkeepingSettings } = useQuery({
    queryKey: [`/api/clients/${clientId}/bookkeeping-settings`],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/clients/${clientId}/bookkeeping-settings`),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result;
    },
    enabled: !!clientId,
  });

  // Update tax settings state when bookkeeping settings data changes
  useEffect(() => {
    if (bookkeepingSettings && bookkeepingSettings.taxSettings) {
      console.log(
        "🔍 Bookkeeping tax settings data received:",
        bookkeepingSettings.taxSettings
      );

      // Transform tax settings to the format expected by the dropdown
      const transformedTaxSettings = bookkeepingSettings.taxSettings.map(
        (tax: any) => {
          const ratePercent = tax.rate * 100;
          const formattedRate =
            ratePercent % 1 === 0
              ? ratePercent.toFixed(0)
              : ratePercent.toFixed(1);
          return {
            id: tax.id,
            name: tax.name,
            rate: tax.rate,
            displayText: `${tax.name} (${formattedRate}%)`,
            isDefault: tax.isDefault,
            isActive: tax.isActive,
          };
        }
      );

      // Add "Tax Exempt" option only if there are existing tax settings
      let finalTaxSettings = transformedTaxSettings;
      if (transformedTaxSettings.length > 0) {
        finalTaxSettings = [
          ...transformedTaxSettings,
          {
            id: "tax-exempt",
            name: "Tax Exempt",
            rate: 0,
            displayText: "Tax Exempt (0%)",
            isDefault: false,
            isActive: true,
          },
        ];
      }

      setTaxSettings(finalTaxSettings);

      // Find and set the default tax setting (but don't use it - we'll use Tax Exempt)
      const defaultTax = transformedTaxSettings.find(
        (tax: any) => tax.isDefault
      );
      setDefaultTaxSetting(defaultTax);

      // Set Tax Exempt as default for bills (not the default tax setting)
      if (!form.watch("taxSettingId")) {
        form.setValue("taxSettingId", "tax-exempt");
      }
    }
  }, [bookkeepingSettings]);

  // Ensure vendor is selected when vendors load and editingBill is set
  useEffect(() => {
    if (editingBill && !vendorsLoading && Array.isArray(vendors) && vendors.length > 0) {
      const currentVendorId = form.getValues("vendorId");
      const billVendorId = Number(editingBill.vendorId);
      
      // If vendorId is set in editingBill but not in form, set it
      if (billVendorId > 0 && currentVendorId !== billVendorId) {
        console.log("🔍 Setting vendorId:", billVendorId, "from editingBill");
        form.setValue("vendorId", billVendorId, { shouldValidate: false });
      }
    }
  }, [editingBill, vendors, vendorsLoading, form]);

  // Update taxSettingId when editing a bill and taxSettings become available
  useEffect(() => {
    if (editingBill && taxSettings.length > 0 && editingBillTaxRate !== null) {
      const currentTaxSettingId = form.getValues("taxSettingId");
      console.log(
        "🔍 useEffect: editingBillTaxRate=",
        editingBillTaxRate,
        "currentTaxSettingId=",
        currentTaxSettingId,
        "taxSettings count=",
        taxSettings.length
      );

      // Match taxRate to taxSettingId
      if (editingBillTaxRate === 0 || editingBillTaxRate === null) {
        // Tax rate is 0, should be tax-exempt
        if (currentTaxSettingId !== "tax-exempt") {
          console.log("🔍 Setting taxSettingId to tax-exempt (rate is 0)");
          form.setValue("taxSettingId", "tax-exempt", {
            shouldValidate: false,
          });
        }
      } else {
        // Find matching tax setting
        const matchingTax = taxSettings.find((tax: any) => {
          const taxRateNum =
            typeof tax.rate === "string" ? parseFloat(tax.rate) : tax.rate;
          const billTaxRateNum =
            typeof editingBillTaxRate === "string"
              ? parseFloat(editingBillTaxRate)
              : editingBillTaxRate;
          const match = Math.abs(taxRateNum - billTaxRateNum) < 0.0001;
          if (match) {
            console.log(
              "🔍 Found match: tax.rate=",
              taxRateNum,
              "editingBillTaxRate=",
              billTaxRateNum,
              "tax.id=",
              tax.id
            );
          }
          return match;
        });

        if (matchingTax) {
          const matchingId = String(matchingTax.id);
          if (currentTaxSettingId !== matchingId) {
            console.log(
              "🔍 Matching tax rate",
              editingBillTaxRate,
              "to tax setting",
              matchingId,
              "(current:",
              currentTaxSettingId,
              ")"
            );
            form.setValue("taxSettingId", matchingId, {
              shouldValidate: false,
            });
          }
        } else {
          // No match found, default to tax-exempt
          console.log(
            "🔍 No matching tax setting found for rate",
            editingBillTaxRate,
            ", defaulting to tax-exempt"
          );
          console.log(
            "🔍 Available tax rates:",
            taxSettings.map((t) => ({ id: t.id, rate: t.rate, name: t.name }))
          );
          if (currentTaxSettingId !== "tax-exempt") {
            form.setValue("taxSettingId", "tax-exempt", {
              shouldValidate: false,
            });
          }
        }
      }
    }
  }, [editingBill, taxSettings, editingBillTaxRate, form]);

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (billData: BillFormData) => {
      console.log("🚀 Sending bill request to:", "/api/crm/bills");
      console.log("🚀 Bill data:", { ...billData, clientId: Number(clientId) });

      const formData = new FormData();
      formData.append(
        "billData",
        JSON.stringify({ ...billData, clientId: Number(clientId) })
      );

      // Add attached files
      attachedFiles.forEach((file, index) => {
        formData.append(`attachments`, file);
      });
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiConfig.buildUrl("/api/crm/bills"), {
        method: "POST",
        credentials: "include",
        body: formData,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("🚀 Error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bills", clientId] });
      queryClient.invalidateQueries({ queryKey: ["all-bills", clientId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/crm/vendors", clientId],
      });
      // Invalidate vendor bills queries for all vendors (in case bill was created for any vendor)
      // This ensures newly created bills show up in cheque creation
      queryClient.invalidateQueries({ queryKey: ['/api/crm/vendor-bills'] });
      setShowCreateDialog(false);
      form.reset();
      setBillItems([
        {
          id: "1",
          description: "",
          quantity: 1,
          rate: 0,
          amount: 0,
          accountId: 0,
        },
      ]);
      setAttachedFiles([]);
      toast({ title: "Bill created successfully" });
    },
    onError: (error) => {
      console.log("🚀 Mutation error:", error);
      toast({
        title: "Error creating bill",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bill mutation
  const updateBillMutation = useMutation({
    mutationFn: async ({ id, ...billData }: any) => {
      const formData = new FormData();
      formData.append(
        "billData",
        JSON.stringify({ ...billData, clientId: Number(clientId) })
      );

      // Add attached files
      attachedFiles.forEach((file, index) => {
        formData.append(`attachments`, file);
      });

      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiConfig.buildUrl(`/api/crm/bill/${id}`), {
        method: "PATCH",
        credentials: "include",
        body: formData,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bills", clientId] });
      queryClient.invalidateQueries({ queryKey: ["all-bills", clientId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/crm/vendors", clientId],
      });
      toast({ title: "Success", description: "Bill updated successfully" });
      setShowCreateDialog(false);
      form.reset();
      setBillItems([
        {
          id: "1",
          description: "",
          quantity: 1,
          rate: 0,
          amount: 0,
          accountId: 0,
        },
      ]);
      setAttachedFiles([]);
      setEditingBill(null);
    },
    onError: (error: any) => {
      console.error("❌ Update bill error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update bill",
        variant: "destructive",
      });
    },
  });

  // Delete bill mutation
  const deleteBillMutation = useMutation({
    mutationFn: async (billId: number) => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/crm/bill/${billId}`),
        {
          method: "DELETE",
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills", clientId] });
      queryClient.invalidateQueries({ queryKey: ["all-bills", clientId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/crm/vendors", clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["journal-entries", clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/journal-entries", clientId],
      });
      setShowDeleteDialog(false);
      setBillToDelete(null);
      toast({ title: "Success", description: "Bill deleted successfully" });
    },
    onError: (error: any) => {
      console.error("❌ Delete bill error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete bill",
        variant: "destructive",
      });
    },
  });

  // Create Project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description?: string }) => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/projects/${clientId}`),
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(projectData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create project");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects", clientId] });
      // Auto-select the newly created project
      form.setValue("projectId", data.data.id);
      setShowCreateProject(false);
      setNewProjectName("");
      toast({
        title: "Success",
        description: "Project created and selected",
      });
    },
    onError: (error: any) => {
      console.error("Create project error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  // Generate bill number
  const generateBillNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `BILL-${year}${month}-${random}`;
  };

  // Add/Remove bill items
  const addItem = () => {
    const newItem: BillItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
      accountId: allAccounts.length > 0 ? allAccounts[0].id : 0,
    };
    setBillItems([...billItems, newItem]);
  };

  const removeItem = (id: string) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setBillItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "rate") {
            updated.amount = updated.quantity * updated.rate;
            console.log(
              `🔢 Amount calculation: ${updated.quantity} × ${updated.rate} = ${updated.amount}`
            );
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate totals and sync items with form
  const calculateTotals = () => {
    const subtotal = billItems.reduce((sum, item) => sum + item.amount, 0);
    const discountPercent = form.watch("discountPercent") || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;

    let taxAmount = 0;

    if (useManualTax) {
      // Use manually entered tax amount
      taxAmount = form.watch("taxAmount") || 0;
    } else {
      // Calculate tax automatically from tax setting
      const taxSettingId = form.watch("taxSettingId");
      const selectedTaxSetting = taxSettings.find(
        (tax) => tax.id === taxSettingId
      );
      const taxRate = selectedTaxSetting?.rate || 0;
      taxAmount = taxableAmount * taxRate;
    }

    const totalAmount = taxableAmount + taxAmount;

    // Sync billItems with form items field
    const formItems = billItems.filter(
      (item) => item.description.trim() !== ""
    );
    form.setValue("items", formItems);
    form.setValue("subtotal", subtotal);
    form.setValue("discountAmount", discountAmount);
    form.setValue("taxAmount", taxAmount);
    form.setValue("totalAmount", totalAmount);
  };

  useEffect(() => {
    calculateTotals();
  }, [
    billItems,
    form.watch("discountPercent"),
    form.watch("taxSettingId"),
    form.watch("taxAmount"),
    taxSettings,
    useManualTax,
  ]);

  // Calculate due date based on bill date and payment terms
  const calculateDueDate = (billDate: string, paymentTerms: string): string => {
    if (!billDate) return "";

    try {
      const date = new Date(billDate);
      if (isNaN(date.getTime())) return "";

      let daysToAdd = 0;

      // Check standard payment terms
      if (paymentTerms === "Due on Receipt") {
        daysToAdd = 0;
      } else if (paymentTerms === "Net 15") {
        daysToAdd = 15;
      } else if (paymentTerms === "Net 30") {
        daysToAdd = 30;
      } else if (paymentTerms === "Net 45") {
        daysToAdd = 45;
      } else if (paymentTerms === "Net 60") {
        daysToAdd = 60;
      } else {
        // Check custom payment terms
        const customTerm = customPaymentTerms.find(
          (t) => t.label === paymentTerms
        );
        if (customTerm) {
          daysToAdd = customTerm.days;
        } else {
          // Try to parse discount format like "2/10 Net 30"
          const discountMatch = paymentTerms.match(
            /^(\d+)%\/(\d+)\s+Net\s+(\d+)$/i
          );
          if (discountMatch) {
            daysToAdd = parseInt(discountMatch[3], 10);
          } else {
            // Try to parse "Net X" format
            const netMatch = paymentTerms.match(/Net\s+(\d+)/i);
            if (netMatch) {
              daysToAdd = parseInt(netMatch[1], 10);
            } else {
              // Default to Net 30 if payment terms format is not recognized
              daysToAdd = 30;
            }
          }
        }
      }

      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      // Format as YYYY-MM-DD for date input
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, "0");
      const day = String(dueDate.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error calculating due date:", error);
      return "";
    }
  };

  // Update due date when bill date or payment terms change
  useEffect(() => {
    const billDate = form.watch("billDate");
    const paymentTerms = form.watch("paymentTerms") || "Net 30";

    if (billDate) {
      const calculatedDueDate = calculateDueDate(billDate, paymentTerms);
      if (calculatedDueDate) {
        form.setValue("dueDate", calculatedDueDate);
      }
    }
  }, [form.watch("billDate"), form.watch("paymentTerms"), customPaymentTerms]);

  const onSubmit = (data: BillFormData) => {
    console.log("🚀 onSubmit called - Form submitted!");
    console.log("🚀 Form valid:", form.formState.isValid);
    console.log("🚀 Form errors:", form.formState.errors);
    console.log("🚀 Bill items:", billItems);

    const validItems = billItems.filter(
      (item) => item.description.trim() !== ""
    );
    console.log("🚀 Valid items:", validItems);

    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    // Calculate taxRate from taxSettingId
    const taxSettingId = data.taxSettingId || "tax-exempt";
    const selectedTaxSetting = taxSettings.find(
      (tax) => tax.id === taxSettingId
    );
    const taxRate = selectedTaxSetting?.rate || 0;
    console.log(
      "🔍 Tax calculation: taxSettingId=",
      taxSettingId,
      "taxRate=",
      taxRate
    );

    const billData = {
      ...data,
      items: validItems,
      taxRate: taxRate, // Add taxRate so backend can store it
    };

    console.log("🚀 Form submitted with data:", billData);
    console.log("🚀 Sending bill data:", billData);

    if (editingBill) {
      updateBillMutation.mutate({ id: editingBill.id, ...billData });
    } else {
      createBillMutation.mutate(billData);
    }
  };
  // Helper function to format date for HTML date input
  const formatDateForInput = (dateString: string): string => {
    try {
      // If it's already in YYYY-MM-DD format, return as-is
      // This is the most common case and prevents any timezone conversion
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.log("📅 Date already in correct format:", dateString);
        return dateString;
      }

      // For ISO datetime strings (e.g., "2024-01-15T00:00:00.000Z")
      if (dateString.includes("T")) {
        // Extract just the date part to avoid timezone conversion
        const datePart = dateString.split("T")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          console.log("📅 Extracted date from ISO string:", datePart);
          return datePart;
        }
      }

      // For other formats, parse safely without timezone conversion
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("📅 Invalid date, using today:", dateString);
        return new Date().toISOString().split("T")[0]; // fallback to today
      }

      // Format as YYYY-MM-DD using local date components to avoid timezone shifts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formatted = `${year}-${month}-${day}`;
      console.log("📅 Formatted date for input:", dateString, "→", formatted);
      return formatted;
    } catch (error) {
      console.warn("Failed to format date for input:", dateString, error);
      return new Date().toISOString().split("T")[0]; // fallback to today
    }
  };

  const handleDelete = (bill: any) => {
    setBillToDelete(bill);
    setShowDeleteDialog(true);
  };

  const confirmDeleteBill = () => {
    if (billToDelete) {
      deleteBillMutation.mutate(billToDelete.id);
    }
  };

  const handleEdit = async (bill: any) => {
    setEditingBill(bill);

    try {
      // Fetch the complete bill data with items
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/crm/bill/${bill.id}`),
        {
          credentials: "include",
          headers,
        }
      );

      if (response.ok) {
        const result = await response.json();
        const completeBill = result.data;

        // Calculate values for form
        const subtotal = Number(
          completeBill.subtotal || completeBill.totalAmount || 0
        );
        const discountAmount = Number(completeBill.discountAmount || 0);
        let taxRate = Number(completeBill.taxRate || 0);
        const taxAmount = Number(completeBill.taxAmount || 0);

        // If taxRate is 0 but taxAmount > 0, calculate taxRate from taxAmount and taxable amount
        if (taxRate === 0 && taxAmount > 0) {
          const taxableAmount = subtotal - discountAmount;
          if (taxableAmount > 0) {
            taxRate = taxAmount / taxableAmount;
            console.log(
              "🔍 Calculated taxRate from taxAmount:",
              taxAmount,
              "/ taxableAmount:",
              taxableAmount,
              "= taxRate:",
              taxRate
            );
          }
        }

        // Store taxRate for later matching when taxSettings load
        setEditingBillTaxRate(taxRate);

        // Calculate discountPercent from discountAmount and subtotal
        const discountPercent =
          subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

        // Find matching taxSettingId from taxRate (if taxSettings are already loaded)
        let taxSettingId = "tax-exempt"; // Default to tax-exempt
        let shouldUseManualTax = false;
        if (taxRate > 0 && taxSettings.length > 0) {
          // Find tax setting that matches the rate (within 0.0001 tolerance for floating point comparison)
          const matchingTax = taxSettings.find((tax: any) => {
            return Math.abs(tax.rate - taxRate) < 0.0001;
          });
          if (matchingTax) {
            taxSettingId = matchingTax.id;
            console.log(
              "🔍 Found matching tax setting:",
              matchingTax.id,
              "for rate",
              taxRate
            );
          } else {
            // Tax rate doesn't match any setting, likely manual entry
            shouldUseManualTax = true;
            console.log(
              "🔍 Tax rate does not match any setting, using manual tax mode"
            );
          }
        } else if (taxAmount > 0 && taxRate === 0) {
          // Tax amount exists but rate is 0, likely manual entry
          shouldUseManualTax = true;
          console.log(
            "🔍 Tax amount exists but rate is 0, using manual tax mode"
          );
        } else {
          console.log(
            "🔍 Tax settings not loaded yet or tax rate is 0, will match later in useEffect"
          );
        }

        setUseManualTax(shouldUseManualTax);

        // Convert string values to numbers for form and format dates safely
        const convertedBill = {
          ...completeBill,
          vendorId: Number(completeBill.vendorId),
          projectId: completeBill.projectId
            ? Number(completeBill.projectId)
            : null,
          billDate: formatDateForInput(completeBill.billDate),
          dueDate: formatDateForInput(completeBill.dueDate),
          subtotal: subtotal,
          discountPercent: discountPercent,
          discountAmount: discountAmount,
          taxSettingId: shouldUseManualTax ? "" : taxSettingId,
          taxRate: taxRate,
          taxAmount: taxAmount,
          totalAmount: Number(
            completeBill.totalAmount || completeBill.balanceDue || 0
          ),
        };

        form.reset(convertedBill);

        // Set bill items - if no items exist, create one with the bill total
        if (completeBill.items && completeBill.items.length > 0) {
          setBillItems(
            completeBill.items.map((item: any) => ({
              id: item.id || Math.random().toString(36).substr(2, 9),
              description: item.description,
              quantity: Number(item.quantity),
              rate: Number(item.rate),
              amount: Number(item.amount),
              accountId:
                item.accountId ||
                (allAccounts.length > 0 ? allAccounts[0].id : 0),
            }))
          );
        } else {
          // Create a single line item with the full bill amount
          const totalAmount = Number(
            completeBill.totalAmount || completeBill.balanceDue || 0
          );
          setBillItems([
            {
              id: "1",
              description:
                completeBill.description || `Bill ${completeBill.billNumber}`,
              quantity: 1,
              rate: totalAmount,
              amount: totalAmount,
              accountId: allAccounts.length > 0 ? allAccounts[0].id : 0,
            },
          ]);
        }
      } else {
        console.error("Failed to fetch complete bill data");
        // Fallback to original logic if API call fails
        const subtotal = Number(bill.subtotal || bill.totalAmount || 0);
        const discountAmount = Number(bill.discountAmount || 0);
        let taxRate = Number(bill.taxRate || 0);
        const taxAmount = Number(bill.taxAmount || 0);

        // If taxRate is 0 but taxAmount > 0, calculate taxRate from taxAmount and taxable amount
        if (taxRate === 0 && taxAmount > 0) {
          const taxableAmount = subtotal - discountAmount;
          if (taxableAmount > 0) {
            taxRate = taxAmount / taxableAmount;
            console.log(
              "🔍 Calculated taxRate from taxAmount:",
              taxAmount,
              "/ taxableAmount:",
              taxableAmount,
              "= taxRate:",
              taxRate
            );
          }
        }

        // Store taxRate for later matching when taxSettings load
        setEditingBillTaxRate(taxRate);

        // Calculate discountPercent from discountAmount and subtotal
        const discountPercent =
          subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

        // Find matching taxSettingId from taxRate (if taxSettings are already loaded)
        let taxSettingId = "tax-exempt"; // Default to tax-exempt
        if (taxRate > 0 && taxSettings.length > 0) {
          // Find tax setting that matches the rate (within 0.0001 tolerance for floating point comparison)
          const matchingTax = taxSettings.find((tax: any) => {
            return Math.abs(tax.rate - taxRate) < 0.0001;
          });
          if (matchingTax) {
            taxSettingId = matchingTax.id;
            console.log(
              "🔍 Found matching tax setting:",
              matchingTax.id,
              "for rate",
              taxRate
            );
          }
        } else {
          console.log(
            "🔍 Tax settings not loaded yet or tax rate is 0, will match later in useEffect"
          );
        }

        const convertedBill = {
          ...bill,
          vendorId: Number(bill.vendorId),
          projectId: bill.projectId ? Number(bill.projectId) : null,
          billDate: formatDateForInput(bill.billDate),
          dueDate: formatDateForInput(bill.dueDate),
          subtotal: subtotal,
          discountPercent: discountPercent,
          discountAmount: discountAmount,
          taxSettingId: taxSettingId,
          taxRate: taxRate,
          taxAmount: Number(bill.taxAmount || 0),
          totalAmount: Number(bill.totalAmount || bill.balanceDue || 0),
        };

        form.reset(convertedBill);

        // Create a single line item with the full bill amount
        const totalAmount = Number(bill.totalAmount || bill.balanceDue || 0);
        setBillItems([
          {
            id: "1",
            description: bill.description || `Bill ${bill.billNumber}`,
            quantity: 1,
            rate: totalAmount,
            amount: totalAmount,
            accountId: allAccounts.length > 0 ? allAccounts[0].id : 0,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching bill data:", error);
      // Fallback to original logic if API call fails
      const subtotal = Number(bill.subtotal || bill.totalAmount || 0);
      const discountAmount = Number(bill.discountAmount || 0);
      let taxRate = Number(bill.taxRate || 0);
      const taxAmount = Number(bill.taxAmount || 0);

      // If taxRate is 0 but taxAmount > 0, calculate taxRate from taxAmount and taxable amount
      if (taxRate === 0 && taxAmount > 0) {
        const taxableAmount = subtotal - discountAmount;
        if (taxableAmount > 0) {
          taxRate = taxAmount / taxableAmount;
          console.log(
            "🔍 Calculated taxRate from taxAmount:",
            taxAmount,
            "/ taxableAmount:",
            taxableAmount,
            "= taxRate:",
            taxRate
          );
        }
      }

      // Store taxRate for later matching when taxSettings load
      setEditingBillTaxRate(taxRate);

      // Calculate discountPercent from discountAmount and subtotal
      const discountPercent =
        subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

      // Find matching taxSettingId from taxRate (if taxSettings are already loaded)
      let taxSettingId = "tax-exempt"; // Default to tax-exempt
      if (taxRate > 0 && taxSettings.length > 0) {
        // Find tax setting that matches the rate (within 0.0001 tolerance for floating point comparison)
        const matchingTax = taxSettings.find((tax: any) => {
          return Math.abs(tax.rate - taxRate) < 0.0001;
        });
        if (matchingTax) {
          taxSettingId = matchingTax.id;
          console.log(
            "🔍 Found matching tax setting:",
            matchingTax.id,
            "for rate",
            taxRate
          );
        }
      } else {
        console.log(
          "🔍 Tax settings not loaded yet or tax rate is 0, will match later in useEffect"
        );
      }

      const convertedBill = {
        ...bill,
        vendorId: Number(bill.vendorId),
        projectId: bill.projectId ? Number(bill.projectId) : null,
        billDate: formatDateForInput(bill.billDate),
        dueDate: formatDateForInput(bill.dueDate),
        subtotal: subtotal,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        taxSettingId: taxSettingId,
        taxRate: taxRate,
        taxAmount: Number(bill.taxAmount || 0),
        totalAmount: Number(bill.totalAmount || bill.balanceDue || 0),
      };

      form.reset(convertedBill);

      // Create a single line item with the full bill amount
      const totalAmount = Number(bill.totalAmount || bill.balanceDue || 0);
      setBillItems([
        {
          id: "1",
          description: bill.description || `Bill ${bill.billNumber}`,
          quantity: 1,
          rate: totalAmount,
          amount: totalAmount,
          accountId: allAccounts.length > 0 ? allAccounts[0].id : 0,
        },
      ]);
    }

    setShowCreateDialog(true);
  };

  const handleNewBill = () => {
    setEditingBill(null);
    setEditingBillTaxRate(null);
    setUseManualTax(false);
    form.reset({
      vendorId: 0,
      billNumber: generateBillNumber(),
      billDate: getCurrentDateString(),
      dueDate: getFutureDateString(30),
      projectId: null,
      items: [],
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxSettingId: "tax-exempt",
      taxAmount: 0,
      totalAmount: 0,
      notes: "",
      paymentTerms: "Net 30",
      status: "draft",
    });
    setBillItems([
      {
        id: "1",
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
        accountId: 0,
      },
    ]);
    setShowCreateDialog(true);
  };

  // Parse discount percent/days from payment terms label (e.g., "2%/10 Net 30" or custom with discount)
  const getPaymentTermDiscountMeta = (paymentTerms?: string) => {
    if (!paymentTerms) return { discountPercent: 0, discountDays: 0 };

    // First try to match a saved custom term
    const customTerm = customPaymentTerms.find((t) => t.label === paymentTerms);
    if (customTerm && customTerm.discountPercent && customTerm.discountDays) {
      return {
        discountPercent: customTerm.discountPercent,
        discountDays: customTerm.discountDays,
      };
    }

    // Fallback: parse formatted string like "2%/10 Net 30"
    const match = `${paymentTerms}`.match(/^(\d+(?:\.\d+)?)%\/(\d+)\s+Net\s+(\d+)/i);
    if (match) {
      const discountPercent = parseFloat(match[1]);
      const discountDays = parseInt(match[2], 10);
      return {
        discountPercent: isNaN(discountPercent) ? 0 : discountPercent,
        discountDays: isNaN(discountDays) ? 0 : discountDays,
      };
    }

    return { discountPercent: 0, discountDays: 0 };
  };

  // Compute discount eligibility and suggested payment amounts based on payment date
  const updatePaymentDiscountPreview = (bill: any, paymentDateValue: string) => {
    if (!bill) return;

    // Check if discount is from discount field or payment terms
    const storedDiscountAmount = Number(bill.discountAmount || 0) || 0;
    const termMeta = getPaymentTermDiscountMeta(bill.paymentTerms);
    const hasDiscountFromField = storedDiscountAmount > 0;
    const hasDiscountFromPaymentTerms = termMeta.discountPercent > 0;
    
    // If discount is from discount field, balanceDue already reflects the discount
    // If discount is from payment terms, balanceDue is full amount
    const fullAmount = Number(bill.totalAmount || 0); // Always use totalAmount as full amount
    const currentBalanceDue = Number(bill.balanceDue || bill.totalAmount || 0);
    
    // Determine discount amount:
    // - If discount from field: use stored discountAmount, and balanceDue is already discounted
    // - If discount from payment terms: derive from payment terms, balanceDue is full amount
    const discountAmount = hasDiscountFromField
      ? storedDiscountAmount  // Discount already applied to balanceDue
      : (termMeta.discountPercent > 0 ? (fullAmount * termMeta.discountPercent) / 100 : 0);
    
    // The amount to use for calculations:
    // - If discount from field: balanceDue is already discounted, so use fullAmount for discount eligibility
    // - If discount from payment terms: use currentBalanceDue (which is full amount) for discount calculation
    const baseAmountForDiscount = hasDiscountFromField
      ? fullAmount  // Use full amount to calculate discount eligibility
      : currentBalanceDue;  // Use balanceDue (which is full amount for payment terms discount)

    // Parse discount days from payment terms (e.g., "5%/10 Net 30")
    const discountDays = termMeta.discountDays;

    // Determine eligibility by checking:
    // 1. Payment date >= bill date (can't pay before bill is created)
    // 2. Payment date <= due date (within bill validity period)
    // 3. Payment date <= (bill date + discount days) (within discount period)
    // Note: If discount is from field, it's always "eligible" (already applied)
    let eligible = false;
    if (hasDiscountFromField) {
      // Discount from field is always applied, no date checking needed
      eligible = false; // Not "eligible" in the payment terms sense, but already applied
    } else if (discountAmount > 0 && discountDays > 0 && bill.billDate && bill.dueDate) {
      const billDateObj = new Date(bill.billDate);
      billDateObj.setHours(0, 0, 0, 0);
      
      const dueDateObj = new Date(bill.dueDate);
      dueDateObj.setHours(23, 59, 59, 999);
      
      const paymentDateObj = new Date(paymentDateValue);
      paymentDateObj.setHours(0, 0, 0, 0);
      
      const discountDeadline = new Date(billDateObj);
      discountDeadline.setDate(discountDeadline.getDate() + discountDays);
      discountDeadline.setHours(23, 59, 59, 999);
      
      // Check all three conditions
      const isAfterBillDate = paymentDateObj >= billDateObj;
      const isBeforeDueDate = paymentDateObj <= dueDateObj;
      const isWithinDiscountPeriod = paymentDateObj <= discountDeadline;
      
      eligible = isAfterBillDate && isBeforeDueDate && isWithinDiscountPeriod;
    }

    // Calculate payable amount:
    // - If discount from field: balanceDue already reflects discount, so use it directly
    // - If discount from payment terms: apply discount if eligible
    const payableAmount = hasDiscountFromField
      ? currentBalanceDue  // Already discounted, use as-is
      : (eligible
          ? Math.max(baseAmountForDiscount - discountAmount, 0)
          : baseAmountForDiscount);

    setPaymentDiscountPreview({
      eligible,
      discountAmount,
      payableAmount,
      fullAmount: hasDiscountFromField ? fullAmount : currentBalanceDue,
      discountDays,
    });

    // Prefill payment amount:
    // - If discount from field: use currentBalanceDue (already discounted)
    // - If discount from payment terms: use discounted amount if eligible, else full amount
    const current = parseFloat(paymentAmount || "0");
    const isUnset = !paymentAmount || paymentAmount === "0";
    if (hasDiscountFromField) {
      // Discount from field: always use the discounted balanceDue
      if (isUnset || Math.abs(current - fullAmount) < 0.01) {
        setPaymentAmount(currentBalanceDue.toFixed(2));
      }
    } else if (eligible) {
      // Payment terms discount eligible: use discounted amount
      if (isUnset || Math.abs(current - baseAmountForDiscount) < 0.01) {
        setPaymentAmount(payableAmount.toFixed(2));
      }
    } else {
      // Not eligible: use full amount
      if (isUnset || current < baseAmountForDiscount - 0.01 || Math.abs(current - payableAmount) < 0.01) {
        setPaymentAmount(baseAmountForDiscount.toFixed(2));
      }
    }
  };

  const handleRecordPayment = (bill: any) => {
    setSelectedBillForPayment(bill);
    const today = getCurrentDateString();
    setPaymentDate(today);
    setPaymentMethod("bank_transfer");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentError(null); // Clear any previous errors
    
    // Set initial payment amount to full outstanding amount
    const fullAmount = Number(bill.balanceDue || bill.totalAmount || 0) || 0;
    setPaymentAmount(fullAmount.toFixed(2));
    
    // Update discount preview (this will check eligibility but won't change payment amount)
    updatePaymentDiscountPreview(bill, today);
    setShowPaymentDialog(true);
  };

  const handleViewAttachments = (bill: any) => {
    setSelectedBillForAttachments(bill);
    setShowAttachmentsDialog(true);
  };

  const handleViewPaymentDetails = async (bill: any) => {
    try {
      setSelectedBillForPaymentDetails(bill);
      setPaymentDetails(null);
      setShowPaymentDetailsDialog(true);

      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/crm/bill/${bill.id}/payment`),
        {
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "No Payment Found",
            description: "No payment transaction found for this bill.",
            variant: "destructive",
          });
          setShowPaymentDetailsDialog(false);
          return;
        }
        throw new Error("Failed to fetch payment details");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setPaymentDetails(data.data);
      } else {
        throw new Error("Invalid payment details response");
      }
    } catch (error) {
      console.error("Error fetching payment details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payment details",
        variant: "destructive",
      });
      setShowPaymentDetailsDialog(false);
    }
  };

  const downloadAttachment = async (fileName: string, billId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/files/download/${fileName}`),
        {
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download attachment",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number | string) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Debug logging
  console.log("🚀 Bill Management Debug:", {
    clientId,
    vendors: Array.isArray(vendors) ? vendors.length : 0,
    vendorsLoading,
    vendorsError,
    bills: bills.length,
    isLoading,
    vendorsSample: Array.isArray(vendors) ? vendors.slice(0, 2) : [], // Show first 2 vendors for structure
  });

  if (!clientId) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a client to manage bills
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Bill Management</h2>
          <p className="text-muted-foreground">
            Create and manage vendor bills
          </p>
        </div>
        <Button onClick={handleNewBill}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Date Range Filter */}
          <div className="mb-4 flex flex-wrap items-end gap-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                Date Range:
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={showCustomDate ? 'custom' : datePreset} 
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setShowCustomDate(true);
                    setDatePreset('custom');
                  } else {
                    setShowCustomDate(false);
                    setDatePreset(value);
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="current-year">Current Year</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="year-to-date">Year to Date</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showCustomDate && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-filter-start" className="text-sm">
                    From
                  </Label>
                  <Input
                    id="date-filter-start"
                    type="date"
                    value={dateFilterStart}
                    onChange={(e) => setDateFilterStart(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-filter-end" className="text-sm">
                    To
                  </Label>
                  <Input
                    id="date-filter-end"
                    type="date"
                    value={dateFilterEnd}
                    onChange={(e) => setDateFilterEnd(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
            {(dateFilterStart || dateFilterEnd) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFilterStart('');
                  setDateFilterEnd('');
                  setDatePreset('all');
                  setShowCustomDate(false);
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filter
              </Button>
            )}
            {(dateFilterStart || dateFilterEnd) && (
              <div className="text-sm text-muted-foreground">
                Showing {sortedBills.length} of {bills.length} bills
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('billNumber')}
                  >
                    <div className="flex items-center gap-2">
                      Bill #
                      {sortField === 'billNumber' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'billNumber' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('vendorName')}
                  >
                    <div className="flex items-center gap-2">
                      Vendor
                      {sortField === 'vendorName' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'vendorName' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('billDate')}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      {sortField === 'billDate' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'billDate' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('dueDate')}
                  >
                    <div className="flex items-center gap-2">
                      Due Date
                      {sortField === 'dueDate' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'dueDate' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('totalAmount')}
                  >
                    <div className="flex items-center gap-2">
                      Amount
                      {sortField === 'totalAmount' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'totalAmount' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'status' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBills.map((bill: any) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">
                      {bill.billNumber}
                    </TableCell>
                    <TableCell>{bill.vendorName}</TableCell>
                    <TableCell>
                      {bill.billDate
                        ? (() => {
                            try {
                              // If it's already in YYYY-MM-DD format, convert to MM/DD/YY for display
                              if (/^\d{4}-\d{2}-\d{2}$/.test(bill.billDate)) {
                                const [year, month, day] = bill.billDate
                                  .split("-")
                                  .map(Number);
                                const date = new Date(year, month - 1, day);
                                return date.toLocaleDateString("en-US", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "2-digit",
                                });
                              }
                              // For other formats, use timezone-aware formatting
                              const date = parseDateInUserTimezone(
                                bill.billDate
                              );
                              return formatDateForDisplay(date);
                            } catch (error) {
                              return bill.billDate;
                            }
                          })()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {bill.dueDate
                        ? (() => {
                            try {
                              // If it's already in YYYY-MM-DD format, convert to MM/DD/YY for display
                              if (/^\d{4}-\d{2}-\d{2}$/.test(bill.dueDate)) {
                                const [year, month, day] = bill.dueDate
                                  .split("-")
                                  .map(Number);
                                const date = new Date(year, month - 1, day);
                                return date.toLocaleDateString("en-US", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "2-digit",
                                });
                              }
                              // For other formats, use timezone-aware formatting
                              const date = parseDateInUserTimezone(
                                bill.dueDate
                              );
                              return formatDateForDisplay(date);
                            } catch (error) {
                              return bill.dueDate;
                            }
                          })()
                        : "N/A"}
                    </TableCell>
                    <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(bill.status)}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(bill)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(bill)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecordPayment(bill)}
                          disabled={bill.status === "paid"}
                          title={
                            bill.status === "paid"
                              ? "Bill is already paid"
                              : "Record Payment"
                          }
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        {bill.status === "paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPaymentDetails(bill)}
                            title="View Payment Transaction"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {bill.attachments && bill.attachments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAttachments(bill)}
                            title="View Attachments"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Bill Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBill ? "Edit Bill" : "Create New Bill"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Number *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <FormControl>
                        <select
                          value={field.value ? String(field.value) : ""}
                          onChange={(e) => {
                            console.log("🚀 Vendor selected:", e.target.value);
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            );
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">
                            {vendorsLoading
                              ? "Loading vendors..."
                              : !Array.isArray(vendors) || vendors.length === 0
                              ? "No vendors found"
                              : "Select vendor"}
                          </option>
                          {Array.isArray(vendors) &&
                            vendors.map((vendor: any) => (
                              <option key={vendor.id} value={String(vendor.id)}>
                                {vendor.name}{" "}
                                {vendor.companyName
                                  ? `(${vendor.companyName})`
                                  : ""}
                              </option>
                            ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // Calculate and update due date when bill date changes
                            const paymentTerms =
                              form.watch("paymentTerms") || "Net 30";
                            if (e.target.value) {
                              const calculatedDueDate = calculateDueDate(
                                e.target.value,
                                paymentTerms
                              );
                              if (calculatedDueDate) {
                                form.setValue("dueDate", calculatedDueDate);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Project Selection */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <select
                            value={field.value?.toString() || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">No project</option>
                            {projects.map((project: any) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCreateProject(true)}
                            className="px-3"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>File Attachments (Optional)</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.docx,.doc"
                      onChange={(e) => {
                        if (e.target.files) {
                          setAttachedFiles(Array.from(e.target.files));
                        }
                      }}
                      className="text-sm"
                    />
                    {attachedFiles.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {attachedFiles.length} file(s) selected
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-medium">Items 1234</Label>
                  <Button type="button" variant="outline" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Description</TableHead>
                        <TableHead className="w-[20%]">Account</TableHead>
                        <TableHead className="w-[12%]">Quantity</TableHead>
                        <TableHead className="w-[12%]">Rate</TableHead>
                        <TableHead className="w-[12%]">Amount</TableHead>
                        <TableHead className="w-[14%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Item description"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <AllAccountDropdown
                                clientId={clientId}
                                value={
                                  item.accountId > 0
                                    ? item.accountId.toString()
                                    : ""
                                }
                                onValueChange={(value) =>
                                  updateItem(
                                    item.id,
                                    "accountId",
                                    parseInt(value)
                                  )
                                }
                                placeholder="Select account"
                                showAccountNumbers={true}
                                className="flex-1"
                                zIndex={99999}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => refetchAccounts()}
                                title="Refresh accounts"
                              >
                                ↻
                              </Button>
                            </div>
                            {allAccounts.length === 0 && (
                              <p className="text-sm text-red-500 mt-1">
                                No accounts available
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "quantity",
                                  Number(e.target.value)
                                )
                              }
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.rate || ""}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "rate",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              min="0"
                              step="0.01"
                              className="w-full min-w-[100px]"
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={
                                item.amount
                                  ? Number(item.amount).toFixed(2)
                                  : "0.00"
                              }
                              readOnly
                              className="bg-gray-50 font-medium text-right w-full min-w-[120px]"
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              disabled={billItems.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="discountPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            {...field}
                            onChange={(e) => {
                              const newValue = Number(e.target.value);
                              field.onChange(newValue);
                              
                              // If discount field is being used, clear payment terms discount
                              if (newValue > 0) {
                                const currentPaymentTerms = form.watch("paymentTerms");
                                const termMeta = getPaymentTermDiscountMeta(currentPaymentTerms);
                                if (termMeta.discountPercent > 0) {
                                  // Payment terms have discount - clear it
                                  form.setValue("paymentTerms", "Net 30"); // Reset to default non-discount term
                                  setPaymentTermDiscountInfo(null);
                                  setDiscountConflictError(
                                    "Cannot use both discount field and payment terms discount. Payment terms have been reset to 'Net 30'."
                                  );
                                  // Clear error after 8 seconds (longer so user can read it)
                                  setTimeout(() => setDiscountConflictError(null), 8000);
                                } else {
                                  setDiscountConflictError(null);
                                }
                              } else {
                                setDiscountConflictError(null);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        {discountConflictError && (
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-2">
                            {discountConflictError}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id="useManualTax"
                        checked={useManualTax}
                        onChange={(e) => {
                          setUseManualTax(e.target.checked);
                          if (e.target.checked) {
                            // When switching to manual, keep current tax amount
                            // but clear tax setting selection
                            form.setValue("taxSettingId", "");
                          } else {
                            // When switching back to automatic, recalculate tax
                            calculateTotals();
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor="useManualTax"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Enter tax amount manually
                      </label>
                    </div>
                    {useManualTax ? (
                      <FormField
                        control={form.control}
                        name="taxAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(Number(e.target.value) || 0);
                                  calculateTotals();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="taxSettingId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax</FormLabel>
                            <FormControl>
                              <select
                                className="w-full px-2 py-1 border rounded"
                                value={field.value || "tax-exempt"}
                                onChange={(e) => {
                                  console.log(
                                    "🔍 Tax selection changed to:",
                                    e.target.value
                                  );
                                  field.onChange(e.target.value);
                                }}
                              >
                                <option value="">Select tax</option>
                                {taxSettings.map((tax) => {
                                  console.log("🔍 Rendering tax option:", tax);
                                  return (
                                    <option key={tax.id} value={tax.id}>
                                      {tax.displayText}
                                    </option>
                                  );
                                })}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-4 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(form.watch("subtotal"))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatCurrency(form.watch("discountAmount"))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(form.watch("taxAmount"))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(form.watch("totalAmount"))}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Payment Terms</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPaymentTermsDialog(true)}
                          className="h-8 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Terms
                        </Button>
                      </div>
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={(e) => {
                            const selectedPaymentTerms = e.target.value;
                            field.onChange(selectedPaymentTerms);

                            // Calculate and update due date when payment terms change
                            const billDate = form.watch("billDate");
                            if (billDate) {
                              const calculatedDueDate = calculateDueDate(
                                billDate,
                                selectedPaymentTerms
                              );
                              if (calculatedDueDate) {
                                form.setValue("dueDate", calculatedDueDate);
                              }
                            }

                            // Reset info banner each time
                            setPaymentTermDiscountInfo(null);

                            // If custom term has discount, show info only (no totals change)
                            const customTerm = customPaymentTerms.find(
                              (t) => t.label === selectedPaymentTerms
                            );
                            if (customTerm && customTerm.discountPercent) {
                              const infoDays =
                                customTerm.discountDays ?? customTerm.days;
                              setPaymentTermDiscountInfo(
                                `Discount of ${customTerm.discountPercent}% will be available if paid within ${infoDays} days. Totals stay unchanged until payment.`
                              );
                              // Clear discount field when payment terms discount is selected
                              form.setValue("discountPercent", 0);
                              form.setValue("discountAmount", 0);
                            } else {
                              // Standard formatted discount term like "2%/10 Net 30" -> info only
                              const discountMatch = selectedPaymentTerms.match(
                                /^(\d+)%\/(\d+)\s+Net\s+(\d+)$/i
                              );
                              if (discountMatch) {
                                const discountPercent = parseFloat(
                                  discountMatch[1]
                                );
                                const discountDays = parseFloat(
                                  discountMatch[2]
                                );
                                setPaymentTermDiscountInfo(
                                  `Discount of ${discountPercent}% will be available if paid within ${discountDays} days. Totals stay unchanged until payment.`
                                );
                                // Clear discount field when payment terms discount is selected
                                form.setValue("discountPercent", 0);
                                form.setValue("discountAmount", 0);
                              } else {
                                // No discount in payment terms - clear the discount info
                                setPaymentTermDiscountInfo(null);
                              }
                            }
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Net 15">Net 15</option>
                          <option value="Net 30">Net 30</option>
                          <option value="Net 45">Net 45</option>
                          <option value="Net 60">Net 60</option>
                          <option value="Due on Receipt">Due on Receipt</option>
                          <option value="Others">Others</option>
                          {customPaymentTerms.length > 0 && (
                            <>
                              <option disabled>--- Custom Terms ---</option>
                              {customPaymentTerms.map((term) => (
                                <option key={term.id} value={term.label}>
                                  {term.label}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </FormControl>
                      {paymentTermDiscountInfo && (
                        <p className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                          {paymentTermDiscountInfo}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createBillMutation.isPending || updateBillMutation.isPending
                  }
                  onClick={() => {
                    console.log("🚀 Submit button clicked!");
                    console.log(
                      "🚀 Form errors before submit:",
                      form.formState.errors
                    );
                    console.log("🚀 Form values:", form.getValues());
                    console.log("🚀 Form is valid:", form.formState.isValid);
                  }}
                >
                  {editingBill ? "Update Bill" : "Create Bill"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateProject(false);
                  setNewProjectName("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (newProjectName.trim()) {
                    createProjectMutation.mutate({
                      name: newProjectName.trim(),
                      description: "",
                    });
                  }
                }}
                disabled={
                  createProjectMutation.isPending || !newProjectName.trim()
                }
              >
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) {
            // Reset form when dialog closes
            setSelectedBankAccountId(null);
            setPaymentMethod("bank_transfer");
            setPaymentError(null); // Clear error when dialog closes
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment 123</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bill: {selectedBillForPayment?.billNumber}</Label>
              {(() => {
                const storedDiscountAmount = Number(selectedBillForPayment?.discountAmount || 0) || 0;
                const hasDiscountFromField = storedDiscountAmount > 0;
                const outstandingAmount = paymentDiscountPreview.eligible
                  ? paymentDiscountPreview.payableAmount
                  : selectedBillForPayment?.balanceDue ||
                      selectedBillForPayment?.totalAmount ||
                      0;
                
                return (
                  <>
                    <p className="text-sm text-gray-600">
                      Outstanding: {formatCurrency(outstandingAmount)}
                    </p>
                    {hasDiscountFromField && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-md p-2 text-sm text-green-800">
                        <div className="font-medium">Discount Applied</div>
                        <div>
                          Discount: {formatCurrency(storedDiscountAmount)} (already applied to outstanding amount)
                        </div>
                        <div className="text-xs mt-1 text-green-700">
                          Full amount: {formatCurrency(selectedBillForPayment?.totalAmount || 0)}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              {(() => {
                // Only show payment terms discount info if discount is NOT from discount field
                const storedDiscountAmount = Number(selectedBillForPayment?.discountAmount || 0) || 0;
                const hasDiscountFromField = storedDiscountAmount > 0;
                
                // Don't show payment terms discount info if discount is from discount field
                if (hasDiscountFromField) {
                  return null;
                }
                
                const { discountPercent, discountDays } = getPaymentTermDiscountMeta(
                  selectedBillForPayment?.paymentTerms
                );
                if (discountPercent > 0 && discountDays > 0) {
                  const potentialDiscount = (Number(selectedBillForPayment?.totalAmount || 0) * discountPercent) / 100;
                  return (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-2 text-sm text-blue-800">
                      <div className="font-medium">Payment term discount info</div>
                      <div>
                        Pay within <span className="font-semibold">{discountDays} days</span> to get{" "}
                        <span className="font-semibold">{discountPercent}%</span> (
                        {formatCurrency(potentialDiscount)}). Totals stay unchanged; discount will be evaluated when payment is recorded.
                      </div>
                      <div className="text-xs mt-1 text-blue-700">
                        If the payment term changes, discount eligibility will be recalculated using the updated term and payment date.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <Label htmlFor="paymentAmount">Payment Amount *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the full bill amount (discount will be applied automatically if eligible)
              </p>
            </div>

            {/* Discount Amount Field - Show when eligible */}
            {paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <Label htmlFor="discountAmount" className="text-green-800 font-medium">
                  Discount Amount
                </Label>
                <div className="mt-1">
                  <Input
                    id="discountAmount"
                    type="text"
                    value={formatCurrency(paymentDiscountPreview.discountAmount)}
                    readOnly
                    className="bg-white font-semibold text-green-700"
                  />
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Discount available because payment date is within {paymentDiscountPreview.discountDays} days of bill date
                </p>
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Net Payable:</span>{" "}
                    {formatCurrency(paymentDiscountPreview.payableAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Show message when discount is not eligible but available (only for payment terms discount, not discount field) */}
            {(() => {
              const storedDiscountAmount = Number(selectedBillForPayment?.discountAmount || 0) || 0;
              const hasDiscountFromField = storedDiscountAmount > 0;
              
              // Don't show payment terms discount warning if discount is from discount field
              if (hasDiscountFromField) {
                return null;
              }
              
              return !paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Discount not available:</span>{" "}
                    Payment date must be between bill date and due date, and within{" "}
                    {paymentDiscountPreview.discountDays} days of bill date to qualify for discount.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Full amount payable: {formatCurrency(paymentDiscountPreview.fullAmount)}
                  </p>
                </div>
              ) : null;
            })()}

            <div>
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setPaymentDate(value);
                  updatePaymentDiscountPreview(selectedBillForPayment, value);
                }}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  // Clear account selection if method changes to one that doesn't need an account
                  if (
                    e.target.value !== "bank_transfer" &&
                    e.target.value !== "check" &&
                    e.target.value !== "credit_card"
                  ) {
                    setSelectedBankAccountId(null);
                  }
                }}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="ach">ACH</option>
              </select>
            </div>

            {/* Bank Account Selection - Show for Bank Transfer and Check */}
            {(paymentMethod === "bank_transfer" ||
              paymentMethod === "check") && (
              <div>
                <Label htmlFor="bankAccount">Bank Account *</Label>
                <select
                  id="bankAccount"
                  value={selectedBankAccountId || ""}
                  onChange={(e) =>
                    setSelectedBankAccountId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.length === 0 ? (
                    <option value="" disabled>
                      No bank accounts found
                    </option>
                  ) : (
                    bankAccounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name}{" "}
                        {account.accountNumber
                          ? `(${account.accountNumber})`
                          : ""}
                      </option>
                    ))
                  )}
                </select>
                {bankAccounts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No bank accounts found. Please create a bank account in
                    Chart of Accounts first.
                  </p>
                )}
              </div>
            )}

            {/* Credit Card Account Selection - Show for Credit Card */}
            {paymentMethod === "credit_card" && (
              <div>
                <Label htmlFor="creditCardAccount">Credit Card Account *</Label>
                <select
                  id="creditCardAccount"
                  value={selectedBankAccountId || ""}
                  onChange={(e) =>
                    setSelectedBankAccountId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select credit card account</option>
                  {creditCardAccounts.length === 0 ? (
                    <option value="" disabled>
                      No credit card accounts found
                    </option>
                  ) : (
                    creditCardAccounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name}{" "}
                        {account.accountNumber
                          ? `(${account.accountNumber})`
                          : ""}
                      </option>
                    ))
                  )}
                </select>
                {creditCardAccounts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No credit card accounts found. Please create a credit card
                    account in Chart of Accounts first.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="paymentReference">Reference Number</Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Check number, transaction ID, etc."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Additional notes about this payment"
                className="mt-1"
              />
            </div>

            {/* Error Message Display */}
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Account Required
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p className="mb-3">{paymentError}</p>
                      <a
                        href={`/books${clientId ? `/${clientId}` : ''}?tab=chart-of-accounts`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-red-800 hover:text-red-900 underline transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          const url = `/books${clientId ? `/${clientId}` : ''}?tab=chart-of-accounts`;
                          window.open(url, '_blank');
                        }}
                      >
                        <svg
                          className="w-4 h-4 mr-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Go to Chart of Accounts to create account
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPaymentDialog(false);
                  setSelectedBankAccountId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  // Validate account selection for payment methods that require it
                  if (
                    (paymentMethod === "bank_transfer" ||
                      paymentMethod === "check") &&
                    !selectedBankAccountId
                  ) {
                    toast({
                      title: "Validation Error",
                      description: `Please select a bank account for ${
                        paymentMethod === "check" ? "check" : "bank transfer"
                      } payments`,
                      variant: "destructive",
                    });
                    return;
                  }

                  if (
                    paymentMethod === "credit_card" &&
                    !selectedBankAccountId
                  ) {
                    toast({
                      title: "Validation Error",
                      description:
                        "Please select a credit card account for credit card payments",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Clear any previous errors
                  setPaymentError(null);

                  try {
                    const token = localStorage.getItem("authToken");
                    const headers: Record<string, string> = {
                      "Content-Type": "application/json",
                    };
                    if (token) {
                      headers["Authorization"] = `Bearer ${token}`;
                    }

                    // Calculate actual payment amount to send:
                    // - If discount is eligible, pay the discounted payable amount (cash out)
                    // - Otherwise, pay whatever user entered (full amount)
                    const actualPaymentAmount = paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0
                      ? paymentDiscountPreview.payableAmount
                      : parseFloat(paymentAmount);

                    const paymentData: any = {
                      amount: actualPaymentAmount,
                      paymentDate: paymentDate,
                      paymentMethod: paymentMethod,
                      reference: paymentReference,
                      notes: paymentNotes,
                    };

                    // Include account ID for payment methods that require it
                    if (
                      (paymentMethod === "bank_transfer" ||
                        paymentMethod === "check" ||
                        paymentMethod === "credit_card") &&
                      selectedBankAccountId
                    ) {
                      paymentData.bankAccountId = selectedBankAccountId;
                    }

                    const response = await fetch(
                      apiConfig.buildUrl(
                        `/api/crm/bill/${selectedBillForPayment?.id}/payment`
                      ),
                      {
                        method: "POST",
                        headers,
                        credentials: "include",
                        body: JSON.stringify(paymentData),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      
                      // Check if it's the purchase discount account missing error
                      if (errorData.errorCode === 'PURCHASE_DISCOUNT_ACCOUNT_MISSING' || 
                          (errorData.message && errorData.message.includes('Purchase Discount'))) {
                        // Display error in modal instead of toast
                        setPaymentError(errorData.message || 'Please create a "Purchase Discount" account of type "Expense" or "Cost of Sales" in the Chart of Accounts before recording this payment.');
                        return; // Don't close modal, let user see the error
                      }
                      
                      throw new Error(
                        errorData.message || "Payment recording failed"
                      );
                    }

                    const displayAmount = paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0
                      ? paymentDiscountPreview.payableAmount
                      : parseFloat(paymentAmount);
                    
                    toast({
                      title: "Payment Recorded",
                      description: `Payment of ${formatCurrency(
                        displayAmount
                      )}${paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0 
                        ? ` (with ${formatCurrency(paymentDiscountPreview.discountAmount)} discount)`
                        : ''
                      } recorded successfully`,
                    });

                    // Invalidate queries to refresh bill list
                    queryClient.invalidateQueries({
                      queryKey: ["bills", clientId],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["all-bills", clientId],
                    });

                    setShowPaymentDialog(false);
                    setSelectedBankAccountId(null);
                    setPaymentError(null);
                  } catch (error: any) {
                    // Check if error message contains purchase discount account info
                    if (error.message && error.message.includes('Purchase Discount')) {
                      setPaymentError(error.message);
                    } else {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to record payment",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                disabled={!paymentAmount || !paymentDate || !paymentMethod}
              >
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachments Dialog */}
      <Dialog
        open={showAttachmentsDialog}
        onOpenChange={setShowAttachmentsDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bill Attachments</DialogTitle>
          </DialogHeader>
          {selectedBillForAttachments && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Bill: {selectedBillForAttachments.billNumber}
              </div>
              {selectedBillForAttachments.attachments &&
              selectedBillForAttachments.attachments.length > 0 ? (
                <div className="space-y-2">
                  {selectedBillForAttachments.attachments.map(
                    (file: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">
                            {file.originalName || file.filename}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadAttachment(
                              file.filename,
                              selectedBillForAttachments.id
                            )
                          }
                        >
                          Download
                        </Button>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No attachments found.</p>
              )}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAttachmentsDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete bill{" "}
              <strong>{billToDelete?.billNumber}</strong>?
            </p>
            <p className="text-sm text-red-600">
              This action cannot be undone. The bill and its associated journal
              entries will be permanently deleted.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteBill}
              disabled={deleteBillMutation.isPending}
            >
              {deleteBillMutation.isPending ? "Deleting..." : "Delete Bill"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Terms Dialog - Nested modal with higher z-index */}
      <Dialog
        open={showPaymentTermsDialog}
        onOpenChange={setShowPaymentTermsDialog}
        modal={true}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10000] bg-black/40" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[10001] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="overflow-y-auto max-h-full">
              <DialogHeader>
                <DialogTitle>Add Payment Terms</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="term-label">Label (Optional)</Label>
                  <Input
                    id="term-label"
                    placeholder="e.g., Net 30, Custom Terms"
                    value={newPaymentTerm.label}
                    onChange={(e) =>
                      setNewPaymentTerm({
                        ...newPaymentTerm,
                        label: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to auto-generate from days
                  </p>
                </div>

                <div>
                  <Label htmlFor="term-days">Payment Days *</Label>
                  <Input
                    id="term-days"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={newPaymentTerm.days}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 0;
                      const updatedTerm = { ...newPaymentTerm, days };
                      // Auto-adjust discount days if they exceed the new payment days
                      if (
                        updatedTerm.hasDiscount &&
                        updatedTerm.discountDays > days
                      ) {
                        updatedTerm.discountDays = days;
                      }
                      setNewPaymentTerm(updatedTerm);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of days until payment is due
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has-discount"
                    checked={newPaymentTerm.hasDiscount}
                    onChange={(e) =>
                      setNewPaymentTerm({
                        ...newPaymentTerm,
                        hasDiscount: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="has-discount" className="cursor-pointer">
                    Include early payment discount
                  </Label>
                </div>

                {newPaymentTerm.hasDiscount && (
                  <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                    <div>
                      <Label htmlFor="discount-percent">Discount % *</Label>
                      <Input
                        id="discount-percent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="2"
                        value={newPaymentTerm.discountPercent}
                        onChange={(e) =>
                          setNewPaymentTerm({
                            ...newPaymentTerm,
                            discountPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        e.g., 2 for 2%
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="discount-days">Discount Days *</Label>
                      <Input
                        id="discount-days"
                        type="number"
                        min="0"
                        max={newPaymentTerm.days}
                        placeholder="10"
                        value={newPaymentTerm.discountDays}
                        onChange={(e) => {
                          const discountDays = parseInt(e.target.value) || 0;
                          setNewPaymentTerm({
                            ...newPaymentTerm,
                            discountDays,
                          });
                        }}
                        className={
                          newPaymentTerm.discountDays > newPaymentTerm.days
                            ? "border-red-500"
                            : ""
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Days to pay for discount (must be ≤{" "}
                        {newPaymentTerm.days} days)
                      </p>
                      {newPaymentTerm.discountDays > newPaymentTerm.days && (
                        <p className="text-xs text-red-500 mt-1">
                          ⚠️ Discount days cannot exceed payment days. Discount
                          must be available before the due date.
                        </p>
                      )}
                    </div>
                    {newPaymentTerm.hasDiscount &&
                      newPaymentTerm.discountPercent > 0 &&
                      newPaymentTerm.discountDays > 0 && (
                        <div
                          className={`col-span-2 p-3 rounded-md ${
                            newPaymentTerm.discountDays > newPaymentTerm.days
                              ? "bg-red-50 border border-red-200"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm font-medium">Preview:</p>
                          <p className="text-lg font-bold">
                            {newPaymentTerm.discountPercent}%/
                            {newPaymentTerm.discountDays} Net{" "}
                            {newPaymentTerm.days}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              newPaymentTerm.discountDays > newPaymentTerm.days
                                ? "text-red-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {newPaymentTerm.discountDays >
                            newPaymentTerm.days ? (
                              <span className="font-semibold">
                                ⚠️ Invalid: Discount period cannot exceed
                                payment period
                              </span>
                            ) : (
                              `${newPaymentTerm.discountPercent}% discount if paid within ${newPaymentTerm.discountDays} days, otherwise net ${newPaymentTerm.days} days`
                            )}
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {customPaymentTerms.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Custom Payment Terms</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {customPaymentTerms.map((term) => (
                        <div
                          key={term.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <div>
                            <p className="font-medium">{term.label}</p>
                            {term.discountPercent && (
                              <p className="text-xs text-muted-foreground">
                                {term.discountPercent}% discount within{" "}
                                {term.discountDays} days, Net {term.days} days
                              </p>
                            )}
                            {!term.discountPercent && (
                              <p className="text-xs text-muted-foreground">
                                Net {term.days} days
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePaymentTerm(term.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPaymentTermsDialog(false);
                      setNewPaymentTerm({
                        label: "",
                        days: 30,
                        hasDiscount: false,
                        discountPercent: 0,
                        discountDays: 10,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddPaymentTerm}
                    disabled={
                      newPaymentTerm.days <= 0 ||
                      (newPaymentTerm.hasDiscount &&
                        (newPaymentTerm.discountPercent <= 0 ||
                          newPaymentTerm.discountDays <= 0 ||
                          newPaymentTerm.discountDays > newPaymentTerm.days))
                    }
                  >
                    Add Payment Term
                  </Button>
                </div>
              </div>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog
        open={showPaymentDetailsDialog}
        onOpenChange={setShowPaymentDetailsDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedBillForPaymentDetails && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Bill: {selectedBillForPaymentDetails.billNumber}
              </div>
              {paymentDetails ? (
                <div className="space-y-4">
                  {paymentDetails.payments &&
                  paymentDetails.payments.length > 0 ? (
                    <>
                      {/* Summary */}
                      <div className="bg-muted p-4 rounded-md">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">
                              Total Payments
                            </Label>
                            <div className="text-lg font-semibold">
                              {paymentDetails.paymentCount ||
                                paymentDetails.payments.length}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">
                              Total Amount Paid
                            </Label>
                            <div className="text-lg font-semibold">
                              {formatCurrency(paymentDetails.totalAmount || 0)}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">
                              Bill Total
                            </Label>
                            <div className="text-lg font-semibold">
                              {formatCurrency(
                                selectedBillForPaymentDetails.totalAmount || 0
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payments Table */}
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Payment Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment Method</TableHead>
                              <TableHead>Paid From Account</TableHead>
                              <TableHead>Reference Number</TableHead>
                              <TableHead>Journal Entry ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentDetails.payments.map(
                              (payment: any, index: number) => (
                                <TableRow key={payment.journalEntryId || index}>
                                  <TableCell>
                                    {payment.paymentDate
                                      ? formatDateForDisplay(
                                          payment.paymentDate
                                        )
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {formatCurrency(payment.amount)}
                                  </TableCell>
                                  <TableCell className="capitalize">
                                    {payment.paymentMethod
                                      ? payment.paymentMethod.replace(/_/g, " ")
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {payment.bankAccountName || "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {payment.referenceNumber || "—"}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {payment.journalEntryId
                                      ? `#${payment.journalEntryId}`
                                      : "—"}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No payment transactions found for this bill.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading payment details...</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentDetailsDialog(false);
                    setPaymentDetails(null);
                    setSelectedBillForPaymentDetails(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}