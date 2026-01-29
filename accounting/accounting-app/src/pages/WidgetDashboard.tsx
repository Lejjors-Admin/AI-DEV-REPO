import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Settings, 
  GripVertical,
  BarChart3,
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DashboardWidget {
  id: number;
  name: string;
  reportTemplateId?: number;
  position: number;
  size: 'small' | 'medium' | 'large';
  config?: any;
  refreshInterval: number;
}

interface AvailableWidget {
  id?: number;
  name: string;
  description: string;
  category: string;
  type?: string;
}

export default function WidgetDashboard() {
  const queryClient = useQueryClient();
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [selectedWidgetTemplate, setSelectedWidgetTemplate] = useState<string>('');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Fetch user's widgets
  const { data: widgets = [], isLoading: widgetsLoading } = useQuery({
    queryKey: ['/api/dashboard/widgets'],
  });

  // Fetch available widget types
  const { data: availableWidgets } = useQuery({
    queryKey: ['/api/dashboard/available-widgets'],
  });

  // Add widget mutation
  const addWidgetMutation = useMutation({
    mutationFn: async (data: { name: string; reportTemplateId?: number; size: string; position: number }) => {
      return await apiRequest('POST', '/api/dashboard/widgets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/widgets'] });
      setIsAddingWidget(false);
      setSelectedWidgetTemplate('');
    },
  });

  // Delete widget mutation
  const deleteWidgetMutation = useMutation({
    mutationFn: async (widgetId: number) => {
      return await apiRequest('DELETE', `/api/dashboard/widgets/${widgetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/widgets'] });
    },
  });

  // Reorder widgets mutation
  const reorderWidgetsMutation = useMutation({
    mutationFn: async (widgets: Array<{ id: number; position: number }>) => {
      return await apiRequest('POST', '/api/dashboard/widgets/reorder', { widgets });
    },
  });

  const handleAddWidget = () => {
    if (!selectedWidgetTemplate) return;

    // Check if it's a built-in widget (string) or report template (number)
    const templateId = parseInt(selectedWidgetTemplate);
    const isTemplate = !isNaN(templateId);
    
    const template = isTemplate
      ? availableWidgets?.templates.find((t: any) => t.id === templateId)
      : availableWidgets?.builtInWidgets.find((w: any) => w.name === selectedWidgetTemplate);

    addWidgetMutation.mutate({
      name: template?.name || 'New Widget',
      reportTemplateId: isTemplate ? templateId : undefined,
      size: widgetSize,
      position: widgets.length,
    });
  };

  const handleDeleteWidget = (widgetId: number) => {
    if (confirm('Are you sure you want to remove this widget?')) {
      deleteWidgetMutation.mutate(widgetId);
    }
  };

  const moveWidget = (widgetId: number, direction: 'up' | 'down') => {
    const widgetIndex = widgets.findIndex((w: DashboardWidget) => w.id === widgetId);
    if (widgetIndex === -1) return;

    const newIndex = direction === 'up' ? widgetIndex - 1 : widgetIndex + 1;
    if (newIndex < 0 || newIndex >= widgets.length) return;

    const reorderedWidgets = [...widgets];
    const [movedWidget] = reorderedWidgets.splice(widgetIndex, 1);
    reorderedWidgets.splice(newIndex, 0, movedWidget);

    // Update positions
    const updates = reorderedWidgets.map((w: DashboardWidget, idx: number) => ({
      id: w.id,
      position: idx,
    }));

    reorderWidgetsMutation.mutate(updates);
    
    // Optimistically update UI
    queryClient.setQueryData(['/api/dashboard/widgets'], reorderedWidgets.map((w, idx) => ({
      ...w,
      position: idx,
    })));
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'large':
        return 'col-span-2 row-span-2';
      default:
        return 'col-span-1';
    }
  };

  const getIcon = (widgetName: string) => {
    if (widgetName.includes('Client')) return Users;
    if (widgetName.includes('Revenue')) return DollarSign;
    if (widgetName.includes('Task')) return FileText;
    if (widgetName.includes('Growth')) return TrendingUp;
    return BarChart3;
  };

  const renderWidget = (widget: DashboardWidget) => {
    const Icon = getIcon(widget.name);

    return (
      <Card key={widget.id} className={cn('relative', getSizeClass(widget.size))} data-testid={`widget-${widget.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-sm font-medium">{widget.name}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidget(widget.id, 'up')}
                disabled={widget.position === 0}
                data-testid={`button-move-up-${widget.id}`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveWidget(widget.id, 'down')}
                disabled={widget.position === widgets.length - 1}
                data-testid={`button-move-down-${widget.id}`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteWidget(widget.id)}
                data-testid={`button-delete-${widget.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">
                Data visualization will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (widgetsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Customize your dashboard with widgets</p>
        </div>
        <Dialog open={isAddingWidget} onOpenChange={setIsAddingWidget}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-widget">
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Widget to Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Widget Type</Label>
                <Select
                  value={selectedWidgetTemplate}
                  onValueChange={(value) => setSelectedWidgetTemplate(value)}
                >
                  <SelectTrigger data-testid="select-widget-type">
                    <SelectValue placeholder="Select a widget..." />
                  </SelectTrigger>
                  <SelectContent>
                    
                    {/* Built-in Widgets */}
                    {availableWidgets?.builtInWidgets?.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Built-in Widgets</div>
                        {availableWidgets.builtInWidgets.map((widget: AvailableWidget) => (
                          <SelectItem key={widget.name} value={widget.name}>
                            {widget.name} - {widget.description}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    
                    {/* Report Templates */}
                    {availableWidgets?.templates?.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-2 pt-2">
                          Report Widgets
                        </div>
                        {availableWidgets.templates.map((template: AvailableWidget) => (
                          <SelectItem key={template.id} value={template.id!.toString()}>
                            {template.name} {template.description && `- ${template.description}`}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Widget Size</Label>
                <Select value={widgetSize} onValueChange={(value: any) => setWidgetSize(value)}>
                  <SelectTrigger data-testid="select-widget-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (1x1)</SelectItem>
                    <SelectItem value="medium">Medium (1x1)</SelectItem>
                    <SelectItem value="large">Large (2x2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAddingWidget(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddWidget}
                  disabled={!selectedWidgetTemplate || addWidgetMutation.isPending}
                  data-testid="button-confirm-add-widget"
                >
                  {addWidgetMutation.isPending ? 'Adding...' : 'Add Widget'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Widgets Grid */}
      {widgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Widgets Yet</h3>
            <p className="text-gray-600 mb-4">Add your first widget to customize your dashboard</p>
            <Button onClick={() => setIsAddingWidget(true)} data-testid="button-add-first-widget">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
          {widgets.map((widget: DashboardWidget) => renderWidget(widget))}
        </div>
      )}
    </div>
  );
}
