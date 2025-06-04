import { Link, useLocation } from "wouter";
import { HardHat, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/notification-dropdown";

export function NavigationHeader() {
  const [location, setLocation] = useLocation();

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
      // Call logout API endpoint
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      console.log("User logged out");
      // Redirect to login page
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect to login even if API call fails
      setLocation("/login");
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <HardHat className="text-safety-blue text-2xl" />
              <h1 className="text-xl font-bold text-industrial-gray">Arbeitserlaubnis</h1>
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
                    <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=32&h=32" />
                    <AvatarFallback>HM</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-industrial-gray">Hans Mueller</span>
                  <ChevronDown className="h-4 w-4 text-secondary-gray" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setLocation("/settings")}>Einstellungen</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Abmelden</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
