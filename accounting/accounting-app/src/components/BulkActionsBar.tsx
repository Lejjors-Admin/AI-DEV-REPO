import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Trash2, 
  UserCheck, 
  Tag, 
  FileText, 
  CheckCircle,
  XCircle,
  Clock,
  Users,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BulkActionsBarProps {
  selectedItems: string[];
  onClearSelection: () => void;
  onBulkAction: (action: string, value?: string) => Promise<void>;
  itemType: "clients" | "projects" | "tasks";
}

export function BulkActionsBar({ 
  selectedItems, 
  onClearSelection, 
  onBulkAction,
  itemType 
}: BulkActionsBarProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: string, value?: string) => {
    setIsLoading(true);
    try {
      await onBulkAction(action, value);
      toast({
        title: "Bulk Action Complete",
        description: `Successfully updated ${selectedItems.length} ${itemType}`,
      });
      onClearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete bulk action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedItems.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[500px]">
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {selectedItems.length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Status Actions */}
          {itemType === "clients" && (
            <>
              <Select onValueChange={(value) => handleAction("status", value)}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-red-500" />
                      Inactive
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-yellow-500" />
                      Pending
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => handleAction("assign", value)}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Assign Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">John Smith</SelectItem>
                  <SelectItem value="2">Jane Doe</SelectItem>
                  <SelectItem value="3">Mike Johnson</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {itemType === "tasks" && (
            <>
              <Select onValueChange={(value) => handleAction("status", value)}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Set Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => handleAction("priority", value)}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Set Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Universal Actions */}
          <Separator orientation="vertical" className="h-6" />
          
          <Select onValueChange={(value) => handleAction("tag", value)}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Add Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="important">
                <div className="flex items-center gap-2">
                  <Tag className="w-3 h-3 text-red-500" />
                  Important
                </div>
              </SelectItem>
              <SelectItem value="review">
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-blue-500" />
                  Review
                </div>
              </SelectItem>
              <SelectItem value="follow-up">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-orange-500" />
                  Follow-up
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleAction("delete")}
            disabled={isLoading}
            className="h-8"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}