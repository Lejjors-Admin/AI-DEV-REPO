/**
 * Mobile Navigation Component
 * 
 * Touch-friendly navigation optimized for mobile devices:
 * - Bottom tab navigation
 * - Gesture support
 * - Quick actions
 * - Offline indicators
 * - Voice commands
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Users, 
  Calculator, 
  Clock, 
  MessageSquare, 
  Settings,
  Plus,
  Search,
  Menu,
  Camera,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Bell,
  User
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
  quickActions?: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color?: string;
}

export function MobileNavigation() {
  const [location] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isListening, setIsListening] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/'
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      path: '/clients'
    },
    {
      id: 'books',
      label: 'Books',
      icon: Calculator,
      path: '/books'
    },
    {
      id: 'time',
      label: 'Time',
      icon: Clock,
      path: '/pages?tab=time-tracking'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      path: '/communication',
      badge: unreadCount
    }
  ];

  // Quick actions for floating action button
  const quickActions: QuickAction[] = [
    {
      id: 'camera',
      label: 'Capture Receipt',
      icon: Camera,
      action: () => {
        console.log('Opening camera for receipt capture');
        // Would open camera capture modal
      },
      color: 'bg-blue-500'
    },
    {
      id: 'timer',
      label: 'Start Timer',
      icon: Clock,
      action: () => {
        console.log('Starting time tracker');
        // Would start time tracking
      },
      color: 'bg-green-500'
    },
    {
      id: 'voice',
      label: 'Voice Memo',
      icon: Mic,
      action: () => {
        toggleVoiceRecording();
      },
      color: 'bg-orange-500'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      action: () => {
        console.log('Opening search');
        // Would open search modal
      },
      color: 'bg-purple-500'
    }
  ];

  // Check if current path matches navigation item
  const isActive = (path: string): boolean => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Voice recognition (mock implementation)
  const toggleVoiceRecording = () => {
    if (isListening) {
      setIsListening(false);
      console.log('Voice recording stopped');
    } else {
      setIsListening(true);
      console.log('Voice recording started');
      
      // Mock auto-stop after 5 seconds
      setTimeout(() => {
        setIsListening(false);
        console.log('Voice recording completed');
      }, 5000);
    }
  };

  // Handle swipe gestures (basic implementation)
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Horizontal swipe (threshold: 50px)
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          console.log('Swipe right detected');
          // Could implement navigation history back
        } else {
          console.log('Swipe left detected');
          // Could implement navigation history forward
        }
      }

      // Vertical swipe down to refresh (threshold: 100px)
      if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
        console.log('Pull to refresh detected');
        // Could implement pull-to-refresh
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Haptic feedback (if supported)
  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  return (
    <>
      {/* Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-600">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Voice recording indicator */}
          {isListening && (
            <div className="flex items-center gap-1 text-red-500 animate-pulse">
              <Mic className="h-4 w-4" />
              <span className="text-xs font-medium">Recording...</span>
            </div>
          )}
          
          {/* Notifications */}
          <Button
            size="sm"
            variant="ghost"
            className="relative p-1 h-8 w-8"
            onClick={() => hapticFeedback('light')}
            data-testid="button-notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 bg-red-500"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
          
          {/* Profile */}
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-8 w-8"
            onClick={() => hapticFeedback('light')}
            data-testid="button-profile"
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        {/* Quick Actions Menu */}
        {showQuickActions && (
          <div className="absolute bottom-16 right-0 space-y-3 animate-in slide-in-from-bottom-2">
            {quickActions.map((action, index) => (
              <div key={action.id} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 bg-white px-2 py-1 rounded-lg shadow-lg">
                  {action.label}
                </span>
                <Button
                  size="sm"
                  className={`h-12 w-12 rounded-full shadow-lg ${action.color || 'bg-blue-500'} hover:scale-110 transition-transform`}
                  onClick={() => {
                    action.action();
                    setShowQuickActions(false);
                    hapticFeedback('medium');
                  }}
                  style={{ animationDelay: `${index * 50}ms` }}
                  data-testid={`quick-action-${action.id}`}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <Button
          size="lg"
          className={`h-14 w-14 rounded-full shadow-lg transition-transform ${
            showQuickActions 
              ? 'bg-red-500 hover:bg-red-600 rotate-45' 
              : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
          }`}
          onClick={() => {
            setShowQuickActions(!showQuickActions);
            hapticFeedback('medium');
          }}
          data-testid="floating-action-button"
        >
          <Plus className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link key={item.id} href={item.path}>
                <Button
                  variant="ghost"
                  className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 relative transition-colors ${
                    active 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => hapticFeedback('light')}
                  data-testid={`nav-${item.id}`}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : ''}`} />
                    {item.badge && item.badge > 0 && (
                      <Badge 
                        className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-xs p-0 bg-red-500"
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className={`text-xs font-medium leading-tight ${
                    active ? 'text-blue-600' : ''
                  }`}>
                    {item.label}
                  </span>
                  
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Offline indicator */}
        {!isOnline && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs text-center py-1">
            <WifiOff className="inline h-3 w-3 mr-1" />
            Working offline - changes will sync when online
          </div>
        )}
      </nav>

      {/* Voice Recording Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center md:hidden">
          <div className="bg-white rounded-xl p-6 m-4 text-center max-w-sm">
            <div className="relative mb-4">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <div className="absolute inset-0 w-16 h-16 bg-red-500/20 rounded-full mx-auto animate-ping" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2">Recording Voice Memo</h3>
            <p className="text-gray-600 text-sm mb-4">
              Speak clearly. Recording will stop automatically or tap to stop.
            </p>
            
            <Button
              onClick={() => setIsListening(false)}
              variant="outline"
              className="w-full"
              data-testid="button-stop-recording"
            >
              <MicOff className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          </div>
        </div>
      )}

      {/* Touch feedback overlay for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-16 left-4 z-50 bg-black/70 text-white text-xs p-2 rounded md:hidden">
          Location: {location}
          <br />
          Online: {isOnline ? 'Yes' : 'No'}
          <br />
          Listening: {isListening ? 'Yes' : 'No'}
        </div>
      )}
    </>
  );
}