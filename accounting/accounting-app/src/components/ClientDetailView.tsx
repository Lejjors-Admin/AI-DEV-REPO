import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Briefcase, 
  CheckSquare, 
  DollarSign, 
  FileText, 
  Folder, 
  StickyNote,
  Edit,
  MoreHorizontal,
  User,
  Clock,
  Target,
  CreditCard,
  Upload,
  MessageSquare,
  Activity,
  CalendarDays,
  Send,
  Filter,
  Plus,
  ExternalLink,
  Video,
  TrendingUp
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ObjectUploader } from "./ObjectUploader";
import { apiConfig } from "@/lib/api-config";
import { apiRequest } from "@/lib/queryClient";
import EditClientFormDialog from "./EditClientFormDialog";

interface ClientDetailViewProps {
  clientId: string;
  onBack: () => void;
  hideBackButton?: boolean;
}

export default function ClientDetailView({ clientId, onBack, hideBackButton = false }: ClientDetailViewProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showClientEdit, setShowClientEdit] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch client data
  const { data: clientsResponse, isLoading: clientLoading } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!clientId,
  });

  // Fetch related contacts
  const { data: contactsResponse } = useQuery({
    queryKey: ['/api/contact-management/client', clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/contact-management/client/${clientId}/contacts`);
      return res.json();
    },
    enabled: !!clientId,
  });
  const contacts = contactsResponse?.data || [];

  // Fetch client projects
  const { data: projects = { data: [] } } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch client tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
  });

  // Fetch invoices for this client
  const { data: invoicesResponse } = useQuery({
    queryKey: ['/api/invoices', clientId],
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/invoices/${clientId}`), { credentials: 'include' });
      if (!res.ok) return { success: false, data: [] };
      return res.json();
    },
    enabled: !!clientId,
  });
  const clientInvoices = invoicesResponse?.data || [];

  // Fetch time entries for this client
  const { data: timeEntriesResponse } = useQuery({
    queryKey: ['/api/time/entries', clientId],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(apiConfig.buildUrl(`/api/time/entries?clientId=${clientId}`), { 
        headers,
        credentials: 'include' 
      });
      if (!res.ok) return { success: false, data: [] };
      return res.json();
    },
    enabled: !!clientId,
  });
  const clientTimeEntries = timeEntriesResponse?.data || [];

  // Fetch calendar events for this client
  const { data: eventsResponse } = useQuery({
    queryKey: ['/api/schedule/events', clientId],
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/schedule/events?clientId=${clientId}`), { credentials: 'include' });
      if (!res.ok) return { success: false, data: [] };
      return res.json();
    },
    enabled: !!clientId,
  });
  const clientEvents = eventsResponse?.data || [];

  // Fetch messages for this client
  const { data: messagesResponse } = useQuery({
    queryKey: ['/api/communication/recent', clientId],
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/communication/recent?limit=50&clientId=${clientId}`), { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });
  const clientMessages = Array.isArray(messagesResponse) 
    ? messagesResponse
    : [];

  // Find the specific client
  const client = Array.isArray(clientsResponse) 
    ? clientsResponse.find((c: any) => c.id === parseInt(clientId))
    : null;

  if (clientLoading || !client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }

  // Filter related data
  const clientContacts = Array.isArray(contacts) ? contacts.filter((contact: any) => 
    contact.clientId === parseInt(clientId) || (contact.source === 'client' && contact.clientId === parseInt(clientId))
  ) : [];
  
  const clientProjects = Array.isArray((projects as any)?.data) ? (projects as any).data.filter((project: any) => {
    const projectClientId = typeof project.clientId === 'string' ? parseInt(project.clientId) : project.clientId;
    const targetClientId = parseInt(clientId);
    return projectClientId === targetClientId;
  }) : [];
  
  const clientTasks = Array.isArray(tasks) ? tasks.filter((task: any) => 
    task.clientId === parseInt(clientId)
  ) : [];

  // Split events into upcoming and past
  const now = new Date();
  const upcomingEvents = clientEvents.filter((e: any) => new Date(e.startAt) > now)
    .sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const pastEvents = clientEvents.filter((e: any) => new Date(e.startAt) <= now)
    .sort((a: any, b: any) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  // Calculate stats from real data
  const totalInvoiced = clientInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
  const totalPaid = clientInvoices.filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
  const outstandingBalance = totalInvoiced - totalPaid;
  
  const totalHours = clientTimeEntries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / 60;
  const billableHours = clientTimeEntries.filter((e: any) => e.billable)
    .reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / 60;
  const unbilledHours = clientTimeEntries.filter((e: any) => e.billable && !e.invoiced)
    .reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / 60;

  // Build activity timeline from real data
  const activityEvents = [
    ...clientInvoices.map((inv: any) => ({
      id: `invoice-${inv.id}`,
      date: inv.createdAt || inv.dueDate,
      type: 'invoice',
      icon: CreditCard,
      title: `Invoice ${inv.invoiceNumber} ${inv.status}`,
      description: `$${inv.amount?.toLocaleString()} - ${inv.description || 'Professional Services'}`,
      color: 'text-purple-600'
    })),
    ...clientTimeEntries.slice(0, 10).map((entry: any) => ({
      id: `time-${entry.id}`,
      date: entry.date,
      type: 'time',
      icon: Clock,
      title: `Time logged by ${entry.userName || 'Staff'}`,
      description: `${((entry.duration || 0) / 60).toFixed(2)}h - ${entry.description || 'Work performed'}`,
      color: 'text-blue-600'
    })),
    ...clientEvents.slice(0, 10).map((event: any) => ({
      id: `event-${event.id}`,
      date: event.startAt,
      type: 'appointment',
      icon: CalendarDays,
      title: event.title || 'Meeting',
      description: `Meeting scheduled`,
      color: 'text-green-600'
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!hideBackButton && (
            <>
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-sm text-gray-600">{client.industry || 'General'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
            {client.status}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowClientEdit(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Client
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card data-testid="card-contacts">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Contacts</p>
                <p className="text-2xl font-bold" data-testid="text-contacts-count">{clientContacts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-projects">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Projects</p>
                <p className="text-2xl font-bold" data-testid="text-projects-count">{clientProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-tasks">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Tasks</p>
                <p className="text-2xl font-bold" data-testid="text-tasks-count">{clientTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-files">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Files</p>
                <p className="text-2xl font-bold" data-testid="text-files-count">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-invoices">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">Invoices</p>
                <p className="text-2xl font-bold" data-testid="text-invoices-count">{clientInvoices.length}</p>
                <p className="text-xs text-gray-500" data-testid="text-outstanding-balance">
                  ${outstandingBalance.toLocaleString()} outstanding
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-hours">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-rose-600" />
              <div>
                <p className="text-sm text-gray-600">Hours</p>
                <p className="text-2xl font-bold" data-testid="text-unbilled-hours">{unbilledHours.toFixed(1)}</p>
                <p className="text-xs text-gray-500">unbilled hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-messages">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">Messages</p>
                <p className="text-2xl font-bold" data-testid="text-messages-count">{clientMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-12 text-xs">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          <TabsTrigger value="communication" data-testid="tab-communication">Communication</TabsTrigger>
          <TabsTrigger value="time-tracking" data-testid="tab-time-tracking">Time Tracking</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
          <TabsTrigger value="appointments" data-testid="tab-appointments">Appointments</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
          <TabsTrigger value="files" data-testid="tab-files">Files</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Information */}
            <Card data-testid="card-client-info">
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Business Name</p>
                    <p className="text-sm">{client.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Operating Name</p>
                    <p className="text-sm">{client.operatingName || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Industry</p>
                    <p className="text-sm">{client.industry || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Business Number</p>
                    <p className="text-sm">{client.businessNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Fiscal Year End</p>
                    <p className="text-sm">{client.fiscalYearEnd || 'December 31'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Work Type</p>
                    <p className="text-sm">
                      {Array.isArray(client.workType) ? client.workType.join(', ') : 'Bookkeeping'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card data-testid="card-primary-contact">
              <CardHeader>
                <CardTitle>Primary Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarFallback>
                      {client.contactPersonName ? client.contactPersonName.charAt(0).toUpperCase() : 'N'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{client.contactPersonName || 'Not specified'}</p>
                    <p className="text-sm text-gray-600">{client.contactPersonTitle || 'No title'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{client.contactPersonEmail || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{client.contactPersonPhone || 'No phone provided'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Invoices */}
            <Card data-testid="card-recent-invoices">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Recent Invoices
                  </CardTitle>
                  <Button variant="ghost" size="sm" data-testid="button-view-all-invoices">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clientInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {clientInvoices.slice(0, 3).map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`invoice-item-${invoice.id}`}>
                        <div>
                          <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-600">{invoice.description || 'Professional Services'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${invoice.amount?.toLocaleString()}</p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No invoices yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Meetings */}
            <Card data-testid="card-upcoming-meetings">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Upcoming Meetings
                  </CardTitle>
                  <Button variant="ghost" size="sm" data-testid="button-view-all-appointments">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 2).map((event: any) => (
                      <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg" data-testid={`appointment-item-${event.id}`}>
                        <div className="w-12 h-12 bg-blue-100 rounded flex flex-col items-center justify-center">
                          <p className="text-xs font-semibold text-blue-600">{new Date(event.startAt).getDate()}</p>
                          <p className="text-xs text-blue-600">{new Date(event.startAt).toLocaleDateString('en-US', { month: 'short' })}</p>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-gray-600">{new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                          <p className="text-xs text-gray-500">{event.location || 'No location specified'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No upcoming meetings</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Time Entries */}
            <Card data-testid="card-recent-time-entries">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Time Entries
                  </CardTitle>
                  <Button variant="ghost" size="sm" data-testid="button-view-all-time-entries">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clientTimeEntries.length > 0 ? (
                  <div className="space-y-2">
                    {clientTimeEntries.slice(0, 5).map((entry: any) => (
                      <div key={entry.id} className={`flex items-center justify-between p-2 rounded ${entry.billable ? 'bg-blue-50 border-l-2 border-blue-500' : 'bg-gray-50'}`} data-testid={`time-entry-item-${entry.id}`}>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{entry.projectName || 'No Project'}</p>
                          <p className="text-xs text-gray-600">{entry.userName || 'Staff'} • {new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{((entry.duration || 0) / 60).toFixed(1)}h</p>
                          {entry.billable && !entry.invoiced && (
                            <Badge variant="outline" className="text-xs">Unbilled</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No time entries yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Messages */}
            <Card data-testid="card-recent-messages">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Recent Messages
                  </CardTitle>
                  <Button variant="ghost" size="sm" data-testid="button-view-all-messages">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clientMessages.length > 0 ? (
                  <div className="space-y-3">
                    {clientMessages.slice(0, 3).map((message: any) => (
                      <div key={message.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg" data-testid={`message-item-${message.id}`}>
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{message.subject || 'No subject'}</p>
                            <Badge variant="outline" className="text-xs">{message.type}</Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{message.senderName || 'System'} • {new Date(message.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{message.content?.substring(0, 100)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No messages yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Contacts</CardTitle>
              <p className="text-sm text-gray-600">
                Contact persons associated with this client
              </p>
            </CardHeader>
            <CardContent>
              {clientContacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name & Title</TableHead>
                      <TableHead>Contact Information</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientContacts.map((contact: any) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{contact.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-gray-600">{contact.title || 'No title'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.source === 'client' ? 'outline' : 'default'}>
                            {contact.source === 'client' ? 'Auto' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.isActive ? 'default' : 'secondary'}>
                            {contact.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No contacts found for this client</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Button size="sm">
                  <Target className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clientProjects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientProjects.map((project: any) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-gray-600">{project.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {project.dueDate || 'No due date'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No projects found for this client</p>
                  <Button className="mt-4" size="sm">
                    Create First Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Button size="sm">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clientTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Assigned To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientTasks.map((task: any) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-gray-600">{task.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.priority === 'high' ? 'destructive' : 
                            task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {task.dueDate}
                            </div>
                          ) : (
                            <span className="text-gray-400">No due date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.assignedToId ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">U</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">Assigned</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tasks found for this client</p>
                  <Button className="mt-4" size="sm">
                    Create First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No invoices found</p>
                  <Button className="mt-4" size="sm">
                    Create Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No payments recorded</p>
                  <Button className="mt-4" size="sm">
                    Record Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>File Management</CardTitle>
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                  onGetUploadParameters={async () => {
                    const response = await fetch('/api/objects/upload', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    return {
                      method: 'PUT' as const,
                      url: data.uploadURL,
                    };
                  }}
                  onComplete={async (result) => {
                    // Process each uploaded file
                    for (const file of result.successful || []) {
                      try {
                        await fetch('/api/client-files', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            fileURL: file.uploadURL,
                            fileName: file.name,
                            clientId: client.id
                          })
                        });
                      } catch (error) {
                        console.error('Error setting file ACL:', error);
                      }
                    }
                    toast({
                      title: "Files Uploaded",
                      description: "Files have been uploaded successfully.",
                    });
                  }}
                  buttonClassName="h-8"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </ObjectUploader>
              </div>
              <p className="text-sm text-gray-600">
                Secure file storage and sharing for client documents
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Sample file cards - in a real implementation, these would come from an API */}
                <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">Tax Return 2024.pdf</p>
                      <p className="text-sm text-muted-foreground">2.4 MB • 3 days ago</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium">Financial Statements.xlsx</p>
                      <p className="text-sm text-muted-foreground">1.8 MB • 1 week ago</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="font-medium">Receipts Collection.zip</p>
                      <p className="text-sm text-muted-foreground">15.2 MB • 2 weeks ago</p>
                    </div>
                  </div>
                </Card>
              </div>
              
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Click "Upload Files" above to add documents</p>
                <p className="text-sm text-gray-500 mt-1">
                  Upload documents, spreadsheets, and other files for secure sharing
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card data-testid="card-notes">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Notes</CardTitle>
                <Button size="sm" data-testid="button-add-note">
                  <StickyNote className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Client notes including auto-generated intake information
              </p>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Auto-generated during client intake
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <StickyNote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No notes available</p>
                  <Button className="mt-4" size="sm" data-testid="button-add-first-note">
                    Add First Note
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-total-invoiced">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Invoiced</p>
                    <p className="text-2xl font-bold">${totalInvoiced.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-paid">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-outstanding">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-orange-600">${outstandingBalance.toLocaleString()}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices Table */}
          <Card data-testid="card-invoices-list">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invoices</CardTitle>
                <Button size="sm" data-testid="button-send-invoice">
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clientInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.description || 'Professional Services'}</TableCell>
                        <TableCell>${invoice.amount?.toLocaleString()}</TableCell>
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}
                            data-testid={`badge-status-${invoice.id}`}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" data-testid={`button-view-invoice-${invoice.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No invoices yet</p>
                  <Button className="mt-4" size="sm" data-testid="button-create-first-invoice">
                    Create First Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-4">
          <Card data-testid="card-messages">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Messages & Communications</CardTitle>
                <Button size="sm" data-testid="button-send-message">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                All client communications across email, SMS, and internal messaging
              </p>
            </CardHeader>
            <CardContent>
              {clientMessages.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {clientMessages.map((message: any) => (
                      <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors" data-testid={`message-${message.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {message.type}
                                </Badge>
                                <p className="text-xs text-gray-500">{new Date(message.createdAt).toLocaleDateString()}</p>
                              </div>
                              <p className="font-medium">{message.subject || 'No subject'}</p>
                              <p className="text-sm text-gray-600 mt-1">From: {message.senderName || 'System'}</p>
                              <p className="text-sm text-gray-500 mt-2">{message.content?.substring(0, 150)}...</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" data-testid={`button-view-message-${message.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No messages yet</p>
                  <Button className="mt-4" size="sm" data-testid="button-send-first-message">
                    Send First Message
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time-tracking" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-total-hours">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-billable-hours">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Billable Hours</p>
                    <p className="text-2xl font-bold text-green-600">{billableHours.toFixed(1)}h</p>
                  </div>
                  <CheckSquare className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-unbilled-hours-summary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unbilled Hours</p>
                    <p className="text-2xl font-bold text-orange-600">{unbilledHours.toFixed(1)}h</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Entries Table */}
          <Card data-testid="card-time-entries">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Entries</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" data-testid="button-filter-time">
                    <Filter className="w-4 h-4 mr-2" />
                    All Time
                  </Button>
                  <Button size="sm" data-testid="button-log-time">
                    <Plus className="w-4 h-4 mr-2" />
                    Log Time
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clientTimeEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientTimeEntries.map((entry: any) => (
                      <TableRow key={entry.id} data-testid={`row-time-entry-${entry.id}`}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>{entry.userName || 'Unknown'}</TableCell>
                        <TableCell>{entry.projectName || 'No Project'}</TableCell>
                        <TableCell className="font-semibold">{((entry.duration || 0) / 60).toFixed(2)}h</TableCell>
                        <TableCell>
                          {entry.billable ? (
                            <Badge variant="default" data-testid={`billable-${entry.id}`}>Billable</Badge>
                          ) : (
                            <Badge variant="secondary">Non-billable</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No time entries yet</p>
                  <Button className="mt-4" size="sm" data-testid="button-log-first-time">
                    Log First Time Entry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity/Timeline Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card data-testid="card-activity-feed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Timeline
              </CardTitle>
              <p className="text-sm text-gray-600">
                Chronological feed of all client-related activities
              </p>
            </CardHeader>
            <CardContent>
              {activityEvents.length > 0 ? (
                <div className="space-y-4">
                  <div className="relative border-l-2 border-gray-200 ml-6 space-y-6">
                    {activityEvents.map((activity) => {
                      const IconComponent = activity.icon;
                      return (
                        <div key={activity.id} className="relative" data-testid={`activity-${activity.id}`}>
                          <div className={`absolute -left-[29px] w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center ${activity.color}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="ml-6 bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">{activity.title}</p>
                              <p className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                            </div>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No activity yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Activity will appear here as you work with this client
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6">
          <Card data-testid="card-upcoming-appointments">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Upcoming Appointments
                </CardTitle>
                <Button size="sm" data-testid="button-schedule-meeting">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event: any) => (
                    <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors" data-testid={`appointment-${event.id}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                          <p className="text-lg font-bold text-blue-600">{new Date(event.startAt).getDate()}</p>
                          <p className="text-xs text-blue-600">{new Date(event.startAt).toLocaleDateString('en-US', { month: 'short' })}</p>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{event.title}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              {event.endAt && ` - ${new Date(event.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                            {event.location?.includes('zoom') || event.location?.includes('meet') ? (
                              <Video className="w-4 h-4" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                            {event.location || 'No location specified'}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" data-testid={`button-view-appointment-${event.id}`}>
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No upcoming appointments</p>
                  <Button className="mt-4" size="sm" data-testid="button-schedule-first-meeting">
                    Schedule First Meeting
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-past-appointments">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Past Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastEvents.length > 0 ? (
                <div className="space-y-3">
                  {pastEvents.map((event: any) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`past-appointment-${event.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded flex flex-col items-center justify-center">
                          <p className="text-sm font-semibold text-gray-600">{new Date(event.startAt).getDate()}</p>
                          <p className="text-xs text-gray-500">{new Date(event.startAt).toLocaleDateString('en-US', { month: 'short' })}</p>
                        </div>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-gray-600">{new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No past appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Client Form */}
      <EditClientFormDialog
        isOpen={showClientEdit}
        clientId={clientId}
        onComplete={(client) => {
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
          setShowClientEdit(false);
          toast({
            title: "Client Updated",
            description: `${client.name} has been successfully updated.`,
          });
        }}
        onCancel={() => setShowClientEdit(false)}
      />
    </div>
  );
}