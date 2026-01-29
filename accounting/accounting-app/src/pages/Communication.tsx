import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { useLocation } from "wouter";
import CommunicationDashboard from "@/components/communications/CommunicationDashboard";

export default function Communication() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/pages')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Practice Management
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
              <p className="text-sm text-gray-600">Unified communication platform for client and team collaboration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/settings')}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Communication Dashboard */}
      <div className="flex-1 overflow-hidden">
        <CommunicationDashboard />
      </div>
    </div>
  );
}