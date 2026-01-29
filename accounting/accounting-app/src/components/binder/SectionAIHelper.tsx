import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SectionAIHelperProps {
  sectionName: string;
  sectionData?: any;
  binderId: number;
}

export function SectionAIHelper({ sectionName, sectionData, binderId }: SectionAIHelperProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const aiMutation = useMutation({
    mutationFn: (prompt: string) =>
      apiRequest('/api/tars/chat', {
        method: 'POST',
        body: {
          message: prompt,
          context: {
            section: sectionName,
            sectionData,
            binderId
          }
        }
      }),
    onSuccess: (data) => {
      setResponse(data.response);
      setMessage('');
    }
  });

  const handleQuickAction = (action: string) => {
    const prompts = {
      analyze: `Analyze the ${sectionName} section data and identify key audit risks and areas of focus.`,
      procedures: `Generate specific audit procedures for the ${sectionName} section.`,
      workpapers: `Create working paper templates for ${sectionName} audit procedures.`
    };
    aiMutation.mutate(prompts[action as keyof typeof prompts]);
    setIsExpanded(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      aiMutation.mutate(`For the ${sectionName} section: ${message.trim()}`);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">AI Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-green-700 hover:bg-green-100"
          >
            {isExpanded ? 'Minimize' : 'Expand'}
          </Button>
        </div>

        {!isExpanded && (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickAction('analyze')}
              disabled={aiMutation.isPending}
              className="text-xs"
            >
              Analyze Section
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickAction('procedures')}
              disabled={aiMutation.isPending}
              className="text-xs"
            >
              Generate Procedures
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickAction('workpapers')}
              disabled={aiMutation.isPending}
              className="text-xs"
            >
              Create Working Papers
            </Button>
          </div>
        )}

        {isExpanded && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('analyze')}
                disabled={aiMutation.isPending}
              >
                Analyze Section
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('procedures')}
                disabled={aiMutation.isPending}
              >
                Generate Procedures
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('workpapers')}
                disabled={aiMutation.isPending}
              >
                Create Working Papers
              </Button>
            </div>

            {response && (
              <div className="bg-white border rounded-lg p-3">
                <div className="text-sm whitespace-pre-wrap">{response}</div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Ask about ${sectionName}...`}
                disabled={aiMutation.isPending}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={aiMutation.isPending || !message.trim()}
                size="sm"
              >
                {aiMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </Card>
  );
}