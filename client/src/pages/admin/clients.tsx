import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Client, insertClientSchema } from "@shared/schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Search, MoreHorizontal, RefreshCw, User, Mail, Phone, Eye, KeyRound } from "lucide-react";

// Form schema based on insert client schema
type ClientFormValues = z.infer<typeof insertClientSchema>;

export default function ClientsPage() {
  const { toast } = useToast();
  const { impersonateMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [createdLogin, setCreatedLogin] = useState<{ username: string; tempPassword: string; userId: number; clientName: string } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{ projects: number; invoices: number; documents: number; messages: number; notes: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch clients
  const { data: clients = [], isLoading, refetch } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (client: ClientFormValues) => {
      const res = await apiRequest('POST', '/api/clients', client);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client created",
        description: "New client has been added successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, client }: { id: number, client: Partial<Client> }) => {
      const res = await apiRequest('PUT', `/api/clients/${id}`, client);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client updated",
        description: "Client information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Add client form
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Edit client form
  const editForm = useForm<ClientFormValues>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Handle add client submit
  const onAddSubmit = (data: ClientFormValues) => {
    createClientMutation.mutate(data);
  };

  // Handle edit client submit
  const onEditSubmit = (data: ClientFormValues) => {
    if (currentClient) {
      updateClientMutation.mutate({ id: currentClient.id, client: data });
    }
  };

  // Open edit dialog and populate form
  const handleEditClient = (client: Client) => {
    setCurrentClient(client);
    editForm.reset({
      name: client.name,
      contactPerson: client.contactPerson || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Create login for client (admin assigns a client user)
  const createLoginMutation = useMutation({
    mutationFn: async (client: Client) => {
      const res = await apiRequest("POST", `/api/clients/${client.id}/create-login`);
      const data = await res.json();
      return { ...data, clientName: client.name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setCreatedLogin(data);
    },
    onError: (err: Error) => toast({ title: "Failed to create login", description: err.message, variant: "destructive" }),
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE", credentials: "include" });
      if (res.status === 409) {
        const body = await res.json();
        const err: any = new Error(body.message || "Blocked");
        err.counts = body.counts;
        err.blocked = true;
        throw err;
      }
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: "Client deleted" });
      setDeleteClient(null);
      setDeleteBlocked(null);
    },
    onError: (err: any) => {
      if (err.blocked && err.counts) {
        setDeleteBlocked(err.counts);
      } else {
        toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      }
    },
  });

  // Filter clients based on search query
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.contactPerson && client.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Clients
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Enter the client's information below.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter client name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact person name" {...field} />
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
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter additional notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createClientMutation.isPending}>
                        {createClientMutation.isPending ? "Adding..." : "Add Client"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search clients..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Clients Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-10">
                {searchQuery ? (
                  <>
                    <p className="text-lg font-medium text-gray-900">No clients found</p>
                    <p className="mt-1 text-sm text-gray-500">Try changing your search query</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium text-gray-900">No clients yet</p>
                    <p className="mt-1 text-sm text-gray-500">Add your first client to get started</p>
                    <Button 
                      onClick={() => setIsAddDialogOpen(true)} 
                      className="mt-4"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Client
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/admin/clients/${client.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-primary/10 mr-3 flex items-center justify-center text-primary">
                              <User className="h-5 w-5" />
                            </div>
                            {client.name}
                          </div>
                        </TableCell>
                        <TableCell>{client.contactPerson || "—"}</TableCell>
                        <TableCell>
                          {client.email ? (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-1 text-gray-400" />
                              {client.email}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {client.phone ? (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1 text-gray-400" />
                              {client.phone}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setLocation(`/admin/clients/${client.id}`)}>
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setLocation(`/admin/clients/${client.id}?tab=notes`)}>
                                Client Notes
                              </DropdownMenuItem>
                              {client.userId ? (
                                <DropdownMenuItem
                                  onClick={() => impersonateMutation.mutate(client.userId as number)}
                                  disabled={impersonateMutation.isPending}
                                >
                                  <Eye className="h-4 w-4 mr-2" /> View as Client
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => createLoginMutation.mutate(client)}
                                  disabled={createLoginMutation.isPending || !client.email}
                                >
                                  <KeyRound className="h-4 w-4 mr-2" /> Create Login
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { setDeleteClient(client); setDeleteBlocked(null); }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Edit Client Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                Update the client's information below.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact person name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateClientMutation.isPending}>
                    {updateClientMutation.isPending ? "Updating..." : "Update Client"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Created-login reveal */}
        <Dialog open={!!createdLogin} onOpenChange={open => { if (!open) setCreatedLogin(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Login created for {createdLogin?.clientName}</DialogTitle>
              <DialogDescription>
                Copy these credentials now — the password won't be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 text-sm">
              <div><span className="text-gray-500">Username: </span><strong>{createdLogin?.username}</strong></div>
              <div><span className="text-gray-500">Password: </span><strong className="font-mono">{createdLogin?.tempPassword}</strong></div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (createdLogin) navigator.clipboard?.writeText(`Username: ${createdLogin.username}\nPassword: ${createdLogin.tempPassword}`);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                Copy
              </Button>
              <Button variant="outline" onClick={() => setCreatedLogin(null)}>Done</Button>
              <Button
                onClick={() => {
                  if (!createdLogin) return;
                  const userId = createdLogin.userId;
                  setCreatedLogin(null);
                  impersonateMutation.mutate(userId);
                }}
                disabled={impersonateMutation.isPending}
              >
                <Eye className="h-4 w-4 mr-2" /> View as Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Client Confirmation */}
        <AlertDialog open={!!deleteClient} onOpenChange={open => { if (!open) { setDeleteClient(null); setDeleteBlocked(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteBlocked ? "Cannot delete this client yet" : `Delete ${deleteClient?.name}?`}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                {deleteBlocked ? (
                  <div className="space-y-2">
                    <p>This client has related records that must be removed first:</p>
                    <ul className="list-disc list-inside text-sm">
                      {deleteBlocked.projects > 0 && <li>{deleteBlocked.projects} project{deleteBlocked.projects === 1 ? "" : "s"}</li>}
                      {deleteBlocked.invoices > 0 && <li>{deleteBlocked.invoices} invoice{deleteBlocked.invoices === 1 ? "" : "s"}</li>}
                      {deleteBlocked.documents > 0 && <li>{deleteBlocked.documents} document{deleteBlocked.documents === 1 ? "" : "s"}</li>}
                      {deleteBlocked.messages > 0 && <li>{deleteBlocked.messages} message{deleteBlocked.messages === 1 ? "" : "s"}</li>}
                      {deleteBlocked.notes > 0 && <li>{deleteBlocked.notes} note{deleteBlocked.notes === 1 ? "" : "s"}</li>}
                    </ul>
                    <p className="pt-2">Open the client to review and delete those items, then try again.</p>
                  </div>
                ) : (
                  <span>This permanently removes the client{deleteClient?.userId ? " and their login account" : ""}. This action cannot be undone.</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {!deleteBlocked && (
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(e) => { e.preventDefault(); if (deleteClient) deleteClientMutation.mutate(deleteClient.id); }}
                  disabled={deleteClientMutation.isPending}
                >
                  {deleteClientMutation.isPending ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
