import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Play, 
  Pause,
  RotateCcw,
  Star,
  Sparkles,
  BookOpen,
  Calculator,
  FileText,
  TrendingUp,
  Users,
  Settings
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  content: {
    heading: string;
    body: string;
    tips?: string[];
    animation?: 'bounce' | 'pulse' | 'wiggle' | 'float' | 'glow';
  };
  interactive?: {
    type: 'click' | 'hover' | 'input';
    element: string;
    expectedAction?: string;
  };
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AccountSync',
    description: 'Your AI-powered accounting platform',
    icon: <Sparkles className="w-6 h-6" />,
    position: 'center',
    content: {
      heading: 'Welcome to the Future of Accounting!',
      body: 'AccountSync combines powerful double-entry bookkeeping with AI automation. Let\'s take a quick tour of your new accounting superpowers!',
      tips: [
        'Complete setup in under 5 minutes',
        'Import from Excel, QBO, or start fresh',
        'AI handles categorization automatically'
      ],
      animation: 'glow'
    }
  },
  {
    id: 'chart-of-accounts',
    title: 'Chart of Accounts',
    description: 'The foundation of your accounting',
    icon: <BookOpen className="w-6 h-6" />,
    target: '[data-tour="chart-of-accounts"]',
    position: 'right',
    content: {
      heading: 'Your Chart of Accounts',
      body: 'This is where all your accounts live - assets, liabilities, equity, income, and expenses. Think of it as your financial blueprint!',
      tips: [
        'Accounts store structure only (no balances)',
        'Import from Excel or create manually',
        'AI suggests proper account numbers'
      ],
      animation: 'bounce'
    },
    interactive: {
      type: 'click',
      element: '[data-tour="chart-of-accounts"]',
      expectedAction: 'navigate to chart of accounts'
    }
  },
  {
    id: 'transactions',
    title: 'Transaction Ledger',
    description: 'Double-entry bookkeeping made easy',
    icon: <Calculator className="w-6 h-6" />,
    target: '[data-tour="transactions"]',
    position: 'left',
    content: {
      heading: 'Transaction Magic',
      body: 'Every transaction automatically balances with double-entry rules. Debits always equal credits - AccountSync ensures this for you!',
      tips: [
        'All transactions link to your chart of accounts',
        'Real-time balance validation',
        'AI categorizes transactions automatically'
      ],
      animation: 'pulse'
    }
  },
  {
    id: 'financial-reports',
    title: 'Financial Reports',
    description: 'Real-time insights from your data',
    icon: <TrendingUp className="w-6 h-6" />,
    target: '[data-tour="reports"]',
    position: 'top',
    content: {
      heading: 'Live Financial Reports',
      body: 'Trial Balance, Balance Sheet, and Income Statement update instantly as you add transactions. No more manual calculations!',
      tips: [
        'Reports calculate from transaction data',
        'Always up-to-date and balanced',
        'Export to Excel or PDF'
      ],
      animation: 'float'
    }
  },
  {
    id: 'binders',
    title: 'Client Binders',
    description: 'Organize client work and documentation',
    icon: <FileText className="w-6 h-6" />,
    target: '[data-tour="binders"]',
    position: 'bottom',
    content: {
      heading: 'Client Binders',
      body: 'Each client gets their own binder with sections, workpapers, and automated compliance tracking. Perfect for audit trails!',
      tips: [
        'Automatic PEG compliance validation',
        'AI generates workpaper content',
        'Live data pulls from bookkeeping'
      ],
      animation: 'wiggle'
    }
  },
  {
    id: 'ai-features',
    title: 'AI Automation',
    description: 'Let AI handle the heavy lifting',
    icon: <Star className="w-6 h-6" />,
    target: '[data-tour="ai-features"]',
    position: 'center',
    content: {
      heading: 'AI-Powered Automation',
      body: 'Our AI agents work 24/7 to categorize transactions, reconcile accounts, validate compliance, and generate binder content.',
      tips: [
        'Categorizer Agent: Auto-categorizes transactions',
        'Reconciler Agent: Matches bank transactions',
        'PEG Validator: Ensures compliance standards',
        'Binder Generator: Creates audit documentation'
      ],
      animation: 'glow'
    }
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect with your existing tools',
    icon: <Users className="w-6 h-6" />,
    target: '[data-tour="integrations"]',
    position: 'right',
    content: {
      heading: 'Seamless Integrations',
      body: 'Import from QuickBooks Online, Excel files, or connect your bank feeds. AccountSync speaks your language!',
      tips: [
        'QBO: Direct import of chart and transactions',
        'Excel: Smart parsing of trial balances',
        'Plaid: Automatic bank transaction feeds'
      ],
      animation: 'bounce'
    }
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description: 'Time to explore your new accounting platform',
    icon: <Settings className="w-6 h-6" />,
    position: 'center',
    content: {
      heading: 'Congratulations!',
      body: 'You\'re all set up! Start by creating your first client or importing existing data. Remember, our AI is here to help every step of the way.',
      tips: [
        'Create a client to get started',
        'Import data from Excel or QBO',
        'Check out the help section anytime'
      ],
      animation: 'glow'
    }
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  autoPlay?: boolean;
  allowSkip?: boolean;
}

