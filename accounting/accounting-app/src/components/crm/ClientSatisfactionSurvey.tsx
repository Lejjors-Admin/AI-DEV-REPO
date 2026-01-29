import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, Send, Heart, ThumbsUp, MessageSquare, TrendingUp, Award, CheckCircle2 } from "lucide-react";

interface SurveyQuestion {
  id: string;
  question: string;
  type: 'rating' | 'multiple_choice' | 'text' | 'nps';
  required: boolean;
  options?: string[];
  maxRating?: number;
}

interface SurveyResponse {
  questionId: string;
  response: string | number;
}

const surveyQuestions: SurveyQuestion[] = [
  {
    id: 'overall_satisfaction',
    question: 'How satisfied are you with our accounting services overall?',
    type: 'rating',
    required: true,
    maxRating: 5
  },
  {
    id: 'communication_quality',
    question: 'How would you rate the quality of communication from our team?',
    type: 'rating',
    required: true,
    maxRating: 5
  },
  {
    id: 'response_time',
    question: 'How satisfied are you with our response time to your inquiries?',
    type: 'rating',
    required: true,
    maxRating: 5
  },
  {
    id: 'service_quality',
    question: 'How would you rate the quality of our accounting work?',
    type: 'rating',
    required: true,
    maxRating: 5
  },
  {
    id: 'value_for_money',
    question: 'How would you rate the value for money of our services?',
    type: 'rating',
    required: true,
    maxRating: 5
  },
  {
    id: 'recommendation_score',
    question: 'How likely are you to recommend our services to others?',
    type: 'nps',
    required: true
  },
  {
    id: 'service_improvements',
    question: 'What aspects of our service could we improve?',
    type: 'multiple_choice',
    required: false,
    options: [
      'Communication speed',
      'Technical expertise',
      'Pricing',
      'Service variety',
      'Online portal experience',
      'Meeting scheduling',
      'Document sharing',
      'Other'
    ]
  },
  {
    id: 'additional_services',
    question: 'What additional services would you be interested in?',
    type: 'multiple_choice',
    required: false,
    options: [
      'Tax planning consultation',
      'Financial planning advice',
      'Business advisory services',
      'Payroll management',
      'CFO services',
      'Audit preparation',
      'Training and workshops',
      'Technology consulting'
    ]
  },
  {
    id: 'feedback_comments',
    question: 'Please share any additional feedback or suggestions:',
    type: 'text',
    required: false
  }
];

interface ClientSatisfactionSurveyProps {
  onComplete?: () => void;
  surveyId?: string;
}

