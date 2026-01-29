/**
 * Milton AI Testing Page
 */

import React from 'react';
import { MiltonTestComponent } from '@/components/MiltonTestComponent';

export function TestMilton() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Milton AI Testing</h1>
        <p className="text-gray-600 mt-2">
          Test context-aware Milton AI with shared Azure OpenAI credentials
        </p>
      </div>
      
      <MiltonTestComponent />
    </div>
  );
}