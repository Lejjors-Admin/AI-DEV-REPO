import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CustomSectionCreator } from "./CustomSectionCreator";
import { 
  Plus, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Brain,
  Building,
  DollarSign,
  Package,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SectionManagerProps {
  binderId: number;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'assets': return <Building className="w-4 h-4" />;
    case 'liabilities': return <DollarSign className="w-4 h-4" />;
    case 'equity': return <TrendingUp className="w-4 h-4" />;
    case 'income': return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'expenses': return <Package className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

export function SectionManager({ binderId }: SectionManagerProps) {
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available section templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/binder/section-templates'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/binder/section-templates");
      return response.json();
    }
  });

  // Fetch current binder sections
  const { data: currentSections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: [`/api/binder/${binderId}/sections`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/binder/${binderId}/sections`);
      return response.json();
    }
  });

  // Apply template mutation
  const applyTemplatesMutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      const promises = templateIds.map(templateId =>
        apiRequest("POST", `/api/binder/${binderId}/apply-template/${templateId}`, {
          customizations: {}
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/binder/${binderId}/sections`] });
      setSelectedTemplates([]);
      toast({
        title: "Sections Added",
        description: `${selectedTemplates.length} sections have been added to your binder.`,
      });
    },
    onError: (error) => {
      console.error("Error applying templates:", error);
      toast({
        title: "Failed to Add Sections",
        description: "Could not add the selected sections. Please try again.",
        variant: "destructive",
      });
    }
  });

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const applySelectedTemplates = () => {
    if (selectedTemplates.length > 0) {
      applyTemplatesMutation.mutate(selectedTemplates);
    }
  };

  // Filter out templates that are already applied
  const appliedSectionIds = currentSections.map((section: any) => section.sectionId);
  const availableTemplates = templates.filter((template: any) => 
    !appliedSectionIds.includes(template.id)
  );

  const standardTemplates = availableTemplates.filter((t: any) => t.isStandard);
  const customTemplates = availableTemplates.filter((t: any) => !t.isStandard);

  if (showCustomCreator) {
    return (
      <CustomSectionCreator
        binderId={binderId}
        onSectionCreated={() => setShowCustomCreator(false)}
        onClose={() => setShowCustomCreator(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Section Manager</h2>
          <p className="text-gray-600">
            Choose sections for your audit binder. Each binder contains only relevant sections.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCustomCreator(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Create Custom Section
          </Button>
          {selectedTemplates.length > 0 && (
            <Button
              onClick={applySelectedTemplates}
              disabled={applyTemplatesMutation.isPending}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add {selectedTemplates.length} Section{selectedTemplates.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList>
          <TabsTrigger value="standard">Standard Sections</TabsTrigger>
          <TabsTrigger value="custom">Custom Sections</TabsTrigger>
          <TabsTrigger value="current">Current Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standardTemplates.map((template: any) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-all ${
                  selectedTemplates.includes(template.id) 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => toggleTemplate(template.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      {template.name}
                    </div>
                    {selectedTemplates.includes(template.id) && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {template.procedures?.length || 0} procedures
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />
                        TARS enabled
                      </span>
                    </div>
                    <Badge variant={template.category === 'assets' ? 'default' : 'secondary'}>
                      {template.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {customTemplates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Custom Sections Yet</h3>
                <p className="text-gray-600 mb-4">
                  Create custom audit sections tailored to your specific needs using TARS AI.
                </p>
                <Button onClick={() => setShowCustomCreator(true)}>
                  Create First Custom Section
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customTemplates.map((template: any) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all ${
                    selectedTemplates.includes(template.id) 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleTemplate(template.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        {template.name}
                      </div>
                      {selectedTemplates.includes(template.id) && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {template.procedures?.length || 0} procedures
                        </span>
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4" />
                          AI generated
                        </span>
                      </div>
                      <Badge variant="outline">Custom</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          {currentSections.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Sections Added</h3>
                <p className="text-gray-600 mb-4">
                  Add audit sections to this binder to begin your audit work.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentSections.map((section: any) => (
                <Card key={section.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon('assets')}
                        {section.name}
                      </div>
                      <div className="flex items-center gap-1">
                        {section.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {section.status === 'in_progress' && <Clock className="w-4 h-4 text-yellow-600" />}
                        {section.status === 'not_started' && <AlertCircle className="w-4 h-4 text-gray-400" />}
                      </div>
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant={
                        section.status === 'completed' ? 'default' :
                        section.status === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {section.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-gray-500">
                        Order: {section.orderIndex}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}