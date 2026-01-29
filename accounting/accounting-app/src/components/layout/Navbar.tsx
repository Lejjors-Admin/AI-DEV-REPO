import { Bell, HelpCircle, Search, Menu, LogOut, User, Settings, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/auth");
      }
    });
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-neutral-300">
      {/* Mobile menu button */}
      <Button 
        variant="ghost" 
        size="icon"
        className="md:hidden px-4 text-neutral-500 hover:text-neutral-900 focus:outline-none"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      {/* Search Bar */}
      <div className="flex-1 flex justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md my-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-500" />
          </div>
          <Input 
            className="pl-10 bg-neutral-100" 
            placeholder="Search..." 
            type="search" 
          />
        </div>
      </div>
      
      {/* Right Navigation Items */}
      <div className="flex items-center px-4 space-x-4">
        <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-900">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-900">
          <HelpCircle className="h-5 w-5" />
        </Button>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-1 rounded-full flex gap-2 items-center">
              <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                <AvatarFallback>{user ? getInitials(user.name) : "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium text-neutral-700">
                {user?.name || "User"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/ai-learning-center")}>
              <Brain className="mr-2 h-4 w-4" />
              <span>AI Learning Center</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
