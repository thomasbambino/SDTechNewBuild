import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Activity } from "@/components/dashboard/ActivityFeed";
import { describeActivity } from "@/lib/describeActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { 
  RefreshCw, 
  UserPlus, 
  FileText, 
  FileUp, 
  User, 
  Briefcase,
  Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function ActivitiesPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all activities
  const { data: activities = [], isLoading, refetch } = useQuery<Activity[]>({
    queryKey: ["/api/activities", page, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/activities?limit=100`);
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
  });

  // Get icon based on action or entity type
  const getActivityIcon = (activity: Activity) => {
    // Default color is gray
    let iconColor = "bg-gray-400";
    let icon = <RefreshCw className="h-4 w-4 text-white" />;
    
    // Set icon based on activity type
    if (activity.action?.includes("Project")) {
      iconColor = "bg-primary-500";
      icon = <Briefcase className="h-4 w-4 text-white" />;
    } else if (activity.action?.includes("Client") || activity.action?.includes("User")) {
      iconColor = "bg-green-500";
      icon = <UserPlus className="h-4 w-4 text-white" />;
    } else if (activity.action?.includes("Invoice")) {
      iconColor = "bg-yellow-500";
      icon = <FileText className="h-4 w-4 text-white" />;
    } else if (activity.action?.includes("Document")) {
      iconColor = "bg-blue-500";
      icon = <FileUp className="h-4 w-4 text-white" />;
    } else if (activity.action?.includes("Login") || activity.action?.includes("Logout")) {
      iconColor = "bg-purple-500";
      icon = <User className="h-4 w-4 text-white" />;
    }
    
    return { iconColor, icon };
  };
  
  // Format time (e.g. "2 hours ago")
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Filter activities based on search query
  const filteredActivities = activities.filter(activity => 
    activity.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Activity Log
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              className="flex items-center"
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">System Activity</h3>
              <div className="relative w-64">
                <Input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:p-6">
            {isLoading ? (
              <div className="py-6 text-center">Loading activity log...</div>
            ) : filteredActivities.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {filteredActivities.map((activity, index) => {
                    const { iconColor, icon } = getActivityIcon(activity);
                    const isLast = index === filteredActivities.length - 1;
                    
                    return (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {!isLast && (
                            <span 
                              className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" 
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <div className={`h-10 w-10 rounded-full ${iconColor} flex items-center justify-center ring-8 ring-white`}>
                                {icon}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              {(() => {
                                const d = describeActivity(activity);
                                return (
                                  <div className="text-sm text-gray-700">
                                    {d.actor && <span className="font-semibold text-gray-900">{d.actor}</span>}
                                    {d.actor && " "}
                                    <span>{d.verb}</span>
                                    {d.object && <> <span className="font-medium text-gray-900">{d.object}</span></>}
                                    {d.suffix && <span className="text-gray-500"> {d.suffix}</span>}
                                  </div>
                                );
                              })()}
                              <div className="mt-1 text-xs text-gray-500">
                                {formatTime(activity.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-gray-500">
                No activity records found
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}