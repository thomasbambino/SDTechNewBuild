import { useState, useEffect } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import PageTransition from "./PageTransition";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMode, setThemeMode] = useState("light");
  const { user, stopImpersonatingMutation } = useAuth();
  const [location] = useLocation();
  
  // Initialize theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme) {
      setThemeMode(savedTheme);
    }
  }, []);
  
  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);
  
  // Define which pages should show the sidebar
  const shouldShowSidebar = () => {
    return user && (
      location.startsWith('/admin') || 
      location.startsWith('/client')
    );
  };
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Only show header and sidebar for authenticated pages */}
      {user && (
        <>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            offsetTop={!!user?.isImpersonating}
          />
          
          {shouldShowSidebar() && (
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} offsetTop={!!user?.isImpersonating} />
          )}
        </>
      )}
      
      {user?.isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-amber-500 text-white flex items-center justify-between px-4 h-10 text-sm font-medium shadow">
          <span>Impersonating: <strong>{user.name}</strong> ({user.email})</span>
          <Button
            size="sm"
            variant="outline"
            className="bg-white text-amber-700 border-white hover:bg-amber-50 h-7 text-xs"
            onClick={() => stopImpersonatingMutation.mutate()}
            disabled={stopImpersonatingMutation.isPending}
          >
            {stopImpersonatingMutation.isPending ? "Stopping..." : "Stop Impersonating"}
          </Button>
        </div>
      )}

      <main className={cn(
        "flex-1 overflow-y-auto",
        user ? (user.isImpersonating ? "pt-[6.5rem]" : "pt-16") : "",
        shouldShowSidebar() ? "lg:pl-64" : ""
      )}>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}

// Helper function to combine class names
function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