export default function ClientSatisfactionSurvey({ onComplete, surveyId }: ClientSatisfactionSurveyProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, SurveyResponse>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitSurveyMutation = useMutation({
    mutationFn: async (surveyData: { responses: SurveyResponse[]; surveyId?: string }) => {
      return await apiRequest('/api/crm/satisfaction-survey', {
        method: 'POST',
        body: JSON.stringify(surveyData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({ 
        title: "Survey Submitted", 
        description: "Thank you for your valuable feedback!" 
      });
      onComplete?.();
    },
    onError: (error) => {
      console.error('Error submitting survey:', error);
      toast({ 
        title: "Error", 
        description: "Failed to submit survey. Please try again.",
        variant: "destructive"
      });
    }
  });

  const currentQuestion = surveyQuestions[currentStep];
  const progress = ((currentStep + 1) / surveyQuestions.length) * 100;

  const handleResponse = (questionId: string, response: string | number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { questionId, response }
    }));
  };

  const canProceed = () => {
    if (!currentQuestion.required) return true;
    return responses[currentQuestion.id] !== undefined;
  };

  const handleNext = () => {
    if (currentStep < surveyQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const surveyData = {
      responses: Object.values(responses),
      surveyId
    };
    submitSurveyMutation.mutate(surveyData);
  };

  const renderRatingQuestion = (question: SurveyQuestion) => {
    const maxRating = question.maxRating || 5;
    const currentRating = responses[question.id]?.response as number || 0;

    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
            <button
              key={rating}
              onClick={() => handleResponse(question.id, rating)}
              className={`p-2 rounded-full transition-colors ${
                rating <= currentRating
                  ? 'text-yellow-400 hover:text-yellow-500'
                  : 'text-gray-300 hover:text-gray-400'
              }`}
              data-testid={`rating-${rating}`}
            >
              <Star 
                className="h-8 w-8" 
                fill={rating <= currentRating ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>
        <div className="text-center">
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
          {currentRating > 0 && (
            <p className="mt-2 font-medium">
              Rating: {currentRating} / {maxRating}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderNPSQuestion = (question: SurveyQuestion) => {
    const currentScore = responses[question.id]?.response as number || null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, i) => i).map((score) => (
            <button
              key={score}
              onClick={() => handleResponse(question.id, score)}
              className={`p-3 rounded text-sm font-medium transition-colors ${
                score === currentScore
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              data-testid={`nps-${score}`}
            >
              {score}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>
        {currentScore !== null && (
          <div className="text-center">
            <Badge 
              variant={currentScore >= 9 ? 'default' : currentScore >= 7 ? 'secondary' : 'destructive'}
              className="mt-2"
            >
              {currentScore >= 9 ? 'Promoter' : currentScore >= 7 ? 'Passive' : 'Detractor'}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  const renderMultipleChoiceQuestion = (question: SurveyQuestion) => {
    const currentResponse = responses[question.id]?.response as string || '';

    return (
      <RadioGroup
        value={currentResponse}
        onValueChange={(value) => handleResponse(question.id, value)}
        className="space-y-3"
      >
        {question.options?.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <RadioGroupItem 
              value={option} 
              id={option}
              data-testid={`option-${option.toLowerCase().replace(/\s+/g, '-')}`}
            />
            <Label htmlFor={option} className="text-sm">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  const renderTextQuestion = (question: SurveyQuestion) => {
    const currentResponse = responses[question.id]?.response as string || '';

    return (
      <Textarea
        value={currentResponse}
        onChange={(e) => handleResponse(question.id, e.target.value)}
        placeholder="Please share your thoughts..."
        rows={5}
        className="w-full"
        data-testid="text-response"
      />
    );
  };

  const renderQuestion = (question: SurveyQuestion) => {
    switch (question.type) {
      case 'rating':
        return renderRatingQuestion(question);
      case 'nps':
        return renderNPSQuestion(question);
      case 'multiple_choice':
        return renderMultipleChoiceQuestion(question);
      case 'text':
        return renderTextQuestion(question);
      default:
        return null;
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto" data-testid="survey-complete">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
            <p className="text-gray-600">
              Your feedback has been submitted successfully. We truly appreciate you taking the time 
              to help us improve our services.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Heart className="h-4 w-4 text-red-500" />
                Your opinion matters to us
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Helping us serve you better
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto" data-testid="satisfaction-survey">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Client Satisfaction Survey
            </CardTitle>
            <CardDescription>
              Help us improve our services by sharing your feedback
            </CardDescription>
          </div>
          <Badge variant="outline">
            {currentStep + 1} of {surveyQuestions.length}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Progress</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {currentQuestion.question}
          </h3>
          
          {currentQuestion.required && (
            <Badge variant="secondary" className="text-xs">
              Required
            </Badge>
          )}

          {renderQuestion(currentQuestion)}
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            data-testid="previous-button"
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === surveyQuestions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || submitSurveyMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="submit-button"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitSurveyMutation.isPending ? 'Submitting...' : 'Submit Survey'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                data-testid="next-button"
              >
                Next
              </Button>
            )}
          </div>
        </div>

        {/* Question indicators */}
        <div className="flex justify-center gap-2 pt-4">
          {surveyQuestions.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentStep
                  ? 'bg-blue-600'
                  : index < currentStep
                  ? 'bg-green-600'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}