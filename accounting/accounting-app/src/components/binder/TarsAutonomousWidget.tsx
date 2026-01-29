import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Zap, FileDown, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiConfig } from "@/lib/api-config";

interface TarsAutonomousWidgetProps {
  sectionId: string;
  sectionName: string;
  clientId: number;
  binderId: number;
}

export function TarsAutonomousWidget({ sectionId, sectionName, clientId, binderId }: TarsAutonomousWidgetProps) {
  const [autonomousStatus, setAutonomousStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const { toast } = useToast();

  const runAutonomousWorkflow = useMutation({
    mutationFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/tars/autonomous/run`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          sectionName,
          clientId,
          binderId,
          workflow: 'section-analysis'
        })
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setAutonomousStatus('completed');
      toast({
        title: "TARS Analysis Complete",
        description: `Autonomous audit procedures completed for ${sectionName}`,
      });
    },
    onError: () => {
      setAutonomousStatus('error');
      toast({
        title: "Analysis Failed",
        description: "TARS encountered an error during autonomous analysis",
        variant: "destructive"
      });
    }
  });

  const generateWorkpapers = useMutation({
    mutationFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/tars/generate-workpapers`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          sectionName,
          clientId,
          binderId
        })
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Working Papers Generated",
        description: `TARS created ${data.filesGenerated} working papers for ${sectionName}`,
      });
    }
  });

  const getStatusIcon = () => {
    switch (autonomousStatus) {
      case 'running': return <BrainCircuit className="w-4 h-4 animate-pulse text-blue-600" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <BrainCircuit className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (autonomousStatus) {
      case 'running': return 'TARS analyzing...';
      case 'completed': return 'Analysis complete';
      case 'error': return 'Analysis failed';
      default: return 'Ready for autonomous work';
    }
  };

  return (
    <Card className="mb-6 border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-lg">TARS Autonomous Assistant</span>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            onClick={() => {
              setAutonomousStatus('running');
              runAutonomousWorkflow.mutate();
            }}
            disabled={runAutonomousWorkflow.isPending || autonomousStatus === 'running'}
            variant="outline"
            className="h-16 flex-col gap-1"
          >
            <Zap className="w-5 h-5" />
            <span className="text-sm">Run Autonomous Analysis</span>
          </Button>
          
          <Button
            onClick={() => generateWorkpapers.mutate()}
            disabled={generateWorkpapers.isPending}
            variant="outline"
            className="h-16 flex-col gap-1"
          >
            <FileDown className="w-5 h-5" />
            <span className="text-sm">Generate Working Papers</span>
          </Button>
          
          <Button
            onClick={() => {
              // Quick TARS analysis for this specific section
              toast({
                title: "TARS Quick Analysis",
                description: `Running targeted analysis for ${sectionName}...`,
              });
            }}
            variant="outline"
            className="h-16 flex-col gap-1"
          >
            <Play className="w-5 h-5" />
            <span className="text-sm">Quick Analysis</span>
          </Button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>TARS provides autonomous audit assistance for {sectionName.toLowerCase()}. Use the buttons above to:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Run comprehensive automated audit procedures</li>
            <li>Generate relevant working papers and schedules</li>
            <li>Perform quick targeted analysis for this section</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}