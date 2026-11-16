import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { syncPublicSettingsCache } from "./lib/publicSettingsCache";

// Fired once at module import so the subscription is live before any
// component renders. Mirrors /api/settings/public into localStorage so
// the next page load can hydrate instantly.
syncPublicSettingsCache(queryClient);
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { SettingsProvider } from "@/hooks/use-settings";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import AuthForgotPage from "@/pages/auth-forgot";
import AuthResetPage from "@/pages/auth-reset";
import PublicHome from "@/pages/public-home";
import InquiryForm from "@/pages/inquiry-form";
import DynamicFavicon from "@/components/layout/DynamicFavicon";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClients from "@/pages/admin/clients";
import AdminClientDetail from "@/pages/admin/client-detail";
import AdminProjects from "@/pages/admin/projects";
import AdminProjectDetail from "@/pages/admin/project-detail";
import AdminInvoices from "@/pages/admin/invoices";
import AdminInquiries from "@/pages/admin/inquiries";
import AdminActivities from "@/pages/admin/activities";
import AdminContentEditor from "@/pages/admin/content-editor";
import AdminSiteText from "@/pages/admin/site-text";
import AdminBranding from "@/pages/admin/branding";
import AdminApiConnections from "@/pages/admin/api-connections";
import AdminProfile from "@/pages/admin/profile";
import AdminUsers from "@/pages/admin/users";
import AdminMessages from "@/pages/admin/messages";
import AdminTickets from "@/pages/admin/tickets";
import AdminAppointments from "@/pages/admin/appointments";
import AdminServicePlans from "@/pages/admin/service-plans";
import AdminCaseStudies from "@/pages/admin/case-studies";

// Client pages
import ClientDashboard from "@/pages/client/dashboard";
import ClientProjects from "@/pages/client/projects";
import ClientInvoices from "@/pages/client/invoices";
import ClientDocuments from "@/pages/client/documents";
import ClientProfile from "@/pages/client/profile";
import ClientMessages from "@/pages/client/messages";
import ClientNotes from "@/pages/client/notes";
import ClientReport from "@/pages/client/report";
import ClientTickets from "@/pages/client/tickets";
import ClientTicketDetail from "@/pages/client/ticket-detail";
import ClientAppointments from "@/pages/client/appointments";
import ClientAssets from "@/pages/client/assets";
import ClientPlan from "@/pages/client/plan";
import CustomPageView from "@/pages/custom-page";
import CaseStudies from "@/pages/case-studies";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={PublicHome} />
      <Route path="/inquiry" component={InquiryForm} />
      <Route path="/case-studies" component={CaseStudies} />
      <Route path="/auth/forgot" component={AuthForgotPage} />
      <Route path="/auth/reset" component={AuthResetPage} />
      <Route path="/auth" component={AuthPage} />

      {/* Admin routes */}
      <ProtectedRoute path="/admin" role="admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/clients/:id" role="admin" component={AdminClientDetail} />
      <ProtectedRoute path="/admin/clients" role="admin" component={AdminClients} />
      <ProtectedRoute path="/admin/projects/:id" role="admin" component={AdminProjectDetail} />
      <ProtectedRoute path="/admin/projects" role="admin" component={AdminProjects} />
      <ProtectedRoute path="/admin/invoices" role="admin" component={AdminInvoices} />
      <ProtectedRoute path="/admin/inquiries" role="admin" component={AdminInquiries} />
      <ProtectedRoute path="/admin/activities" role="admin" component={AdminActivities} />
      <ProtectedRoute path="/admin/content-editor" role="admin" component={AdminContentEditor} />
      <ProtectedRoute path="/admin/site-text" role="admin" component={AdminSiteText} />
      <ProtectedRoute path="/admin/branding" role="admin" component={AdminBranding} />
      <ProtectedRoute path="/admin/api-connections" role="admin" component={AdminApiConnections} />
      <ProtectedRoute path="/admin/users" role="admin" component={AdminUsers} />
      <ProtectedRoute path="/admin/profile" role="admin" component={AdminProfile} />
      <ProtectedRoute path="/admin/messages" role="admin" component={AdminMessages} />
      <ProtectedRoute path="/admin/tickets" role="admin" component={AdminTickets} />
      <ProtectedRoute path="/admin/appointments" role="admin" component={AdminAppointments} />
      <ProtectedRoute path="/admin/service-plans" role="admin" component={AdminServicePlans} />
      <ProtectedRoute path="/admin/case-studies" role="admin" component={AdminCaseStudies} />

      {/* Client routes. More-specific paths MUST come before "/client" so
          Switch matches them first — wouter is first-match-wins. */}
      <ProtectedRoute path="/client/report" role="client" component={ClientReport} />
      <ProtectedRoute path="/client/tickets/:id" role="client" component={ClientTicketDetail} />
      <ProtectedRoute path="/client/tickets" role="client" component={ClientTickets} />
      <ProtectedRoute path="/client/appointments" role="client" component={ClientAppointments} />
      <ProtectedRoute path="/client/equipment" role="client" component={ClientAssets} />
      <ProtectedRoute path="/client/plan" role="client" component={ClientPlan} />
      <ProtectedRoute path="/client/projects" role="client" component={ClientProjects} />
      <ProtectedRoute path="/client/invoices" role="client" component={ClientInvoices} />
      <ProtectedRoute path="/client/documents" role="client" component={ClientDocuments} />
      <ProtectedRoute path="/client/profile" role="client" component={ClientProfile} />
      <ProtectedRoute path="/client/messages" role="client" component={ClientMessages} />
      <ProtectedRoute path="/client/notes" role="client" component={ClientNotes} />
      <ProtectedRoute path="/client" role="client" component={ClientDashboard} />
      
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
