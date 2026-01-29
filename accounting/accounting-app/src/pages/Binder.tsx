import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, Plus, FileText, FolderPlus, Loader2, Calendar, Folder, Users, Book, Upload, Calculator } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { insertBinderSchema, type InsertBinder } from "@shared/schema";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiConfig } from "@/lib/api-config";

const industries = [
  "Agriculture",
  "Construction",
  "Financial Services",
  "Healthcare",
  "Hospitality",
  "Information Technology",
  "Manufacturing",
  "Non-Profit",
  "Professional Services",
  "Real Estate",
  "Retail",
  "Technology",
  "Transportation",
  "Other"
];

// Form schema for binder creation
const binderSetupSchema = z.object({
  name: z.string().min(1, "Binder name is required"),
  clientId: z.number().min(1, "Please select a client"),
  engagementType: z.enum(["compilation", "review", "audit"]),
  industry: z.string().min(1, "Industry is required"),
  fiscalYearEnd: z.string().min(1, "Fiscal year end is required"),
  createdById: z.number(),
  status: z.string().default("in_progress"),
  notes: z.string().optional(),
  includeBookkeepingData: z.boolean().default(true),
});

type BinderSetupFormValues = z.infer<typeof binderSetupSchema>;

export default function Binder() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  
  console.log("Current location:", location);
  console.log("Extracted ID from params:", id);
  const { user } = useAuth();
  const [isCreatingBinder, setIsCreatingBinder] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [binderToDelete, setBinderToDelete] = useState<number | null>(null);
  const [openAIGenerating, setOpenAIGenerating] = useState(false);
  const [showCaseWareImport, setShowCaseWareImport] = useState(false);
  const [casewareImporting, setCasewareImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Debug the dialog state
  console.log("Current showCaseWareImport state:", showCaseWareImport);

  // Fetch clients for dropdown
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/clients", { signal })
        .then(res => res.json()),
  });

  // Fetch binders for client (or all)
  const { data: binders, isLoading: isLoadingBinders } = useQuery({
    queryKey: ["/api/binders"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/binders", { signal })
        .then(res => res.json()),
  });

  // Set up form validation for creating a new binder
  const form = useForm<BinderSetupFormValues>({
    resolver: zodResolver(binderSetupSchema),
    defaultValues: {
      name: "",
      clientId: 0,
      engagementType: "compilation",
      industry: "",
      fiscalYearEnd: new Date().toISOString().split('T')[0],
      createdById: user?.id || 0,
      status: "in_progress",
      notes: "",
      includeBookkeepingData: true,
    },
  });

  // Create new binder mutation
  const createBinderMutation = useMutation({
    mutationFn: async (data: BinderSetupFormValues) => {
      return await apiRequest("POST", "/api/binders", data)
        .then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/binders"] });
      setIsCreatingBinder(false);
      toast({
        title: "Success",
        description: "Binder created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete binder mutation
  const deleteBinderMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/binders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/binders"] });
      toast({
        title: "Success",
        description: "Binder deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteBinder = (binderId: number) => {
    setBinderToDelete(binderId);
    setShowConfirmDialog(true);
  };

  const confirmDelete = () => {
    if (binderToDelete) {
      deleteBinderMutation.mutate(binderToDelete);
      setShowConfirmDialog(false);
      setBinderToDelete(null);
    }
  };

  const generateWithOpenAI = async (binderId: number) => {
    setOpenAIGenerating(true);
    try {
      const response = await apiRequest("POST", `/api/binders/${binderId}/generate-ai`);
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/binders"] });
      
      toast({
        title: "Success",
        description: `Generated ${result.sectionsCreated || 0} sections using AI`,
      });
    } catch (error) {
      toast({
        title: "AI Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate sections",
        variant: "destructive",
      });
    } finally {
      setOpenAIGenerating(false);
    }
  };

  const importFromCaseWare = async () => {
    if (!selectedFile) return;
    
    setCasewareImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('binderId', id || '');
    
    try {
      const response = await fetch('/api/caseware/import', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to import CaseWare file');
      }
      
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/binders"] });
      
      toast({
        title: "Import Successful",
        description: `Imported ${result.sectionsCreated || 0} sections from CaseWare`,
      });
      
      setShowCaseWareImport(false);
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import CaseWare file",
        variant: "destructive",
      });
    } finally {
      setCasewareImporting(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: BinderSetupFormValues) => {
    createBinderMutation.mutate(values);
  };

  // Fetch binder sections for detail view
  const { data: binderSections } = useQuery({
    queryKey: ["/api/binders", id, "sections"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl(`/api/binders/${id}/sections`), { signal })
        .then(res => res.json()),
    enabled: !!id
  });

  // If viewing a specific binder
  if (id) {
    const currentBinder = binders?.find((b: any) => b.id === parseInt(id));
    
    if (!currentBinder) {
      return (
        <div className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Binder Not Found</h3>
            <p className="text-gray-500 mb-4">The requested binder could not be found.</p>
            <Button onClick={() => navigate("/binder")}>Back to Binders</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentBinder.name}</h1>
            <p className="text-gray-600">
              {clients?.find((c: any) => c.id === currentBinder.clientId)?.name || "Unknown Client"} • 
              {currentBinder.engagementType} • 
              {currentBinder.industry}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={
              currentBinder.status === "completed" ? "default" : 
              currentBinder.status === "review" ? "secondary" : 
              "outline"
            }>
              {currentBinder.status}
            </Badge>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Progress and Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentBinder.completionPercentage || 0}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentBinder.completionPercentage || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{currentBinder.status}</div>
              <div className="text-sm text-gray-500 mt-1">Current stage</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Year End</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Date(currentBinder.fiscalYearEnd).getFullYear()}</div>
              <div className="text-sm text-gray-500 mt-1">{currentBinder.fiscalYearEnd}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="sections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-4">
            {binderSections?.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Binder Sections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {binderSections.map((section: any) => (
                      <div key={section.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{section.sectionName}</h3>
                            <p className="text-sm text-gray-500">{section.description}</p>
                          </div>
                          <Badge variant={section.isComplete ? "default" : "outline"}>
                            {section.isComplete ? "Complete" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Book className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Sections Yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md">
                      Your binder doesn't have any sections yet. Add sections manually or use our AI generation to create a complete structure.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Section
                      </Button>
                      <Button 
                        onClick={() => generateWithOpenAI(parseInt(id))}
                        disabled={openAIGenerating}
                      >
                        {openAIGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {openAIGenerating ? "Generating..." : "Generate with AI"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Documents</h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Upload and manage engagement documents here.
                  </p>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Timeline</h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Track the progress and history of your engagement here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Notes</CardTitle>
                <CardDescription>
                  Add general notes about this engagement for the team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="Add notes about the engagement..."
                  className="min-h-[200px]"
                  defaultValue={currentBinder.notes || ""}
                />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>Save Notes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // If viewing the binder list (no specific ID)
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Binders</h1>
        <Button onClick={() => setIsCreatingBinder(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create New Binder
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Binders</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="review">In Review</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoadingBinders ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : binders && binders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {binders
            .filter((binder: any) => selectedTab === "all" || binder.status === selectedTab)
            .map((binder: any) => (
              <Card key={binder.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{binder.name}</CardTitle>
                    <Badge variant={
                      binder.status === "completed" ? "default" : 
                      binder.status === "review" ? "secondary" : 
                      "outline"
                    }>
                      {binder.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <CardDescription>
                    {clients?.find((c: any) => c.id === binder.clientId)?.name || "Unknown Client"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <dl className="grid grid-cols-3 gap-1">
                    <dt className="col-span-1 text-sm font-medium text-gray-600">Type:</dt>
                    <dd className="col-span-2 text-sm capitalize">{binder.engagementType}</dd>

                    <dt className="col-span-1 text-sm font-medium text-gray-600">Industry:</dt>
                    <dd className="col-span-2 text-sm">{binder.industry}</dd>

                    <dt className="col-span-1 text-sm font-medium text-gray-600">Year End:</dt>
                    <dd className="col-span-2 text-sm">{binder.fiscalYearEnd}</dd>
                  </dl>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="flex w-full justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/binder/${binder.id}`)}
                    >
                      <Book className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteBinder(binder.id)}
                    >
                      <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Binders Found</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                You haven't created any binders yet. Create your first engagement binder to get started.
              </p>
              <Button onClick={() => setIsCreatingBinder(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Binder
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Binder Dialog */}
      <Dialog open={isCreatingBinder} onOpenChange={setIsCreatingBinder}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Binder</DialogTitle>
            <DialogDescription>
              Set up a new engagement binder for your client.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Binder Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Corp 2024 Tax Return" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="engagementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select engagement type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="compilation">Compilation</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalYearEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeBookkeepingData"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Include Bookkeeping Data
                      </FormLabel>
                      <DialogDescription>
                        Import transactions and accounts from the bookkeeping module
                      </DialogDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreatingBinder(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBinderMutation.isPending}>
                  {createBinderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Binder"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the binder and all of its sections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}