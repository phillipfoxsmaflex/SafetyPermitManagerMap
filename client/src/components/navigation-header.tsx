import { Link, useLocation } from "wouter";
import { HardHat, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function NavigationHeader() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <HardHat className="text-safety-blue text-2xl" />
              <h1 className="text-xl font-bold text-industrial-gray">SicherheitsGenehmigungen</h1>
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
              <a href="#reports" className="text-secondary-gray hover:text-industrial-gray">Berichte</a>
              <a href="#settings" className="text-secondary-gray hover:text-industrial-gray">Einstellungen</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-alert-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Button>
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
                <DropdownMenuItem>Profil</DropdownMenuItem>
                <DropdownMenuItem>Einstellungen</DropdownMenuItem>
                <DropdownMenuItem>Abmelden</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
