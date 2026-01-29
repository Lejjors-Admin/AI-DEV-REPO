import React from 'react';
import { OnboardingTour } from './OnboardingTour';
import { OnboardingTrigger } from './OnboardingTrigger';
import { useOnboarding } from './OnboardingProvider';

export function OnboardingWrapper() {
  const { 
    showOnboarding, 
    setShowOnboarding, 
    markTourComplete 
  } = useOnboarding();

  return (
    <>
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={markTourComplete}
        autoPlay={false}
        allowSkip={true}
      />
      <OnboardingTrigger variant="floating" />
    </>
  );
}