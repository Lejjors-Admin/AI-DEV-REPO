/**
 * Rate Management - Phase 4.6
 * 
 * Manage hourly rates:
 * - Staff default rates
 * - Task type rate overrides
 * - Client-specific rate agreements
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:invoke>
<parameter name="apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function RateManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'staff' | 'task-types' | 'clients'>('staff');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch rates
  const { data: staffRates = [] } = useQuery<any[]>({
    queryKey: ['/api/time-tracking/rates/staff'],
  });

  const { data: taskTypeRates = [] } = useQuery<any[]>({
    queryKey: ['/api/time-tracking/rates/task-types'],
  });

  const { data: clientRates = [] } = useQuery<any[]>({
    queryKey: ['/api/time-tracking/rates/clients'],
  });

  // Fetch dropdowns
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    clientId: '',
    taskType: '',
    hourlyRate: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  // Create rate mutation
  const createRateMutation = useMutation({
    mutationFn: (data: any) => {
      const endpoint = activeTab === 'staff'
        ? '/api/time-tracking/rates/staff'
        : activeTab === 'task-types'
        ? '/api/time-tracking/rates/task-types'
        : '/api/time-tracking/rates/clients';

      return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({ title: 'Rate created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/rates'] });
      setDialogOpen(false);
      setFormData({
        userId: '',
        clientId: '',
        taskType: '',
        hourlyRate: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
    }
  });

  const handleSubmit = () => {
    const data: any = {
      hourlyRate: formData.hourlyRate,
      effectiveFrom: formData.effectiveFrom,
    };

    if (activeTab === 'staff') {
      data.userId = parseInt(formData.userId);
    } else if (activeTab === 'task-types') {
      data.taskType = formData.taskType;
    } else if (activeTab === 'clients') {
      data.clientId = parseInt(formData.clientId);
      if (formData.userId) data.userId = parseInt(formData.userId);
      if (formData.taskType) data.taskType = formData.taskType;
    }

    createRateMutation.mutate(data);
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rate Management</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-rate">
              <Plus className="h-4 w-4 mr-2" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="150.00"
                  data-testid="input-hourly-rate"
                />
              </div>

              {activeTab === 'staff' && (
                <div>
                  <Label>Staff Member</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  >
                    <SelectTrigger data-testid="select-staff">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTab === 'task-types' && (
                <div>
                  <Label>Task Type</Label>
                  <Input
                    value={formData.taskType}
                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                    placeholder="e.g., tax_prep, bookkeeping, audit"
                    data-testid="input-task-type"
                  />
                </div>
              )}

              {activeTab === 'clients' && (
                <>
                  <div>
                    <Label>Client</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                    >
                      <SelectTrigger data-testid="select-client-rate">
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
                    <Label>Staff Member (Optional)</Label>
                    <Select
                      value={formData.userId}
                      onValueChange={(value) => setFormData({ ...formData, userId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  data-testid="input-effective-from"
                />
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={createRateMutation.isPending}
                className="w-full"
                data-testid="button-save-rate"
              >
                Save Rate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="staff">Staff Rates</TabsTrigger>
          <TabsTrigger value="task-types">Task Type Rates</TabsTrigger>
          <TabsTrigger value="clients">Client Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffRates.map((rate: any) => (
                <TableRow key={rate.id}>
                  <TableCell>User #{rate.userId}</TableCell>
                  <TableCell>{formatCurrency(rate.hourlyRate)}/hr</TableCell>
                  <TableCell>{new Date(rate.effectiveFrom).toLocaleDateString()}</TableCell>
                  <TableCell>{rate.isActive ? 'Active' : 'Inactive'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="task-types" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Type</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskTypeRates.map((rate: any) => (
                <TableRow key={rate.id}>
                  <TableCell>{rate.taskType}</TableCell>
                  <TableCell>{formatCurrency(rate.hourlyRate)}/hr</TableCell>
                  <TableCell>{rate.description || '-'}</TableCell>
                  <TableCell>{rate.isActive ? 'Active' : 'Inactive'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Task Type</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Effective From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientRates.map((rate: any) => (
                <TableRow key={rate.id}>
                  <TableCell>Client #{rate.clientId}</TableCell>
                  <TableCell>{rate.userId ? `User #${rate.userId}` : 'Any'}</TableCell>
                  <TableCell>{rate.taskType || 'Any'}</TableCell>
                  <TableCell>{formatCurrency(rate.hourlyRate)}/hr</TableCell>
                  <TableCell>{new Date(rate.effectiveFrom).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
