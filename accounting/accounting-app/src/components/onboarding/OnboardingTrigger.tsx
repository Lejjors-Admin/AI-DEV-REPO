import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Play, 
  Sparkles, 
  RotateCcw,
  Settings,
  BookOpen 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useOnboarding } from './OnboardingProvider';

interface OnboardingTriggerProps {
  variant?: 'floating' | 'inline' | 'minimal';
  showBadge?: boolean;
}

export function OnboardingTrigger({ 
  variant = 'floating', 
  showBadge = true 
}: OnboardingTriggerProps) {
  const { 
    isFirstVisit, 
    hasCompletedTour, 
    setShowOnboarding, 
    resetTour,
    startTourAt 
  } = useOnboarding();

  const handleStartTour = () => {
    setShowOnboarding(true);
  };

  const handleRestartTour = () => {
    resetTour();
  };

  const handleStartSpecificSection = (step: number) => {
    startTourAt(step);
  };

  // Floating action button variant
  if (variant === 'floating') {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300,
          delay: 1
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="relative h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg border-0"
              >
                <HelpCircle className="w-6 h-6" />
                {showBadge && isFirstVisit && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Badge className="bg-red-500 text-white border-white border-2 px-1.5 py-0.5">
                      New
                    </Badge>
                  </motion.div>
                )}
                {showBadge && !hasCompletedTour && !isFirstVisit && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Getting Started
            </DropdownMenuLabel>
            
            <DropdownMenuItem onClick={handleStartTour}>
              <Play className="w-4 h-4 mr-2" />
              {hasCompletedTour ? 'Replay Tour' : 'Start Tour'}
            </DropdownMenuItem>
            
            {hasCompletedTour && (
              <DropdownMenuItem onClick={handleRestartTour}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Progress
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="text-xs text-gray-500">
              Jump to Section
            </DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => handleStartSpecificSection(1)}>
              <BookOpen className="w-4 h-4 mr-2" />
              Chart of Accounts
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleStartSpecificSection(2)}>
              <Settings className="w-4 h-4 mr-2" />
              Transactions
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleStartSpecificSection(3)}>
              <Settings className="w-4 h-4 mr-2" />
              Financial Reports
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleStartSpecificSection(4)}>
              <Settings className="w-4 h-4 mr-2" />
              Client Binders
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    );
  }

  // Inline button variant
  if (variant === 'inline') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          variant="outline"
          onClick={handleStartTour}
          className="flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          {hasCompletedTour ? 'Replay Tour' : 'Take Tour'}
          {showBadge && !hasCompletedTour && (
            <Badge variant="secondary" className="text-xs">
              {isFirstVisit ? 'New' : 'Recommended'}
            </Badge>
          )}
        </Button>
      </motion.div>
    );
  }

  // Minimal variant
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStartTour}
        className="text-blue-600 hover:text-blue-700"
      >
        <HelpCircle className="w-4 h-4 mr-1" />
        Help
      </Button>
    </motion.div>
  );
}