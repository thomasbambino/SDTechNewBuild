import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Shield,
  Key,
  Save,
  AlertCircle
} from "lucide-react";

// Form schemas
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional()
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ClientProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch client profile
  const { data: clientProfile, isLoading } = useQuery({
    queryKey: ['/api/clients/profile'],
    enabled: !!user
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest('PUT', '/api/clients/profile', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/profile'] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string, newPassword: string }) => {
      const res = await apiRequest('PUT', '/api/user/password', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully."
      });
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Password update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: clientProfile?.phone || "",
      address: clientProfile?.address || ""
    },
    values: {
      name: user?.name || "",
      email: user?.email || "",
      phone: clientProfile?.phone || "",
      address: clientProfile?.address || ""
    }
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // Handle profile update
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password update
  const onPasswordSubmit = (data: PasswordFormValues) => {
    const { currentPassword, newPassword } = data;
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account information and preferences
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Profile Information
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-white text-xl font-semibold">
                          {user?.name?.split(' ').map(name => name[0]).join('').toUpperCase() || 'U'}
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <Input {...field} placeholder="Your full name" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 text-gray-400 mr-2" />
                              <Input {...field} type="email" placeholder="Your email address" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-400 mr-2" />
                              <Input {...field} placeholder="Your phone number" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-2" />
                              <Textarea 
                                {...field} 
                                placeholder="Your address" 
                                className="resize-none min-h-[80px]"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <FileText className="h-4 w-4" />
                        <span>Username: <span className="font-medium">{user?.username}</span></span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div></div>
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending || !profileForm.formState.isDirty}
                      className="flex items-center"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                    <CardContent className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Key className="h-4 w-4 text-gray-400 mr-2" />
                                <Input {...field} type="password" placeholder="Enter your current password" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Key className="h-4 w-4 text-gray-400 mr-2" />
                                <Input {...field} type="password" placeholder="Enter your new password" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Key className="h-4 w-4 text-gray-400 mr-2" />
                                <Input {...field} type="password" placeholder="Confirm your new password" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <div></div>
                      <Button 
                        type="submit" 
                        disabled={updatePasswordMutation.isPending}
                        className="flex items-center"
                      >
                        <Key className="mr-2 h-4 w-4" />
                        {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-md">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-amber-800">Account Type</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          You're currently on a Client account. If you need additional access or have questions about your account status, please contact your account manager.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      Request Account Deletion
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      This will initiate a request to delete your account and all associated data
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Account Deletion Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Account Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to request account deletion? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Warning</h3>
                  <div className="text-sm text-red-700 mt-1">
                    <p>This will:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Submit a request to delete your account</li>
                      <li>Remove access to all projects and invoices</li>
                      <li>Delete all your personal information</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor="delete-reason">Reason for Account Deletion</Label>
              <Textarea 
                id="delete-reason" 
                placeholder="Please let us know why you're leaving..." 
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  toast({
                    title: "Deletion request submitted",
                    description: "Your account deletion request has been submitted and will be reviewed.",
                  });
                  setIsDeleteDialogOpen(false);
                }}
              >
                Submit Deletion Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
