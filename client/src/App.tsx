import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { SettingsProvider } from "@/hooks/use-settings";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import PublicHome from "@/pages/public-home";
import InquiryForm from "@/pages/inquiry-form";
import LogoTest from "@/pages/logo-test";
import { useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import DynamicFavicon from "@/components/layout/DynamicFavicon";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClients from "@/pages/admin/clients";
import AdminProjects from "@/pages/admin/projects";
import AdminInvoices from "@/pages/admin/invoices";
import AdminInquiries from "@/pages/admin/inquiries";
import AdminActivities from "@/pages/admin/activities";
import AdminContentEditor from "@/pages/admin/content-editor";
import AdminBranding from "@/pages/admin/branding";
import AdminApiConnections from "@/pages/admin/api-connections";
import AdminProfile from "@/pages/admin/profile";
import AdminUsers from "@/pages/admin/users";
import AdminMessages from "@/pages/admin/messages";

// Client pages
import ClientDashboard from "@/pages/client/dashboard";
import ClientProjects from "@/pages/client/projects";
import ClientInvoices from "@/pages/client/invoices";
import ClientDocuments from "@/pages/client/documents";
import ClientProfile from "@/pages/client/profile";
import ClientMessages from "@/pages/client/messages";
import CustomPageView from "@/pages/custom-page";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={PublicHome} />
      <Route path="/inquiry" component={InquiryForm} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/logo-test" component={LogoTest} />
      
      {/* Admin routes */}
      <ProtectedRoute path="/admin" role="admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/clients" role="admin" component={AdminClients} />
      <ProtectedRoute path="/admin/projects" role="admin" component={AdminProjects} />
      <ProtectedRoute path="/admin/invoices" role="admin" component={AdminInvoices} />
      <ProtectedRoute path="/admin/inquiries" role="admin" component={AdminInquiries} />
      <ProtectedRoute path="/admin/activities" role="admin" component={AdminActivities} />
      <ProtectedRoute path="/admin/content-editor" role="admin" component={AdminContentEditor} />
      <ProtectedRoute path="/admin/branding" role="admin" component={AdminBranding} />
      <ProtectedRoute path="/admin/api-connections" role="admin" component={AdminApiConnections} />
      <ProtectedRoute path="/admin/users" role="admin" component={AdminUsers} />
      <ProtectedRoute path="/admin/profile" role="admin" component={AdminProfile} />
      <ProtectedRoute path="/admin/messages" role="admin" component={AdminMessages} />
      
      {/* Client routes */}
      <ProtectedRoute path="/client" role="client" component={ClientDashboard} />
      <ProtectedRoute path="/client/projects" role="client" component={ClientProjects} />
      <ProtectedRoute path="/client/invoices" role="client" component={ClientInvoices} />
      <ProtectedRoute path="/client/documents" role="client" component={ClientDocuments} />
      <ProtectedRoute path="/client/profile" role="client" component={ClientProfile} />
      <ProtectedRoute path="/client/messages" role="client" component={ClientMessages} />
      
      {/* Custom hidden pages (e.g. /privacy-policy) */}
      <Route path="/pages/:slug" component={CustomPageView} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <DynamicFavicon defaultFavicon="/favicon.svg" />
          <Router />
          <Toaster />
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
