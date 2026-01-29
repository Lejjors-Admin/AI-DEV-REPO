/**
 * Document Template Management
 * List, view, edit, and manage all document templates
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentTemplate, DocumentTemplate, getDocumentTemplates } from '@/lib/api/document-templates';
import { useSelectedClient } from '@/contexts/SelectedClientContext';

interface DocumentTemplateListProps {
  clientId?: number; // Make it optional since it can come from context
}

export default function DocumentTemplateList({ clientId: propClientId }: DocumentTemplateListProps) {
  const { selectedClientId } = useSelectedClient();
  const params = useParams();
  
  // Get clientId from props, context, or URL params
  const clientId = propClientId || selectedClientId || (params.clientId ? parseInt(params.clientId, 10) : undefined);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

  // Fetch all templates - pass clientId to ensure correct data
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['document-templates', clientId],
    queryFn: () => getDocumentTemplates(undefined, clientId),
    enabled: !!clientId,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (templateId: number) => deleteDocumentTemplate(templateId, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({
        title: 'Template Deleted',
        description: 'The template has been removed',
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (template: DocumentTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Templates</h1>
          <p className="text-gray-600">Manage invoice, cheque, and document templates</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLocation('/document-templates/invoice/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice Template
          </Button>
          <Button variant="outline" onClick={() => setLocation('/document-templates/cheque/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Cheque Template
          </Button>
        </div>
      </div>

      {templates && templates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.documentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {template.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      {template.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.isDefault ? (
                        <Badge variant="default">Default</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/document-templates/${template.documentType}/${template.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Templates Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first document template to customize how your invoices and cheques look
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setLocation('/document-templates/invoice/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice Template
              </Button>
              <Button variant="outline" onClick={() => setLocation('/document-templates/cheque/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Cheque Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
