import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  UserPlus,
  UserCog,
  MoreHorizontal,
  ShieldCheck,
  User,
  UserX,
  UserCheck,
  Loader2,
  Key,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface User {
  id: number;
  username: string;
  email: string;
  name: string; // This is fullName in the database
  role: string;
  status?: string; // Optional field for account status
  createdAt: string;
  updatedAt: string;
}

// Form schema for creating a new user
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(2, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "client"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

// Create random password function
const generateRandomPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function AdminUsers() {
  const { toast } = useToast();
  const { impersonateMutation } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createdLogin, setCreatedLogin] = useState<{ username: string; tempPassword: string } | null>(null);

  // Set document title
  useEffect(() => {
    document.title = "Users | Admin Dashboard";
  }, []);

  // Fetch users
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch clients to merge in
  const { data: clients = [], isLoading: clientsLoading } = useQuery<{ id: number; name: string; email: string; userId: number | null }[]>({
    queryKey: ['/api/clients'],
  });

  const isLoading = usersLoading || clientsLoading;

  // Build merged rows: users + clients without a user account
  const userIds = new Set(users.map(u => u.id));
  const clientsWithLogin = clients.filter(c => c.userId && userIds.has(c.userId));
  const clientsWithoutLogin = clients.filter(c => !c.userId);

  // For clients that have a user account, find their user record
  const clientUserIds = new Set(clients.filter(c => c.userId).map(c => c.userId!));
  const adminUsers = users.filter(u => u.role === 'admin');
  const clientUsers = users.filter(u => clientUserIds.has(u.id));

  // Create login mutation
  const createLoginMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest('POST', `/api/clients/${clientId}/create-login`);
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedLogin({ username: data.username, tempPassword: data.tempPassword });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create login", description: error.message, variant: "destructive" });
    },
  });

  // Create user form
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      password: generateRandomPassword(),
      role: "client",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserValues) => {
      // Map fullName to name to match the database field
      const { fullName, ...otherData } = data;
      const userData = {
        ...otherData,
        name: fullName
      };
      
      const response = await apiRequest('POST', '/api/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User created",
        description: "The user has been successfully created.",
      });
      setIsDialogOpen(false);
      form.reset({
        username: "",
        email: "",
        fullName: "",
        password: generateRandomPassword(),
        role: "client",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: CreateUserValues) => {
    createUserMutation.mutate(data);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(u => u.role !== 'client' || clientUserIds.has(u.id)).filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClientsWithoutLogin = clientsWithoutLogin.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </Badge>
        );
      case "client":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <User className="h-3 w-3" />
            Client
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status?: string) => {
    const userStatus = status || 'active';
    
    switch (userStatus) {
      case "disabled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
            <UserX className="h-3 w-3" />
            Disabled
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            Active
          </Badge>
        );
      default:
        return <Badge variant="outline">{userStatus}</Badge>;
    }
  };

  // Generate user initials
  const getUserInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Reset password function
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('POST', `/api/users/${userId}/reset-password`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset successful",
        description: `Temporary password: ${data.tempPassword}`,
      });
      
      // In a production environment, you would want to handle this differently,
      // likely sending an email with the password rather than displaying it in the UI
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update user role function
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await apiRequest('PUT', `/api/users/${userId}`, { role });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Role updated",
        description: `User is now a ${variables.role === 'admin' ? 'administrator' : 'regular user'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Role update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle account status (enable/disable)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      const response = await apiRequest('PUT', `/api/users/${userId}`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Account status updated",
        description: `User account has been ${variables.status === 'disabled' ? 'disabled' : 'enabled'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Status update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleResetPassword = (userId: number) => {
    resetPasswordMutation.mutate(userId);
  };
  
  const handleToggleRole = (user: User) => {
    const newRole = user.role === 'admin' ? 'client' : 'admin';
    updateRoleMutation.mutate({ userId: user.id, role: newRole });
  };
  
  const handleToggleStatus = (user: User) => {
    // The status field doesn't exist in the schema yet, but this prepares
    // for a future feature to disable/enable accounts
    const currentStatus = user.status || 'active';
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    updateStatusMutation.mutate({ userId: user.id, status: newStatus });
  };

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              User Management
            </h1>
          </div>
        </div>
        
        <main>
          <Card>
            <CardHeader className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <CardTitle>User Management</CardTitle>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-secondary-400" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system. They will receive login credentials at their email address.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="john@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temporary Password</FormLabel>
                              <div className="flex space-x-2">
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => form.setValue('password', generateRandomPassword())}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="client">Client</SelectItem>
                                  <SelectItem value="admin">Administrator</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button 
                            type="submit"
                            disabled={createUserMutation.isPending}
                          >
                            {createUserMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create User'
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 && filteredClientsWithoutLogin.length === 0 ? (
                <div className="text-center py-8 text-secondary-500">
                  {searchTerm ? 'No users matching your search' : 'No users found'}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3 font-medium">
                                {getUserInitials(user.name)}
                              </div>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            <a href={`mailto:${user.email}`} className="text-primary-600 hover:underline">
                              {user.email}
                            </a>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <UserCog className="h-4 w-4 mr-2" />
                                    Manage
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Manage User: {user.name}</DialogTitle>
                                    <DialogDescription>
                                      {user.username} ({user.email})
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <h4 className="font-medium">User Actions</h4>
                                      <p className="text-sm text-muted-foreground mb-2">Manage user permissions and access</p>
                                      <div className="flex flex-col space-y-2">
                                        <Button
                                          variant="outline"
                                          onClick={() => handleResetPassword(user.id)}
                                          className="justify-start"
                                        >
                                          <Key className="mr-2 h-4 w-4" />
                                          Reset Password
                                        </Button>
                                        {user.role === 'client' && (
                                          <Button
                                            variant="outline"
                                            className="justify-start"
                                            onClick={() => impersonateMutation.mutate(user.id)}
                                            disabled={impersonateMutation.isPending}
                                          >
                                            {impersonateMutation.isPending ? (
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                              <Eye className="mr-2 h-4 w-4" />
                                            )}
                                            View as Client
                                          </Button>
                                        )}
                                        <Button 
                                          variant={user.role === 'admin' ? 'outline' : 'default'}
                                          className="justify-start"
                                          onClick={() => handleToggleRole(user)}
                                          disabled={updateRoleMutation.isPending}
                                        >
                                          {updateRoleMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                          )}
                                          {user.role === 'admin' ? 'Remove Admin Rights' : 'Make Administrator'}
                                        </Button>
                                        <Button 
                                          variant={user.status === 'disabled' ? 'default' : 'destructive'}
                                          className="justify-start"
                                          onClick={() => handleToggleStatus(user)}
                                          disabled={updateStatusMutation.isPending}
                                        >
                                          {updateStatusMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            user.status === 'disabled' ? (
                                              <UserCheck className="mr-2 h-4 w-4" />
                                            ) : (
                                              <UserX className="mr-2 h-4 w-4" />
                                            )
                                          )}
                                          {(user.status === 'disabled') ? 'Enable Account' : 'Disable Account'}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Clients without login accounts */}
                      {filteredClientsWithoutLogin.map(client => (
                        <TableRow key={`client-${client.id}`} className="opacity-75">
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mr-3 font-medium text-sm">
                                {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium">{client.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">—</TableCell>
                          <TableCell>
                            {client.email ? (
                              <a href={`mailto:${client.email}`} className="text-primary-600 hover:underline">{client.email}</a>
                            ) : (
                              <span className="text-muted-foreground text-sm">No email</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                              <User className="h-3 w-3" />
                              Client
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-100 text-gray-600 flex items-center gap-1 w-fit">
                              No Login
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">—</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!client.email || createLoginMutation.isPending}
                              onClick={() => createLoginMutation.mutate(client.id)}
                              title={!client.email ? "Client needs an email to create a login" : ""}
                            >
                              {createLoginMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Key className="h-4 w-4 mr-2" />
                              )}
                              Create Login
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Created login credentials dialog */}
          {createdLogin && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h3 className="font-semibold text-lg mb-1">Login Created</h3>
                <p className="text-sm text-muted-foreground mb-4">Share these credentials with the client.</p>
                <div className="space-y-3 bg-gray-50 rounded-md p-4 font-mono text-sm">
                  <div><span className="text-gray-500">Username: </span><strong>{createdLogin.username}</strong></div>
                  <div><span className="text-gray-500">Password: </span><strong>{createdLogin.tempPassword}</strong></div>
                </div>
                <Button className="w-full mt-4" onClick={() => setCreatedLogin(null)}>Done</Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
