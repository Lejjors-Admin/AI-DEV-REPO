import { ReactNode } from "react";
import HorizontalNav from "./HorizontalNav";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  
  // Get background color based on active module
  const getBackgroundColor = () => {
    if (location.startsWith('/clients') || location === '/') {
      return 'bg-blue-50'; // CRM theme
    } else if (location.startsWith('/books') || location.startsWith('/bookkeeping') || location.startsWith('/financial-data') || location.startsWith('/transactions') || location.startsWith('/cheques') || location.startsWith('/trial-balance')) {
      return 'bg-green-50'; // Books theme
    } else if (location.startsWith('/binder') || location.startsWith('/audit-files')) {
      return 'bg-purple-50'; // Binders theme
    }
    return 'bg-neutral-50'; // Default theme
  };

  return (
    <div className={`h-screen flex flex-col ${getBackgroundColor()} text-neutral-900`}>
      <HorizontalNav />
      <main className="flex flex-1 min-h-0 overflow-auto relative z-0 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
