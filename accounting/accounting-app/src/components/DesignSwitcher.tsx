import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, LayoutGrid } from "lucide-react";

export function DesignSwitcher() {
  const [location, setLocation] = useLocation();
  
  const isBackup = location.includes('/books-backup');
  const isSidebarDemo = location.includes('/sidebar-demo');
  
  if (!isBackup && !isSidebarDemo && !location.includes('/books')) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
      {isBackup && (
        <>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Original Design Backup
          </Badge>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setLocation('/sidebar-demo')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            View Modern Sidebar
          </Button>
          <Button 
            size="sm" 
            onClick={() => setLocation('/books')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Current
          </Button>
        </>
      )}
      
      {isSidebarDemo && (
        <>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Modern Sidebar Demo
          </Badge>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setLocation('/books-backup')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            View Original Design
          </Button>
          <Button 
            size="sm" 
            onClick={() => setLocation('/books')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Current
          </Button>
        </>
      )}
      
      {location.includes('/books') && !isBackup && !isSidebarDemo && (
        <>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Current Design
          </Badge>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setLocation('/sidebar-demo')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Modern Sidebar
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setLocation('/books-backup')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Original Backup
          </Button>
        </>
      )}
    </div>
  );
}