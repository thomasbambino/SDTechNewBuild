import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project, insertProjectSchema, Client, Invoice, Document } from "@shared/schema";
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
import {
  Plus,
  Search,
  MoreHorizontal,
  RefreshCw,
  Calendar,
  DollarSign,
  Code,
  Smartphone,
  Database,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Flag,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  notes: string | null;
  imagePaths: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

// Form schema based on insert project schema
type ProjectFormValues = z.infer<typeof insertProjectSchema>;

export default function ProjectsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [invoicesProject, setInvoicesProject] = useState<Project | null>(null);
  const [documentsProject, setDocumentsProject] = useState<Project | null>(null);
  const [milestonesProject, setMilestonesProject] = useState<Project | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [milestoneUploading, setMilestoneUploading] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: "", notes: "" });
  const [milestoneImages, setMilestoneImages] = useState<string[]>([]);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const milestoneImageRef = useRef<HTMLInputElement>(null);

  // Fetch projects
  const { data: projects = [], isLoading: isProjectsLoading, refetch } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Fetch clients for the dropdown
  const { data: clients = [], isLoading: isClientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Fetch all invoices for the invoice dialog
  const { data: allInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  // Fetch FreshBooks connection for building invoice URLs
  const { data: fbConnection } = useQuery<{ accountId: string | null } | null>({
    queryKey: ['/api/api-connections/freshbooks'],
  });

  const getFreshbooksInvoiceUrl = (inv: Invoice) => {
    if (!inv.freshbooksId || !fbConnection?.accountId) return null;
    return `https://my.freshbooks.com/#/invoice/${fbConnection.accountId}-${inv.freshbooksId}`;
  };

  // Fetch documents for the selected project
  const { data: projectDocuments = [], refetch: refetchDocuments } = useQuery<Document[]>({
    queryKey: ['/api/documents', documentsProject?.id],
    queryFn: async () => {
      if (!documentsProject) return [];
      const res = await fetch(`/api/documents?projectId=${documentsProject.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
    enabled: !!documentsProject,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (project: ProjectFormValues) => {
      const res = await apiRequest('POST', '/api/projects', project);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project created",
        description: "New project has been added successfully.",
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

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, project }: { id: number, project: Partial<Project> }) => {
      const res = await apiRequest('PUT', `/api/projects/${id}`, project);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project updated",
        description: "Project information has been updated successfully.",
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

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/documents/${id}`);
    },
    onSuccess: () => {
      refetchDocuments();
      toast({ title: "Document deleted" });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  // Upload document handler
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !documentsProject) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('projectId', String(documentsProject.id));
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }
      await refetchDocuments();
      toast({ title: "File uploaded", description: file.name });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : 'Unknown error', variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Milestones query
  const { data: projectMilestones = [], refetch: refetchMilestones } = useQuery<Milestone[]>({
    queryKey: ["/api/milestones", milestonesProject?.id],
    queryFn: async () => {
      if (!milestonesProject) return [];
      const res = await fetch(`/api/projects/${milestonesProject.id}/milestones`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch milestones");
      return res.json();
    },
    enabled: !!milestonesProject,
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async (data: { title: string; notes: string; imagePaths: string[] }) => {
      const res = await apiRequest("POST", "/api/milestones", { projectId: milestonesProject!.id, ...data });
      return res.json();
    },
    onSuccess: () => { refetchMilestones(); setMilestoneForm({ title: "", notes: "" }); setMilestoneImages([]); toast({ title: "Milestone added" }); },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title: string; notes: string; imagePaths: string[] } }) => {
      const res = await apiRequest("PUT", `/api/milestones/${id}`, data);
      return res.json();
    },
    onSuccess: () => { refetchMilestones(); setEditingMilestone(null); toast({ title: "Milestone updated" }); },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/milestones/${id}`); },
    onSuccess: () => { refetchMilestones(); toast({ title: "Milestone deleted" }); },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const handleMilestoneImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMilestoneUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/milestones/image", { method: "POST", credentials: "include", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      if (isEdit && editingMilestone) {
        const existing = editingMilestone.imagePaths ? JSON.parse(editingMilestone.imagePaths) : [];
        setEditingMilestone({ ...editingMilestone, imagePaths: JSON.stringify([...existing, url]) });
      } else {
        setMilestoneImages(prev => [...prev, url]);
      }
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setMilestoneUploading(false);
      e.target.value = "";
    }
  };

  // Helpers for invoice display
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  const formatCurrencyInv = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getInvoiceStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case "overdue": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Add project form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: 0,
      status: "planning",
      startDate: null,
      dueDate: null,
      budget: null,
      progress: 0,
    },
  });

  // Edit project form
  const editForm = useForm<ProjectFormValues>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: 0,
      status: "planning",
      startDate: null,
      dueDate: null,
      budget: null,
      progress: 0,
    },
  });

  // Handle add project submit
  const onAddSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  // Handle edit project submit
  const onEditSubmit = (data: ProjectFormValues) => {
    if (currentProject) {
      updateProjectMutation.mutate({ id: currentProject.id, project: data });
    }
  };

  // Open edit dialog and populate form
  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    editForm.reset({
      name: project.name,
      description: project.description || "",
      clientId: project.clientId,
      status: project.status,
      startDate: project.startDate,
      dueDate: project.dueDate,
      budget: project.budget,
      progress: project.progress,
    });
    setIsEditDialogOpen(true);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "Not set";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Get project icon based on name/description
  const getProjectIcon = (project: Project) => {
    const name = project.name.toLowerCase();
    const description = (project.description || "").toLowerCase();
    
    if (name.includes("web") || name.includes("website") || description.includes("web")) {
      return <Code className="h-5 w-5 text-primary-600" />;
    } else if (name.includes("mobile") || name.includes("app") || description.includes("mobile")) {
      return <Smartphone className="h-5 w-5 text-indigo-600" />;
    } else if (name.includes("data") || name.includes("migration") || description.includes("database")) {
      return <Database className="h-5 w-5 text-purple-600" />;
    }
    
    return <Code className="h-5 w-5 text-primary-600" />;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_progress":
      case "in progress":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">In Progress</Badge>;
      case "planning":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Planning</Badge>;
      case "on_hold":
      case "on hold":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">On Hold</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter projects based on search query and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      getClientName(project.clientId).toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = !selectedStatus || project.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Projects
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              className="flex items-center"
              disabled={isProjectsLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Project</DialogTitle>
                  <DialogDescription>
                    Enter the project details below.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter project description" 
                              {...field} 
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map(client => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value || 'planning'} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planning">Planning</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ""} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ""} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter budget amount" 
                              {...field}
                              value={field.value === null ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="progress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Progress ({field.value || 0}%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="range" 
                              min="0" 
                              max="100" 
                              step="5"
                              {...field}
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createProjectMutation.isPending}>
                        {createProjectMutation.isPending ? "Adding..." : "Add Project"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative col-span-2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Search projects..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedStatus || "all"} onValueChange={(value) => setSelectedStatus(value === "all" ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Cards */}
          {isProjectsLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-10">
              {searchQuery || selectedStatus ? (
                <>
                  <p className="text-lg font-medium text-gray-900">No projects found</p>
                  <p className="mt-1 text-sm text-gray-500">Try changing your search or filter</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-900">No projects yet</p>
                  <p className="mt-1 text-sm text-gray-500">Add your first project to get started</p>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)} 
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Project
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-primary-100 rounded-md flex items-center justify-center mr-2">
                          {getProjectIcon(project)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription>
                            Client: {getClientName(project.clientId)}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProject(project)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDocumentsProject(project)}>
                            View Documents
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setMilestonesProject(project); setMilestoneForm({ title: "", notes: "" }); setMilestoneImages([]); setEditingMilestone(null); }}>
                            Milestones
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 line-clamp-2">{project.description || "No description provided"}</p>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                          <span>{formatDate(project.dueDate)}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                          <span>{formatCurrency(project.budget)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 justify-between items-center">
                    {getStatusBadge(project.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setInvoicesProject(project)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Invoices
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Project Invoices Dialog */}
        <Dialog open={!!invoicesProject} onOpenChange={(open) => !open && setInvoicesProject(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoices — {invoicesProject?.name}</DialogTitle>
              <DialogDescription>All invoices associated with this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                const projectInvoices = allInvoices.filter(inv => inv.projectId === invoicesProject?.id);
                if (projectInvoices.length === 0) {
                  return <p className="text-sm text-muted-foreground py-4 text-center">No invoices found for this project.</p>;
                }
                return projectInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium text-sm">#{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{getClientName(inv.clientId)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getInvoiceStatusBadge(inv.status || 'pending')}
                      <span className="font-semibold text-sm">{formatCurrencyInv(inv.amount)}</span>
                      {getFreshbooksInvoiceUrl(inv) && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getFreshbooksInvoiceUrl(inv)!} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvoicesProject(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project Documents Dialog */}
        <Dialog open={!!documentsProject} onOpenChange={(open) => !open && setDocumentsProject(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Documents — {documentsProject?.name}</DialogTitle>
              <DialogDescription>Upload and manage files for this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {projectDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
              ) : (
                projectDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(doc.size)} · {doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.path} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDocumentMutation.mutate(doc.id)}
                        disabled={deleteDocumentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t pt-4">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleDocumentUpload}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocumentsProject(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Milestones Dialog */}
        <Dialog open={!!milestonesProject} onOpenChange={open => !open && setMilestonesProject(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Milestones — {milestonesProject?.name}</DialogTitle>
              <DialogDescription>Add progress updates visible to the client on their dashboard.</DialogDescription>
            </DialogHeader>

            {/* Existing milestones */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {projectMilestones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No milestones yet.</p>
              ) : projectMilestones.map(m => {
                const images: string[] = m.imagePaths ? JSON.parse(m.imagePaths) : [];
                if (editingMilestone?.id === m.id) {
                  const editImages: string[] = editingMilestone.imagePaths ? JSON.parse(editingMilestone.imagePaths) : [];
                  return (
                    <div key={m.id} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <Input value={editingMilestone.title} onChange={e => setEditingMilestone({ ...editingMilestone, title: e.target.value })} placeholder="Title" />
                      <Textarea value={editingMilestone.notes || ""} onChange={e => setEditingMilestone({ ...editingMilestone, notes: e.target.value })} placeholder="Notes" rows={2} className="resize-none" />
                      {editImages.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {editImages.map((src, i) => (
                            <div key={i} className="relative">
                              <img src={src} className="h-16 w-16 object-cover rounded border" />
                              <button onClick={() => { const updated = editImages.filter((_, j) => j !== i); setEditingMilestone({ ...editingMilestone, imagePaths: JSON.stringify(updated) }); }} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center text-xs">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input type="file" accept="image/*" className="hidden" ref={milestoneImageRef} onChange={e => handleMilestoneImageUpload(e, true)} />
                        <Button variant="outline" size="sm" onClick={() => milestoneImageRef.current?.click()} disabled={milestoneUploading}><ImageIcon className="h-3 w-3 mr-1" />Add Image</Button>
                        <Button size="sm" onClick={() => updateMilestoneMutation.mutate({ id: m.id, data: { title: editingMilestone.title, notes: editingMilestone.notes || "", imagePaths: editImages } })} disabled={updateMilestoneMutation.isPending}>Save</Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingMilestone(null)}>Cancel</Button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="border rounded-md p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(m.createdAt), "MMM d, yyyy · h:mm a")}</p>
                        {m.notes && <p className="text-sm text-gray-600 mt-1">{m.notes}</p>}
                        {images.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {images.map((src, i) => <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} className="h-14 w-14 object-cover rounded border hover:opacity-80" /></a>)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingMilestone(m)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteMilestoneMutation.mutate(m.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add new milestone */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Add New Milestone</p>
              <Input value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (e.g. Foundation work completed)" />
              <Textarea value={milestoneForm.notes} onChange={e => setMilestoneForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" rows={2} className="resize-none" />
              {milestoneImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {milestoneImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} className="h-16 w-16 object-cover rounded border" />
                      <button onClick={() => setMilestoneImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="file" accept="image/*" className="hidden" onChange={e => handleMilestoneImageUpload(e, false)} id="milestone-img-input" />
                <Button variant="outline" size="sm" onClick={() => document.getElementById("milestone-img-input")?.click()} disabled={milestoneUploading}>
                  <ImageIcon className="h-3 w-3 mr-1" />{milestoneUploading ? "Uploading…" : "Add Image"}
                </Button>
                <Button size="sm" onClick={() => createMilestoneMutation.mutate({ title: milestoneForm.title, notes: milestoneForm.notes, imagePaths: milestoneImages })} disabled={!milestoneForm.title || createMilestoneMutation.isPending}>
                  <Plus className="h-3 w-3 mr-1" />{createMilestoneMutation.isPending ? "Adding…" : "Add Milestone"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMilestonesProject(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update the project details below.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter project description" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value.toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value || "planning"} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter budget amount" 
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress ({field.value || 0}%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="5"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProjectMutation.isPending}>
                    {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
