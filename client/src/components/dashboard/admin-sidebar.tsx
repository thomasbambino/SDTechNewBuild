import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  FileText, // Changed from FileInvoice to FileText
  Inbox,
  UserCog,
  FileEdit,
  Settings,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";

function SidebarLogo({ src, initial }: { src: string; initial: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-8 w-8">
      {!loaded && <Skeleton className="absolute inset-0 rounded" />}
      <img
        src={src}
        className={cn("h-8 w-8 rounded object-contain", !loaded && "opacity-0")}
        alt="Company Logo"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
  isActive?: boolean;
}

function SidebarItem({ href, icon, children, badge, isActive }: SidebarItemProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-2 py-2 text-base font-medium rounded-md group",
          isActive
            ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
            : "text-foreground hover:bg-muted hover:text-primary dark:hover:text-primary-foreground"
        )}
      >
        <div className={cn(
          "mr-3", 
          isActive 
            ? "text-primary dark:text-primary-foreground" 
            : "text-muted-foreground group-hover:text-primary dark:group-hover:text-primary-foreground"
        )}>
          {icon}
        </div>
        <span>{children}</span>
        {badge && badge > 0 && (
          <span className="ml-auto bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary-foreground py-0.5 px-2 rounded-full text-xs">
            {badge}
          </span>
        )}
      </a>
    </Link>
  );
}

export default function AdminSidebar() {
  const [location] = useLocation();
  const { settings, isLoading } = useSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const companyName = settings?.companyName || "SD Tech Pros";
  const companyLogo = settings?.logoPath;

  const sidebarItems = [
    { href: "/admin", icon: <LayoutDashboard size={20} />, text: "Dashboard" },
    { href: "/admin/clients", icon: <Users size={20} />, text: "Clients" },
    { href: "/admin/projects", icon: <GitBranch size={20} />, text: "Projects" },
    { href: "/admin/invoices", icon: <FileText size={20} />, text: "Invoices" },
    { href: "/admin/inquiries", icon: <Inbox size={20} />, text: "Inquiries", badge: 3 },
    { href: "/admin/users", icon: <UserCog size={20} />, text: "Users" },
    { href: "/admin/content-editor", icon: <FileEdit size={20} />, text: "Content" },
    { href: "/admin/branding", icon: <Settings size={20} />, text: "Settings" },
    { href: "/admin/profile", icon: <User size={20} />, text: "My Profile" },
  ];

  return (
    <div className="w-64 bg-card shadow-md z-10 border-r border-border flex flex-col h-full">
      <div className="px-6 pt-8 pb-6 border-b border-border">
        <div className="flex items-center space-x-3">
          {isLoading ? (
            <Skeleton className="h-8 w-8 rounded" />
          ) : companyLogo ? (
            <SidebarLogo src={companyLogo} initial={companyName.charAt(0)} />
          ) : (
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <span className="font-semibold">{companyName.charAt(0)}</span>
            </div>
          )}
          <span className="text-foreground font-bold text-lg">
            {isLoading ? <Skeleton className="h-5 w-32" /> : companyName}
          </span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="px-4 py-4 flex-1 overflow-y-auto hidden md:block">
        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              badge={item.badge}
              isActive={location === item.href}
            >
              {item.text}
            </SidebarItem>
          ))}
        </div>
      </nav>

      {/* Mobile Navigation Toggle */}
      <div className="border-t border-border p-4 md:hidden">
        <button
          className="flex items-center justify-between w-full text-foreground hover:text-primary"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="font-medium">Menu</span>
          {isMobileMenuOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav className="px-4 py-2 border-t border-border md:hidden">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                badge={item.badge}
                isActive={location === item.href}
              >
                {item.text}
              </SidebarItem>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
