import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// Removed Select components - using simple HTML select elements for better reliability
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, Plus, FileText, FolderPlus, Loader2, Calendar, Folder, Users, Book, Upload, Calculator, Building, TrendingUp, Eye, Edit3, MoreHorizontal, Star, Clock, Target } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
// Removed missing binder schema imports - using custom form validation
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
import { BindersSidebar } from "@/components/BindersSidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiConfig } from "@/lib/api-config";

const industries = [
  "Agriculture", "Construction", "Financial Services", "Healthcare", "Hospitality",
  "Information Technology", "Manufacturing", "Non-Profit", "Professional Services",
  "Real Estate", "Retail", "Technology", "Transportation", "Utilities", "Other"
];

const binderSetupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientId: z.number().min(1, "Client is required"),
  engagementType: z.enum(["compilation", "review", "audit", "notice_to_reader", "bookkeeping", "tax_preparation"]),
  industry: z.string().optional(),
  fiscalYearEnd: z.string().min(1, "Fiscal year end is required"),
  createdById: z.number().min(1, "Created by is required"),
  status: z.enum(["draft", "in_progress", "review", "completed", "archived"]).default("draft"),
  notes: z.string().optional(),
  includeBookkeepingData: z.boolean().default(false),
});

type BinderSetupFormValues = z.infer<typeof binderSetupSchema>;

export default function BinderModern() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isCreatingBinder, setIsCreatingBinder] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [binderToDelete, setBinderToDelete] = useState<number | null>(null);
  const [openAIGenerating, setOpenAIGenerating] = useState(false);
  
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();

  // Fetch binders
  const { data: binders, isLoading: isLoadingBinders } = useQuery({
    queryKey: ["/api/binders"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/binders"), { signal })
        .then(res => res.json()),
  });

  // Fetch clients
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/clients"), { signal })
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
      const response = await fetch(apiConfig.buildUrl("/api/binders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create binder");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/binders"] });
      setIsCreatingBinder(false);
      form.reset();
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
      const response = await fetch(apiConfig.buildUrl(`/api/binders/${id}`), {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete binder");
      }
      
      return response.json();
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
      const response = await fetch(apiConfig.buildUrl(`/api/binders/${binderId}/generate-ai`), {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate AI content");
      }
      
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

  const filteredBinders = binders?.filter((binder: any) => {
    const matchesSearch = binder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clients?.find((c: any) => c.id === binder.clientId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || binder.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const onSubmit = (data: BinderSetupFormValues) => {
    createBinderMutation.mutate(data);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <BindersSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        binders={binders || []}
        onCreateBinder={() => setIsCreatingBinder(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Binders Dashboard</h1>
                  <p className="text-gray-600">Manage your engagement binders and track progress</p>
                </div>
                <Button onClick={() => setIsCreatingBinder(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Binder
                </Button>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Binders</p>
                        <p className="text-2xl font-bold text-gray-900">{binders?.length || 0}</p>
                      </div>
                      <Book className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">In Progress</p>
                        <p className="text-2xl font-bold text-orange-600">{binders?.filter((b: any) => b.status === 'in_progress').length || 0}</p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">In Review</p>
                        <p className="text-2xl font-bold text-purple-600">{binders?.filter((b: any) => b.status === 'review').length || 0}</p>
                      </div>
                      <Eye className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-green-600">{binders?.filter((b: any) => b.status === 'completed').length || 0}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Binders */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Binders</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBinders.slice(0, 5).map((binder: any) => (
                        <TableRow key={binder.id}>
                          <TableCell className="font-medium">{binder.name}</TableCell>
                          <TableCell>
                            {clients?.find((c: any) => c.id === binder.clientId)?.name || "Unknown Client"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{binder.engagementType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              binder.status === "completed" ? "default" : 
                              binder.status === "review" ? "secondary" : 
                              "outline"
                            }>
                              {binder.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${binder.completionPercentage || 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{binder.completionPercentage || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/engagement/${binder.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/engagement/${binder.id}`)}>
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>Edit Binder</DropdownMenuItem>
                                  <DropdownMenuItem>Generate AI Content</DropdownMenuItem>
                                  <DropdownMenuItem>Export Report</DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    Delete Binder
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* All Binders */}
          {activeTab === "all-binders" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">All Binders</h2>
                  <p className="text-gray-600">Manage all your engagement binders</p>
                </div>
                <Button onClick={() => setIsCreatingBinder(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Binder
                </Button>
              </div>

              {isLoadingBinders ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredBinders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBinders.map((binder: any) => (
                    <Card key={binder.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
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
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium">{binder.engagementType}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Year End:</span>
                            <span className="font-medium">{binder.fiscalYearEnd}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress:</span>
                            <span className="font-medium">{binder.completionPercentage || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${binder.completionPercentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-4">
                        <div className="flex justify-between w-full">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/engagement/${binder.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => generateWithOpenAI(binder.id)}
                            disabled={openAIGenerating}
                          >
                            {openAIGenerating ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Star className="w-4 h-4 mr-2" />
                            )}
                            AI Generate
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No binders found</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first binder.</p>
                  <Button onClick={() => setIsCreatingBinder(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Binder
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Placeholder content for other tabs */}
          {activeTab === "metrics" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Metrics</h2>
              <p className="text-gray-600">Detailed metrics and analytics coming soon...</p>
            </div>
          )}

          {activeTab === "my-binders" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">My Binders</h2>
              <p className="text-gray-600">Binders assigned to you...</p>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Templates</h2>
              <p className="text-gray-600">Binder templates for different engagement types...</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Binder Dialog */}
      <Dialog open={isCreatingBinder} onOpenChange={setIsCreatingBinder}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Binder</DialogTitle>
            <DialogDescription>
              Set up a new engagement binder with client information and engagement details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Binder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter binder name" {...field} />
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
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
                        >
                          <option value="">Select client</option>
                          {clients?.map((client: any) => (
                            <option key={client.id} value={client.id.toString()}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="engagementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement Type</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <option value="">Select engagement type</option>
                          <option value="compilation">Compilation</option>
                          <option value="review">Review</option>
                          <option value="audit">Audit</option>
                          <option value="notice_to_reader">Notice to Reader</option>
                          <option value="bookkeeping">Bookkeeping</option>
                          <option value="tax_preparation">Tax Preparation</option>
                        </select>
                      </FormControl>
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
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <option value="">Select industry</option>
                          {industries.map((industry) => (
                            <option key={industry} value={industry}>
                              {industry}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional notes..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreatingBinder(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBinderMutation.isPending}
                  className="min-w-[100px]"
                >
                  {createBinderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
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
              This action cannot be undone. This will permanently delete the binder and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}