import { Link, useLocation } from "wouter";
import { HardHat, ChevronDown, Settings } from "lucide-react";
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

interface AppSettings {
  appName: string;
  logoPath: string | null;
  headerBackgroundColor: string;
  headerTextColor: string;
}

export function NavigationHeader() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  
  // Fetch app settings
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"]
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

  const appName = settings?.appName || "Arbeitserlaubnis";
  const logoPath = settings?.logoPath;
  const headerBgColor = settings?.headerBackgroundColor || "#ffffff";
  const headerTextColor = settings?.headerTextColor || "#000000";

  return (
    <header 
      className="shadow-sm border-b border-gray-200"
      style={{ backgroundColor: headerBgColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {logoPath ? (
                <img 
                  src={logoPath} 
                  alt="Logo" 
                  className="h-8 w-auto"
                />
              ) : (
                <HardHat className="text-2xl" style={{ color: headerTextColor }} />
              )}
              <h1 
                className="text-xl font-bold"
                style={{ color: headerTextColor }}
              >
                {appName}
              </h1>
            </div>
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
          <div className="flex items-center space-x-4">
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
                {user?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => setLocation("/user-management")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>Abmelden</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
