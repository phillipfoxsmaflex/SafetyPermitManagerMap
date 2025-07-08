import { Link, useLocation } from "wouter";
import { HardHat, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function NavigationHeader() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch system settings for customizable title and icon
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/system-settings"]
  });

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const handleProfileClick = () => {
    console.log("Profile clicked");
    // In a real app, this would open a profile modal or navigate to profile page
  };

  const handleLogout = async () => {
    try {
      await logout();
      console.log("User logged out");
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setLocation("/login");
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map(name => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {(systemSettings as any)?.headerIcon ? (
                <img 
                  src={(systemSettings as any).headerIcon} 
                  alt="Header Icon" 
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <HardHat className="text-safety-blue text-2xl" />
              )}
              <h1 className="text-lg sm:text-xl font-bold text-industrial-gray">
                {(systemSettings as any)?.applicationTitle || "Arbeitserlaubnis"}
              </h1>
            </div>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className={`font-medium pb-2 border-b-2 ${
                isActive("/") 
                  ? "text-safety-blue border-safety-blue" 
                  : "text-secondary-gray border-transparent hover:text-industrial-gray"
              }`}>
                Dashboard
              </Link>
              <Link href="/permits" className={`font-medium pb-2 border-b-2 ${
                isActive("/permits") 
                  ? "text-safety-blue border-safety-blue" 
                  : "text-secondary-gray border-transparent hover:text-industrial-gray"
              }`}>
                Genehmigungen
              </Link>
              <Link href="/approvals" className={`font-medium pb-2 border-b-2 ${
                isActive("/approvals") 
                  ? "text-safety-blue border-safety-blue" 
                  : "text-secondary-gray border-transparent hover:text-industrial-gray"
              }`}>
                Freigaben
              </Link>
              <Link href="/drafts" className={`font-medium pb-2 border-b-2 ${
                isActive("/drafts") 
                  ? "text-safety-blue border-safety-blue" 
                  : "text-secondary-gray border-transparent hover:text-industrial-gray"
              }`}>
                Entwürfe
              </Link>
            </nav>
          </div>
          
          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {user?.fullName ? getInitials(user.fullName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-industrial-gray">
                    {user?.fullName || "Benutzer"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-secondary-gray" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setLocation("/settings")}>Einstellungen</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Abmelden</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Right Side */}
          <div className="md:hidden flex items-center space-x-2">
            <NotificationDropdown />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <nav className="px-4 py-2 space-y-1">
              <Link 
                href="/" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive("/") 
                    ? "text-safety-blue bg-blue-50" 
                    : "text-secondary-gray hover:text-industrial-gray hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/permits" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive("/permits") 
                    ? "text-safety-blue bg-blue-50" 
                    : "text-secondary-gray hover:text-industrial-gray hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Genehmigungen
              </Link>
              <Link 
                href="/approvals" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive("/approvals") 
                    ? "text-safety-blue bg-blue-50" 
                    : "text-secondary-gray hover:text-industrial-gray hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Freigaben
              </Link>
              <Link 
                href="/drafts" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive("/drafts") 
                    ? "text-safety-blue bg-blue-50" 
                    : "text-secondary-gray hover:text-industrial-gray hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Entwürfe
              </Link>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex items-center px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {user?.fullName ? getInitials(user.fullName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="ml-3 text-sm font-medium text-industrial-gray">
                    {user?.fullName || "Benutzer"}
                  </span>
                </div>
                <button 
                  onClick={() => { setLocation("/settings"); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-secondary-gray hover:text-industrial-gray hover:bg-gray-50"
                >
                  Einstellungen
                </button>
                <button 
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-secondary-gray hover:text-industrial-gray hover:bg-gray-50"
                >
                  Abmelden
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
