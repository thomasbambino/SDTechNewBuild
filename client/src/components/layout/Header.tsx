import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Bell,
  BellDot,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { readCachedPublicSettings } from "@/lib/publicSettingsCache";

function AdminBellButton() {
  const [_, navigate] = useLocation();
  const { data } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 30000,
  });
  const count = data?.count ?? 0;
  return (
    <Button variant="ghost" size="icon" className="rounded-full relative" aria-label="Messages" onClick={() => navigate('/admin/messages')}>
      {count > 0 ? <BellDot className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  );
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  themeMode: string;
  setThemeMode: (mode: string) => void;
  offsetTop?: boolean;
}

export default function Header({ sidebarOpen, setSidebarOpen, themeMode, setThemeMode, offsetTop }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Seed from the localStorage cache so the first paint already has the
  // real logo + company name. isLoading only reports true when there's no
  // cached value at all, so the skeleton shows on the very first visit
  // instead of every refresh.
  const cachedSettings = readCachedPublicSettings();
  const { data: publicSettings, isLoading: settingsLoading } = useQuery<{ logoPath?: string; companyName?: string }>({
    queryKey: ["/api/settings/public"],
    initialData: cachedSettings as { logoPath?: string; companyName?: string } | undefined,
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

  const redirectPath = (user?.role === "admin" || user?.role === "internal") ? "/admin" : "/client";

  return (
    <header className={`bg-card border-b border-border z-30 fixed left-0 right-0 ${offsetTop ? "top-10" : "top-0"}`}>
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

            {/* Logo — no loader gate. The settings query is pre-seeded from
                localStorage so publicSettings is available on first render;
                after the image loads once, the browser HTTP cache serves it
                instantly on every subsequent SPA navigation. The old
                logoImgLoaded skeleton reset to false on every AppLayout
                remount and caused a visible flash between pages. */}
            <Link href={redirectPath} className="flex items-center">
              {publicSettings?.logoPath ? (
                <img
                  src={publicSettings.logoPath}
                  alt={publicSettings.companyName || "Logo"}
                  className="h-8 max-w-[160px] object-contain mr-2 dark:brightness-0 dark:invert"
                />
              ) : settingsLoading ? (
                <Skeleton className="h-8 w-28 mr-2" />
              ) : (
                <>
                  <span className="mr-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-foreground font-display text-lg font-bold text-background">SD</span>
                  <span className="hidden flex-col leading-none md:flex">
                    <span className="font-display text-xl font-bold">{publicSettings?.companyName || "SD Tech Pros"}</span>
                    <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {(user?.role === "admin" || user?.role === "internal") ? "Admin" : "Client portal"}
                    </span>
                  </span>
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

            {/* Notifications — links to messages if admin has unread */}
            {user?.role === 'admin' && (
              <AdminBellButton />
            )}

            {/* User Menu */}
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft font-display text-[13px] font-bold tracking-wide text-primary-soft-foreground">
                    <span>{user ? getInitials(user.name) : "U"}</span>
                  </div>
                  <span className="hidden md:block font-medium">{user?.name || "User"}</span>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={(user?.role === "admin" || user?.role === "internal") ? "/admin/profile" : "/client/profile"}>
                    Your Profile
                  </Link>
                </DropdownMenuItem>
                {(user?.role === "admin" || user?.role === "internal") && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/branding">Settings</Link>
                  </DropdownMenuItem>
                )}
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
