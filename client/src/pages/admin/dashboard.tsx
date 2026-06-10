import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityFeed, { Activity } from "@/components/dashboard/ActivityFeed";
import InquiriesList, { Inquiry } from "@/components/dashboard/InquiriesList";
import ProjectsTable, { Project } from "@/components/dashboard/ProjectsTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Briefcase, 
  Users, 
  FileText, 
  Inbox, 
  RefreshCw, 
  Plus 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  stats: {
    activeProjects: number;
    totalClients: number;
    outstandingInvoices: number;
    newInquiriesCount: number;
  };
  recentActivities: Activity[];
  pendingInquiries: Inquiry[];
  recentProjects: Project[];
}

export default function AdminDashboard() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch dashboard data
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard/admin'],
  });

  const handleApproveInquiry = async (inquiryId: number) => {
    try {
      await apiRequest('PUT', `/api/inquiries/${inquiryId}`, {
        status: 'approved'
      });
      
      toast({
        title: "Inquiry approved",
        description: "The inquiry has been successfully approved.",
      });
      
      // Refetch dashboard data
      refetch();
    } catch (error) {
      toast({
        title: "Failed to approve inquiry",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Navigation handlers
  const navigateToClients = () => navigate("/admin/clients");
  const navigateToProjects = () => navigate("/admin/projects");
  const navigateToInvoices = () => navigate("/admin/invoices");
  const navigateToInquiries = () => navigate("/admin/inquiries");
  const navigateToProjectDetails = (projectId: number) => navigate(`/admin/projects/${projectId}`);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Dashboard
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <Button variant="outline" onClick={() => refetch()} className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button onClick={() => navigate("/admin/projects/new")} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {isLoading ? (
          <>
            {/* Stats skeletons */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg border p-5">
                  <div className="flex items-center">
                    <Skeleton className="h-12 w-12 rounded-md flex-shrink-0" />
                    <div className="ml-5 flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity + Inquiries skeletons */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-6">
              <div className="bg-card rounded-lg border">
                <div className="px-5 py-4 border-b"><Skeleton className="h-6 w-36" /></div>
                <div className="p-5 space-y-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-lg border">
                <div className="px-5 py-4 border-b"><Skeleton className="h-6 w-40" /></div>
                <div className="p-5 space-y-1 divide-y divide-border">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="py-4 flex items-start space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects table skeleton */}
            <div className="bg-card rounded-lg border">
              <div className="px-5 py-4 border-b"><Skeleton className="h-6 w-36" /></div>
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : isError ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Error loading dashboard data</p>
            <p className="mt-1 text-sm text-gray-500">Please try refreshing the page</p>
            <Button onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <StatsCard
                title="Active Projects"
                value={data?.stats.activeProjects || 0}
                icon={<Briefcase className="h-6 w-6" />}
                iconBgColor="bg-primary-100"
                iconColor="text-primary-600"
                linkText="View all projects"
                onClick={navigateToProjects}
              />
              
              <StatsCard
                title="Total Clients"
                value={data?.stats.totalClients || 0}
                icon={<Users className="h-6 w-6" />}
                iconBgColor="bg-green-100"
                iconColor="text-green-600"
                linkText="View all clients"
                onClick={navigateToClients}
              />
              
              <StatsCard
                title="Outstanding Invoices"
                value={formatCurrency(data?.stats.outstandingInvoices || 0)}
                icon={<FileText className="h-6 w-6" />}
                iconBgColor="bg-yellow-100"
                iconColor="text-yellow-600"
                linkText="View invoices"
                onClick={navigateToInvoices}
              />
              
              <StatsCard
                title="New Inquiries"
                value={data?.stats.newInquiriesCount || 0}
                icon={<Inbox className="h-6 w-6" />}
                iconBgColor="bg-red-100"
                iconColor="text-red-600"
                linkText="Manage inquiries"
                onClick={navigateToInquiries}
              />
            </div>

            {/* Recent Activity & Pending Inquiries */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-6">
              <ActivityFeed 
                activities={data?.recentActivities || []} 
                viewAllLink="/admin/activities"
                onViewAll={() => navigate("/admin/activities")}
              />
              
              <InquiriesList 
                inquiries={data?.pendingInquiries || []}
                onApprove={handleApproveInquiry}
                onViewDetails={(inquiry) => navigate(`/admin/inquiries/${inquiry.id}`)}
                viewAllLink="/admin/inquiries"
                onViewAll={navigateToInquiries}
              />
            </div>

            {/* Recent Projects */}
            <ProjectsTable 
              projects={data?.recentProjects || []}
              onView={navigateToProjectDetails}
              onEdit={(id) => navigate(`/admin/projects/${id}/edit`)}
              viewAllLink="/admin/projects"
              onViewAll={navigateToProjects}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
