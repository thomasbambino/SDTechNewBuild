import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sun,
  Moon,
  Menu,
  BellDot,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  themeMode: string;
  setThemeMode: (mode: string) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen, themeMode, setThemeMode }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: publicSettings } = useQuery<{ logoPath?: string; companyName?: string }>({
    queryKey: ["/api/settings/public"],
  });

  const toggleTheme = () => {
    const newTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(newTheme);
    // Save theme preference in localStorage
    localStorage.setItem('themeMode', newTheme);
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const redirectPath = user?.role === "admin" ? "/admin" : "/client";

  return (
    <header className="bg-card border-b border-border z-30 fixed top-0 left-0 right-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Menu Toggle */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-2 lg:hidden"
              aria-label="Toggle Menu"
            >
              <Menu className="h-6 w-6" />
            </Button>

            {/* Logo */}
            <Link href={redirectPath} className="flex items-center">
              {publicSettings?.logoPath ? (
                <img
                  src={publicSettings.logoPath}
                  alt={publicSettings.companyName || "Logo"}
                  className="h-8 max-w-[160px] object-contain mr-2"
                />
              ) : (
                <>
                  <span className="bg-primary text-primary-foreground font-bold text-xl px-2 py-1 rounded mr-2">SD</span>
                  <span className="text-primary font-semibold text-lg hidden md:block">Tech Pros</span>
                </>
              )}
            </Link>
          </div>

          {/* Right: User Menu & Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              aria-label="Toggle Theme"
            >
              {themeMode === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative"
              aria-label="Notifications"
            >
              <BellDot className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
            </Button>

            {/* User Menu */}
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-1">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                    <span>{user ? getInitials(user.name) : "U"}</span>
                  </div>
                  <span className="hidden md:block font-medium">{user?.name || "User"}</span>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={user?.role === "admin" ? "/admin/profile" : "/client/profile"}>
                    Your Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={user?.role === "admin" ? "/admin/branding" : "/client/settings"}>
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
