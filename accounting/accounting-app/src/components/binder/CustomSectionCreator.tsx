import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Sparkles, FileText, Brain, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CustomSectionCreatorProps {
  binderId: number;
  onSectionCreated?: (section: any) => void;
  onClose?: () => void;
}

export function CustomSectionCreator({ binderId, onSectionCreated, onClose }: CustomSectionCreatorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accountType, setAccountType] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [currentRequirement, setCurrentRequirement] = useState("");
  const [currentRisk, setCurrentRisk] = useState("");
  const [currentRegulatory, setCurrentRegulatory] = useState("");
  const [specificRequirements, setSpecificRequirements] = useState<string[]>([]);
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [regulatoryRequirements, setRegulatoryRequirements] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSection, setGeneratedSection] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addRequirement = () => {
    if (currentRequirement.trim()) {
      setSpecificRequirements([...specificRequirements, currentRequirement.trim()]);
      setCurrentRequirement("");
    }
  };

  const addRisk = () => {
    if (currentRisk.trim()) {
      setRiskFactors([...riskFactors, currentRisk.trim()]);
      setCurrentRisk("");
    }
  };

  const addRegulatory = () => {
    if (currentRegulatory.trim()) {
      setRegulatoryRequirements([...regulatoryRequirements, currentRegulatory.trim()]);
      setCurrentRegulatory("");
    }
  };

  const removeItem = (items: string[], setItems: (items: string[]) => void, index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const generateSectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/binder/section-templates/custom", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedSection(data);
      toast({
        title: "Section Generated",
        description: "TARS has created your custom audit section with procedures and working papers.",
      });
    },
    onError: (error) => {
      console.error("Error generating section:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate the custom section. Please try again.",
        variant: "destructive",
      });
    }
  });

  const applySectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/binder/${binderId}/apply-template/${generatedSection.id}`, {
        customizations: {}
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/binder/${binderId}/sections`] });
      toast({
        title: "Section Added",
        description: "Your custom section has been added to the binder.",
      });
      onSectionCreated?.(generatedSection);
      onClose?.();
    },
    onError: (error) => {
      console.error("Error applying section:", error);
      toast({
        title: "Application Failed",
        description: "Could not add the section to your binder. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerate = () => {
    if (!name || !description || !accountType || specificRequirements.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and add at least one requirement.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateSectionMutation.mutate({
      name,
      description,
      accountType,
      businessContext,
      specificRequirements,
      riskFactors,
      regulatoryRequirements
    });
    setIsGenerating(false);
  };

  const handleApplySection = () => {
    applySectionMutation.mutate();
  };

  if (generatedSection) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Generated Section: {generatedSection.name}
          </CardTitle>
          <CardDescription>
            TARS has created a comprehensive audit section with {generatedSection.procedures?.length || 0} procedures 
            and {generatedSection.workpaperTypes?.length || 0} working papers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Procedures
            </h4>
            <div className="space-y-2">
              {generatedSection.procedures?.map((procedure: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium">{procedure.name}</h5>
                    <div className="flex items-center gap-2">
                      <Badge variant={procedure.isRequired ? "default" : "secondary"}>
                        {procedure.isRequired ? "Required" : "Optional"}
                      </Badge>
                      <Badge variant="outline">{procedure.type}</Badge>
                      <span className="text-sm text-gray-500">{procedure.estimatedHours}h</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{procedure.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Working Papers
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {generatedSection.workpaperTypes?.map((paper: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-sm">{paper.name}</h5>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{paper.type}</Badge>
                      {paper.isRequired && <Badge variant="default" className="text-xs">Required</Badge>}
                    </div>
                  </div>
                  {paper.templateContent && (
                    <p className="text-xs text-gray-600">{paper.templateContent}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              TARS Analysis
            </h4>
            <div className="space-y-2">
              {generatedSection.tarsPrompts?.map((prompt: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 bg-blue-50">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-sm">{prompt.name}</h5>
                    <Badge variant="outline" className="text-xs">{prompt.analysisType}</Badge>
                  </div>
                  <p className="text-xs text-gray-600">{prompt.prompt}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleApplySection}
              disabled={applySectionMutation.isPending}
              className="flex-1"
            >
              {applySectionMutation.isPending ? "Adding to Binder..." : "Add to Binder"}
            </Button>
            <Button variant="outline" onClick={() => setGeneratedSection(null)}>
              Modify
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Create Custom Audit Section
        </CardTitle>
        <CardDescription>
          Let TARS design a comprehensive audit section tailored to your specific needs. 
          Provide details about the account or process you want to audit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Section Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Related Party Transactions"
            />
          </div>
          <div>
            <Label htmlFor="accountType">Account Type *</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assets">Assets</SelectItem>
                <SelectItem value="liabilities">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="other">Other/Process</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this audit section should cover..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="businessContext">Business Context</Label>
          <Textarea
            id="businessContext"
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            placeholder="Describe the client's business, industry, or specific circumstances..."
            rows={2}
          />
        </div>

        <div>
          <Label>Specific Requirements *</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={currentRequirement}
              onChange={(e) => setCurrentRequirement(e.target.value)}
              placeholder="Add a specific audit requirement..."
              onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
            />
            <Button type="button" onClick={addRequirement} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specificRequirements.map((req, index) => (
              <Badge key={index} variant="default" className="flex items-center gap-1">
                {req}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeItem(specificRequirements, setSpecificRequirements, index)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label>Risk Factors</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={currentRisk}
              onChange={(e) => setCurrentRisk(e.target.value)}
              placeholder="Add a risk factor to consider..."
              onKeyPress={(e) => e.key === 'Enter' && addRisk()}
            />
            <Button type="button" onClick={addRisk} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {riskFactors.map((risk, index) => (
              <Badge key={index} variant="destructive" className="flex items-center gap-1">
                {risk}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeItem(riskFactors, setRiskFactors, index)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label>Regulatory Requirements</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={currentRegulatory}
              onChange={(e) => setCurrentRegulatory(e.target.value)}
              placeholder="Add regulatory compliance requirements..."
              onKeyPress={(e) => e.key === 'Enter' && addRegulatory()}
            />
            <Button type="button" onClick={addRegulatory} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {regulatoryRequirements.map((reg, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {reg}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeItem(regulatoryRequirements, setRegulatoryRequirements, index)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || generateSectionMutation.isPending}
            className="flex-1 flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            {isGenerating || generateSectionMutation.isPending ? "Generating Section..." : "Generate with TARS"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}