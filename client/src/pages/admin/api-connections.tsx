import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ApiConnection } from "@shared/schema";
import {
  RefreshCw,
  Key,
  AlertCircle,
  ExternalLink,
  Clock,
  RotateCw,
  Database,
  Unplug,
  CheckCircle2,
} from "lucide-react";

export default function ApiConnectionsPage() {
  const { toast } = useToast();
  const [location] = useLocation();

  // Show toast based on OAuth redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");

    if (connected === "freshbooks") {
      toast({ title: "Connected", description: "FreshBooks account connected successfully." });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/api-connections/freshbooks"] });
    } else if (error) {
      const messages: Record<string, string> = {
        freshbooks_denied: "Authorization was denied by FreshBooks.",
        token_exchange: "Failed to exchange authorization code. Please try again.",
        missing_env: "FreshBooks credentials are not configured on the server.",
      };
      toast({
        title: "Connection failed",
        description: messages[error] || "An unknown error occurred.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: freshbooksConnection, isLoading } = useQuery<ApiConnection | null>({
    queryKey: ["/api/api-connections/freshbooks"],
  });

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await apiRequest("PUT", "/api/api-connections/freshbooks", { provider: "freshbooks", isActive });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/api-connections/freshbooks"] }),
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/api-connections/freshbooks/refresh", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-connections/freshbooks"] });
      toast({ title: "Token refreshed", description: "Access token refreshed successfully." });
    },
    onError: (error) => {
      toast({ title: "Refresh failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/api-connections/freshbooks", { method: "DELETE", credentials: "include" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-connections/freshbooks"] });
      toast({ title: "Disconnected", description: "FreshBooks account disconnected." });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/api-connections/freshbooks/sync", {});
      return res.json();
    },
    onSuccess: () => toast({ title: "Sync complete", description: "FreshBooks data synced successfully." }),
    onError: (error) => {
      toast({ title: "Sync failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  const isExpired = (connection: ApiConnection | null | undefined) => {
    if (!connection?.expiresAt) return true;
    return new Date(connection.expiresAt) < new Date();
  };

  const formatExpiry = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return "Unknown";
    return format(new Date(expiresAt), "MMM d, yyyy 'at' h:mm a");
  };

  const timeRemaining = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return "Expired";
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    if (diff <= 0) return "Expired";
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  const isConnected = !!(freshbooksConnection?.accessToken);

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              API Connections
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your external API integrations
            </p>
          </div>
        </div>

        <Tabs defaultValue="freshbooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="freshbooks">FreshBooks</TabsTrigger>
            <TabsTrigger value="google" disabled>Google Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="freshbooks" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-10 text-sm text-gray-500">Loading...</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>FreshBooks Integration</CardTitle>
                        <CardDescription>
                          Connect your FreshBooks account to sync clients, projects, and invoices
                        </CardDescription>
                      </div>
                      {isConnected && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="connection-status" className="text-sm">
                            {freshbooksConnection?.isActive ? "Active" : "Inactive"}
                          </Label>
                          <Switch
                            id="connection-status"
                            checked={freshbooksConnection?.isActive ?? false}
                            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {!isConnected ? (
                      <div className="text-center py-8">
                        <Key className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">Not Connected</h3>
                        <p className="text-sm text-gray-500 mb-5">
                          Connect your FreshBooks account to synchronize client and project data
                        </p>
                        <Button
                          onClick={() => { window.location.href = "/api/api-connections/freshbooks/auth"; }}
                          className="flex items-center"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect to FreshBooks
                        </Button>
                      </div>
                    ) : (
                      <>
                        {isExpired(freshbooksConnection) && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Token Expired</AlertTitle>
                            <AlertDescription>
                              Your access token has expired. Refresh it or reconnect.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Status</Label>
                            <div className="flex items-center">
                              {freshbooksConnection?.isActive && !isExpired(freshbooksConnection) ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="text-green-700 font-medium">Active</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600 font-medium">Inactive</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Token Expires</Label>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 text-gray-400 mr-2" />
                              {formatExpiry(freshbooksConnection?.expiresAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {timeRemaining(freshbooksConnection?.expiresAt)} remaining
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Last Updated</Label>
                          <p className="text-sm">
                            {freshbooksConnection?.updatedAt
                              ? format(new Date(freshbooksConnection.updatedAt), "MMM d, yyyy 'at' h:mm a")
                              : "—"}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>

                  <CardFooter className="flex justify-between flex-wrap gap-2">
                    <Button variant="outline" onClick={() => window.open("https://www.freshbooks.com/api/authentication", "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Documentation
                    </Button>

                    {isConnected && (
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                          <RotateCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                          Refresh Token
                        </Button>
                        <Button onClick={() => { window.location.href = "/api/api-connections/freshbooks/auth"; }}>
                          <RotateCw className="mr-2 h-4 w-4" />
                          Reconnect
                        </Button>
                        <Button variant="destructive" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}>
                          <Unplug className="mr-2 h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>

                {isConnected && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Database className="h-5 w-5 mr-2" />
                        Data Synchronization
                      </CardTitle>
                      <CardDescription>Sync clients, projects, and invoices from FreshBooks</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button className="w-full" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                        {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="google">
            <Card>
              <CardHeader>
                <CardTitle>Google Analytics</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
