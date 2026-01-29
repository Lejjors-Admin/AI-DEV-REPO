/**
 * CONNIE AI Client Intake Wizard
 * 
 * A conversational, natural language client onboarding experience
 * with industry-specific branching logic and progressive questioning
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Sparkles, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Helper function to handle response errors
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || res.statusText;
    } catch (e) {
      try {
        const text = await res.text();
        errorMessage = text || res.statusText;
      } catch (e2) {
        errorMessage = res.statusText;
      }
    }
    throw new Error(errorMessage);
  }
}
import { useToast } from "@/hooks/use-toast";

interface ConnieWizardProps {
  firmId: number;
  onComplete?: (result: any) => void;
  onClose?: () => void;
}

interface IntakeSession {
  sessionToken: string;
  sessionId: number;
  status: string;
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  required: boolean;
}

interface ChecklistItem {
  title: string;
  description: string;
  category: string;
  priority: string;
  estimatedTime: number;
}

export function ConnieIntakeWizard({ firmId, onComplete, onClose }: ConnieWizardProps) {
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [basicInfo, setBasicInfo] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: ""
  });
  const [detectedIndustry, setDetectedIndustry] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create intake session on component mount
  useEffect(() => {
    createSession();
  }, []);

  const createSession = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/connie/sessions', { 
        firmId,
        referralSource: 'web_wizard'
      });
      
      await throwIfResNotOk(response);
      const data = await response.json();
      
      if (data.success) {
        setSession({
          sessionToken: data.data.sessionToken,
          sessionId: data.data.sessionId,
          status: 'started',
          currentStep: 1,
          totalSteps: 5,
          completionPercentage: 0
        });
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({
        title: "Error",
        description: "Failed to start the intake process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveBasicInfo = async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', `/api/connie/sessions/${session.sessionToken}/basic-info`, basicInfo);
      
      await throwIfResNotOk(response);
      const data = await response.json();
      
      if (data.success) {
        setDetectedIndustry(data.data.detectedIndustry);
        setConfidence(data.data.confidence);
        setCurrentStep(2);
        
        // Load questions for detected industry
        await loadQuestions(data.data.detectedIndustry);
        
        toast({
          title: "Great!",
          description: data.data.message,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Failed to save basic info:', error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async (industry: string) => {
    try {
      const response = await apiRequest('GET', `/api/connie/questions/${industry}`);
      await throwIfResNotOk(response);
      const data = await response.json();
      
      if (data.success) {
        setQuestions(data.data.questions);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const saveAnswers = async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      
      const response = await apiRequest('POST', `/api/connie/sessions/${session.sessionToken}/answers`, { answers: formattedAnswers });
      
      await throwIfResNotOk(response);
      const data = await response.json();
      
      if (data.success) {
        setCurrentStep(3);
        await generateChecklist();
      }
    } catch (error) {
      console.error('Failed to save answers:', error);
      toast({
        title: "Error",
        description: "Failed to save your responses. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateChecklist = async () => {
    if (!session) return;
    
    try {
      const response = await apiRequest('POST', `/api/connie/sessions/${session.sessionToken}/generate-checklist`);
      
      await throwIfResNotOk(response);
      const data = await response.json();
      
      if (data.success) {
        setChecklist(data.data.checklist);
        setCurrentStep(4);
        
        toast({
          title: "Checklist Ready!",
          description: data.data.message,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Failed to generate checklist:', error);
      toast({
        title: "Error", 
        description: "Failed to generate your checklist. Please try again.",
        variant: "destructive"
      });
    }
  };

  const completeOnboarding = async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', `/api/connie/sessions/${session.sessionToken}/complete`);
      
      await throwIfResNotOk(response);
      const data = await response.json();
      
      if (data.success) {
        setCurrentStep(5);
        
        toast({
          title: "Welcome!",
          description: data.data.message,
          variant: "default"
        });
        
        // Notify parent component
        onComplete?.(data.data);
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Hi! I'm CONNIE</h2>
        </div>
        <p className="text-muted-foreground text-lg">
          I'm your AI assistant, here to make your bookkeeping onboarding smooth and personalized. 
          Let's start with some basic information about your business.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Tell me about your business
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">What's your business name? *</Label>
            <Input
              id="businessName"
              value={basicInfo.businessName}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="e.g., Acme Consulting Inc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">What should I call you? *</Label>
            <Input
              id="contactName"
              value={basicInfo.contactName}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, contactName: e.target.value }))}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Your email address *</Label>
            <Input
              id="email"
              type="email"
              value={basicInfo.email}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={basicInfo.phone}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={saveBasicInfo}
          disabled={!basicInfo.businessName || !basicInfo.contactName || !basicInfo.email || isLoading}
        >
          {isLoading ? "Analyzing..." : "Continue"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold">Perfect, {basicInfo.contactName}!</h2>
        {detectedIndustry && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-muted-foreground">I detected you're in:</span>
            <Badge variant="secondary" className="text-sm">
              {detectedIndustry.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Math.round(confidence * 100)}% confident
            </Badge>
          </div>
        )}
        <p className="text-muted-foreground">
          Now I'd like to ask a few specific questions to better understand your business needs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Industry-Specific Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <Label className="text-base font-medium">
                {index + 1}. {question.text}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {question.type === 'select' && question.options ? (
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={answers[question.id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                >
                  <option value="">Please select...</option>
                  {question.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : question.type === 'boolean' ? (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={question.id}
                      value="yes"
                      checked={answers[question.id] === 'yes'}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={question.id}
                      value="no"
                      checked={answers[question.id] === 'no'}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                    />
                    No
                  </label>
                </div>
              ) : question.type === 'textarea' ? (
                <Textarea
                  value={answers[question.id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                  placeholder="Please provide details..."
                  rows={3}
                />
              ) : (
                <Input
                  value={answers[question.id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                  placeholder="Your answer..."
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={saveAnswers}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Generate My Checklist"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold">Your Personalized Checklist is Ready!</h2>
        <p className="text-muted-foreground">
          Based on your responses, I've created a customized onboarding checklist for {basicInfo.businessName}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checklist.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <Circle className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{item.title}</h4>
                    <div className="flex gap-2">
                      <Badge 
                        variant={item.priority === 'high' ? 'destructive' : 
                               item.priority === 'medium' ? 'default' : 'secondary'}
                      >
                        {item.priority}
                      </Badge>
                      <Badge variant="outline">
                        {item.estimatedTime}min
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={completeOnboarding} disabled={isLoading}>
          {isLoading ? "Finalizing..." : "Complete Onboarding"}
          <CheckCircle className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-green-600">Welcome to the team!</h2>
        <p className="text-lg text-muted-foreground">
          Congratulations {basicInfo.contactName}! Your onboarding for {basicInfo.businessName} is complete.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">
            I've prepared everything you need to get started with our bookkeeping services. 
            A welcome email with your personalized checklist has been sent to {basicInfo.email}.
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={() => onClose?.()}>
          Close
        </Button>
        <Button variant="outline" onClick={() => window.open('mailto:' + basicInfo.email)}>
          Check Email
        </Button>
      </div>
    </div>
  );

  const getProgressPercentage = () => {
    switch (currentStep) {
      case 1: return 20;
      case 2: return 50;
      case 3: return 80;
      case 4: return 100;
      default: return 0;
    }
  };

  if (!session && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Sparkles className="w-8 h-8 mx-auto animate-pulse text-primary" />
          <p>Starting your personalized onboarding experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of 4</span>
          <span>{getProgressPercentage()}% complete</span>
        </div>
        <Progress value={getProgressPercentage()} className="h-2" />
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
}