import React, { createContext, useContext, useState, useEffect } from 'react';

interface OnboardingContextType {
  isFirstVisit: boolean;
  hasCompletedTour: boolean;
  showOnboarding: boolean;
  currentTourStep: number;
  tourPreferences: {
    autoPlay: boolean;
    playbackSpeed: number;
    showAnimations: boolean;
    skipCompleted: boolean;
  };
  setShowOnboarding: (show: boolean) => void;
  setCurrentTourStep: (step: number) => void;
  markTourComplete: () => void;
  resetTour: () => void;
  updateTourPreferences: (preferences: Partial<OnboardingContextType['tourPreferences']>) => void;
  startTourAt: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = 'accountsync_onboarding_data';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [tourPreferences, setTourPreferences] = useState({
    autoPlay: false,
    playbackSpeed: 1,
    showAnimations: true,
    skipCompleted: false
  });

  // Load saved onboarding state from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setIsFirstVisit(false);
        setHasCompletedTour(data.hasCompletedTour || false);
        setTourPreferences(prev => ({ ...prev, ...data.tourPreferences }));
      } catch (error) {
        console.warn('Failed to parse onboarding data:', error);
      }
    } else {
      // First visit - show onboarding automatically
      setShowOnboarding(true);
    }
  }, []);

  // Save onboarding state to localStorage
  const saveOnboardingData = (data: any) => {
    try {
      const currentData = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) || '{}');
      const updatedData = { ...currentData, ...data };
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.warn('Failed to save onboarding data:', error);
    }
  };

  const markTourComplete = () => {
    setHasCompletedTour(true);
    setShowOnboarding(false);
    setIsFirstVisit(false);
    saveOnboardingData({ 
      hasCompletedTour: true,
      completedAt: new Date().toISOString()
    });
  };

  const resetTour = () => {
    setCurrentTourStep(0);
    setHasCompletedTour(false);
    setShowOnboarding(true);
    saveOnboardingData({ 
      hasCompletedTour: false,
      resetAt: new Date().toISOString()
    });
  };

  const updateTourPreferences = (preferences: Partial<OnboardingContextType['tourPreferences']>) => {
    const updatedPreferences = { ...tourPreferences, ...preferences };
    setTourPreferences(updatedPreferences);
    saveOnboardingData({ tourPreferences: updatedPreferences });
  };

  const startTourAt = (step: number) => {
    setCurrentTourStep(step);
    setShowOnboarding(true);
  };

  const value: OnboardingContextType = {
    isFirstVisit,
    hasCompletedTour,
    showOnboarding,
    currentTourStep,
    tourPreferences,
    setShowOnboarding,
    setCurrentTourStep,
    markTourComplete,
    resetTour,
    updateTourPreferences,
    startTourAt
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}