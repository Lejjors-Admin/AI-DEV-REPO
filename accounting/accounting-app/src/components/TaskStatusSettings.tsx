import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ListChecks, Plus, Trash2, GripVertical, Loader2, Edit2, Check, X } from "lucide-react";

interface TaskStatus {
  id: number;
  name: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  isSystemStatus: boolean;
  isDefault: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
}

export default function TaskStatusSettings() {
  const { toast } = useToast();
  const [showNewStatusDialog, setShowNewStatusDialog] = useState(false);
  const [deleteStatusId, setDeleteStatusId] = useState<number | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedColor, setEditedColor] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#6B7280");
  const [draggedStatus, setDraggedStatus] = useState<TaskStatus | null>(null);

  // Fetch task statuses
  const { data: statusesResponse, isLoading } = useQuery({
    queryKey: ["/api/task-statuses"],
  });
  const statuses: TaskStatus[] = statusesResponse?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return await apiRequest("/api/task-statuses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-statuses"] });
      toast({
        title: "Status Created",
        description: "Task status created successfully",
      });
      setShowNewStatusDialog(false);
      setNewStatusName("");
      setNewStatusColor("#6B7280");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task status",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TaskStatus> }) => {
      return await apiRequest(`/api/task-statuses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Status Updated",
        description: "Task status updated successfully",
      });
      setEditingStatusId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/task-statuses/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Status Deleted",
        description: "Task status deleted successfully",
      });
      setDeleteStatusId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task status",
        variant: "destructive",
      });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (statusOrders: { id: number; displayOrder: number }[]) => {
      return await apiRequest("/api/task-statuses/bulk/reorder", {
        method: "PATCH",
        body: JSON.stringify({ statusOrders }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-statuses"] });
      toast({
        title: "Reordered",
        description: "Task statuses reordered successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder task statuses",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newStatusName.trim()) {
      toast({
        title: "Error",
        description: "Status name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ name: newStatusName, color: newStatusColor });
  };

  const handleStartEdit = (status: TaskStatus) => {
    setEditingStatusId(status.id);
    setEditedName(status.name);
    setEditedColor(status.color);
  };

  const handleSaveEdit = () => {
    if (editingStatusId && editedName.trim()) {
      updateMutation.mutate({
        id: editingStatusId,
        data: { name: editedName, color: editedColor },
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingStatusId(null);
    setEditedName("");
    setEditedColor("");
  };

  const handleDragStart = (status: TaskStatus) => {
    setDraggedStatus(status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetStatus: TaskStatus) => {
    if (!draggedStatus || draggedStatus.id === targetStatus.id) return;

    const sortedStatuses = [...statuses].sort((a, b) => a.displayOrder - b.displayOrder);
    const draggedIndex = sortedStatuses.findIndex((s) => s.id === draggedStatus.id);
    const targetIndex = sortedStatuses.findIndex((s) => s.id === targetStatus.id);

    const reordered = [...sortedStatuses];
    reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedStatus);

    const statusOrders = reordered.map((s, idx) => ({
      id: s.id,
      displayOrder: idx + 1,
    }));

    reorderMutation.mutate(statusOrders);
    setDraggedStatus(null);
  };

  const sortedStatuses = [...statuses].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Task Status Management
              </CardTitle>
              <CardDescription>
                Customize your Kanban board columns - add, edit, reorder, or remove task statuses
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewStatusDialog(true)} data-testid="button-add-status">
              <Plus className="w-4 h-4 mr-2" />
              Add Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Loading statuses...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Status Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStatuses.map((status) => (
                  <TableRow
                    key={status.id}
                    draggable
                    onDragStart={() => handleDragStart(status)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(status)}
                    className="cursor-move hover:bg-gray-50"
                    data-testid={`row-status-${status.id}`}
                  >
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </TableCell>
                    <TableCell>
                      {editingStatusId === status.id ? (
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="max-w-xs"
                          data-testid={`input-edit-name-${status.id}`}
                        />
                      ) : (
                        <span className="font-medium">{status.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingStatusId === status.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editedColor}
                            onChange={(e) => setEditedColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer"
                            data-testid={`input-edit-color-${status.id}`}
                          />
                          <span className="text-xs text-gray-500">{editedColor}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-gray-200"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-xs text-gray-500">{status.color}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {status.isSystemStatus && <Badge variant="outline">System</Badge>}
                        {status.isDefault && <Badge variant="secondary">Default</Badge>}
                        {status.isCompleted && <Badge variant="outline" className="bg-green-50">Final</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.isActive ? "default" : "secondary"}>
                        {status.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingStatusId === status.id ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            data-testid={`button-save-${status.id}`}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-${status.id}`}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(status)}
                            data-testid={`button-edit-${status.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteStatusId(status.id)}
                            disabled={status.isSystemStatus}
                            data-testid={`button-delete-${status.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Status Dialog */}
      <Dialog open={showNewStatusDialog} onOpenChange={setShowNewStatusDialog}>
        <DialogContent data-testid="dialog-new-status">
          <DialogHeader>
            <DialogTitle>Create New Task Status</DialogTitle>
            <DialogDescription>
              Add a new status column to your task board
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status-name">Status Name</Label>
              <Input
                id="status-name"
                placeholder="e.g., Awaiting Review"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                data-testid="input-new-status-name"
              />
            </div>
            <div>
              <Label htmlFor="status-color">Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  id="status-color"
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer"
                  data-testid="input-new-status-color"
                />
                <span className="text-sm text-gray-500">{newStatusColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewStatusDialog(false)}
              data-testid="button-cancel-new-status"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-confirm-new-status"
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteStatusId !== null} onOpenChange={() => setDeleteStatusId(null)}>
        <AlertDialogContent data-testid="dialog-delete-status">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this status? Tasks using this status will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStatusId && deleteMutation.mutate(deleteStatusId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
