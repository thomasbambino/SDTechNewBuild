import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Inbox,
  Layout,
  Settings,
  UserCog,
  RefreshCw,
  MessageSquare
} from "lucide-react";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border w-64 fixed inset-y-0 pt-16 transition-transform duration-300 z-20 lg:transform-none",
          sidebarOpen ? "transform-none" : "-translate-x-full lg:translate-x-0",
          "lg:block"
        )}
      >
        <ScrollArea className="h-full px-3 py-4">
          {/* Admin Navigation */}
          {user?.role === "admin" && (
            <>
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dashboard
              </p>

              <nav className="mt-3 space-y-1">
                <Link href="/admin">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <LayoutDashboard className="h-5 w-5 mr-3" />
                    <span>Overview</span>
                  </a>
                </Link>

                <Link href="/admin/clients">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/clients")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Users className="h-5 w-5 mr-3" />
                    <span>Clients</span>
                  </a>
                </Link>

                <Link href="/admin/projects">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/projects")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Briefcase className="h-5 w-5 mr-3" />
                    <span>Projects</span>
                  </a>
                </Link>

                <Link href="/admin/invoices">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/invoices")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <FileText className="h-5 w-5 mr-3" />
                    <span>Invoices</span>
                  </a>
                </Link>

                <Link href="/admin/inquiries">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/inquiries")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Inbox className="h-5 w-5 mr-3" />
                    <span>Inquiries</span>
                    <span className="ml-auto bg-primary/20 text-primary py-0.5 px-2 rounded-full text-xs">5</span>
                  </a>
                </Link>
              </nav>

              <p className="mt-8 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Content Management
              </p>

              <nav className="mt-3 space-y-1">
                <Link href="/admin/content-editor">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/content-editor")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Layout className="h-5 w-5 mr-3" />
                    <span>Website Editor</span>
                  </a>
                </Link>

                <Link href="/admin/branding">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/branding")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Settings className="h-5 w-5 mr-3" />
                    <span>Branding</span>
                  </a>
                </Link>

                <Link href="/admin/users">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/users")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <UserCog className="h-5 w-5 mr-3" />
                    <span>User Management</span>
                  </a>
                </Link>

                <Link href="/admin/api-connections">
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive("/admin/api-connections")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={handleLinkClick}
                  >
                    <RefreshCw className="h-5 w-5 mr-3" />
                    <span>API Connections</span>
                  </a>
                </Link>
              </nav>
            </>
          )}

          {/* Client Navigation */}
          {user?.role === "client" && (
            <nav className="space-y-1">
              <Link href="/client">
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive("/client")
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                  onClick={handleLinkClick}
                >
                  <LayoutDashboard className="h-5 w-5 mr-3" />
                  <span>Dashboard</span>
                </a>
              </Link>

              <Link href="/client/projects">
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive("/client/projects")
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                  onClick={handleLinkClick}
                >
                  <Briefcase className="h-5 w-5 mr-3" />
                  <span>My Projects</span>
                </a>
              </Link>

              <Link href="/client/invoices">
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive("/client/invoices")
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                  onClick={handleLinkClick}
                >
                  <FileText className="h-5 w-5 mr-3" />
                  <span>Invoices</span>
                </a>
              </Link>

              <Link href="/client/messages">
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive("/client/messages")
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                  onClick={handleLinkClick}
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  <span>Messages</span>
                </a>
              </Link>

              <Link href="/client/profile">
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive("/client/profile")
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                  onClick={handleLinkClick}
                >
                  <Users className="h-5 w-5 mr-3" />
                  <span>Profile</span>
                </a>
              </Link>
            </nav>
          )}
        </ScrollArea>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