export function OnboardingTour({ 
  isOpen, 
  onClose, 
  onComplete, 
  autoPlay = false,
  allowSkip = true 
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  // Auto-advance timer
  useEffect(() => {
    if (isPlaying && isOpen) {
      const timer = setTimeout(() => {
        if (currentStep < onboardingSteps.length - 1) {
          nextStep();
        } else {
          setIsPlaying(false);
        }
      }, 5000); // 5 seconds per step

      return () => clearTimeout(timer);
    }
  }, [currentStep, isPlaying, isOpen]);

  // Highlight target element
  useEffect(() => {
    if (currentStepData.target) {
      const element = document.querySelector(currentStepData.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.style.position = 'relative';
        element.style.zIndex = '10000';
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)';
        element.style.borderRadius = '8px';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.style.boxShadow = '';
        highlightedElement.style.zIndex = '';
      }
    };
  }, [currentStep, currentStepData]);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
    onComplete();
    onClose();
  };

  const restartTour = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsPlaying(false);
  };

  const toggleAutoPlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const getAnimationProps = (animation?: string) => {
    switch (animation) {
      case 'bounce':
        return {
          animate: { y: [0, -10, 0] },
          transition: { repeat: Infinity, duration: 2 }
        };
      case 'pulse':
        return {
          animate: { scale: [1, 1.05, 1] },
          transition: { repeat: Infinity, duration: 2 }
        };
      case 'wiggle':
        return {
          animate: { rotate: [0, 5, -5, 0] },
          transition: { repeat: Infinity, duration: 2 }
        };
      case 'float':
        return {
          animate: { y: [0, -15, 0] },
          transition: { repeat: Infinity, duration: 3, ease: "easeInOut" }
        };
      case 'glow':
        return {
          animate: { 
            boxShadow: [
              '0 0 20px rgba(59, 130, 246, 0.3)',
              '0 0 40px rgba(59, 130, 246, 0.6)',
              '0 0 20px rgba(59, 130, 246, 0.3)'
            ]
          },
          transition: { repeat: Infinity, duration: 2 }
        };
      default:
        return {};
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...getAnimationProps(currentStepData.content.animation)}
            className="w-full max-w-lg"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {currentStepData.icon}
                    </motion.div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        {currentStepData.content.heading}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        Step {currentStep + 1} of {onboardingSteps.length}
                      </Badge>
                    </div>
                  </div>
                  
                  {allowSkip && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    {currentStepData.content.body}
                  </p>
                  
                  {currentStepData.content.tips && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 text-sm">Pro Tips:</h4>
                      <ul className="space-y-1">
                        {currentStepData.content.tips.map((tip, index) => (
                          <motion.li
                            key={index}
                            className="text-sm text-gray-600 flex items-start"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                            {tip}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Step Indicators */}
                <div className="flex items-center justify-center space-x-2">
                  {onboardingSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToStep(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'bg-blue-500 w-4'
                          : completedSteps.has(onboardingSteps[index].id)
                          ? 'bg-green-400'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAutoPlay}
                      className="text-xs"
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={restartTour}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={previousStep}
                      disabled={currentStep === 0}
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    {currentStep === onboardingSteps.length - 1 ? (
                      <Button
                        onClick={handleComplete}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        size="sm"
                      >
                        Complete Tour!
                        <Star className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={nextStep}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        size="sm"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}