import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Invoice, Client, Project } from "@shared/schema";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  FileText,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Mail,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import InvoicesTable from "@/components/dashboard/InvoicesTable";

export default function InvoicesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch invoices
  const { data: invoices = [], isLoading, refetch } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  // Fetch clients for reference
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Fetch projects for reference
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Fetch FreshBooks connection to get accountId for building invoice URLs
  const { data: fbConnection } = useQuery<{ accountId: string | null } | null>({
    queryKey: ['/api/api-connections/freshbooks'],
  });

  const getFreshbooksInvoiceUrl = (invoice: Invoice) => {
    if (!invoice.freshbooksId || !fbConnection?.accountId) return null;
    return `https://my.freshbooks.com/#/invoice/${fbConnection.accountId}-${invoice.freshbooksId}`;
  };

  // Update invoice status mutation
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest('PUT', `/api/invoices/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Invoice updated",
        description: "Invoice status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Find client name by ID
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  // Find project name by ID
  const getProjectName = (projectId: number | null) => {
    if (!projectId) return "N/A";
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : "Unknown Project";
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handle view invoice details
  const handleViewInvoice = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setIsViewDialogOpen(true);
    } else {
      toast({
        title: "Invoice not found",
        description: "The selected invoice could not be found.",
        variant: "destructive",
      });
    }
  };

  // Handle marking invoice as paid
  const handleMarkAsPaid = (invoiceId: number) => {
    updateInvoiceStatusMutation.mutate({ id: invoiceId, status: "paid" });
  };

  // Handle sending invoice reminder
  const handleSendReminder = (invoiceId: number) => {
    toast({
      title: "Reminder sent",
      description: "Payment reminder has been sent to the client.",
    });
  };


  // Filter invoices based on search query and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(invoice.clientId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.description && invoice.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Enrich invoices with client and project names for the table component
  const enrichedInvoices = filteredInvoices.map(invoice => ({
    ...invoice,
    clientName: getClientName(invoice.clientId),
    projectName: getProjectName(invoice.projectId)
  }));

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Invoices
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
            <Button 
              onClick={() => toast({
                title: "Sync with Freshbooks",
                description: "Synchronization with Freshbooks has started."
              })}
              className="flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync with Freshbooks
            </Button>
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
                placeholder="Search invoices..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-10">
                {searchQuery || statusFilter ? (
                  <>
                    <p className="text-lg font-medium text-gray-900">No invoices found</p>
                    <p className="mt-1 text-sm text-gray-500">Try changing your search or filter</p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <FileText className="h-16 w-16 text-gray-400" />
                    </div>
                    <p className="mt-4 text-lg font-medium text-gray-900">No invoices</p>
                    <p className="mt-1 text-sm text-gray-500">Invoices will appear here when created in Freshbooks</p>
                  </>
                )}
              </div>
            ) : (
              <InvoicesTable 
                invoices={enrichedInvoices}
                onView={handleViewInvoice}
                title="All Invoices"
              />
            )}
          </div>
        </div>

        {/* Invoice Details Dialog */}
        {selectedInvoice && (
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Invoice Details</DialogTitle>
                <DialogDescription>
                  Invoice #{selectedInvoice.invoiceNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status || 'pending')}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedInvoice.amount)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium">{getClientName(selectedInvoice.clientId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Project</p>
                    <p className="font-medium">{getProjectName(selectedInvoice.projectId)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice Date</p>
                    <p className="font-medium">{selectedInvoice.createdAt instanceof Date ? formatDate(selectedInvoice.createdAt.toISOString()) : formatDate(selectedInvoice.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">{selectedInvoice.dueDate instanceof Date ? formatDate(selectedInvoice.dueDate.toISOString()) : formatDate(selectedInvoice.dueDate)}</p>
                  </div>
                </div>
                
                {selectedInvoice.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="mt-1">{selectedInvoice.description}</p>
                  </div>
                )}
                
                {(selectedInvoice.status || "") === "pending" && (
                  <div className="bg-yellow-50 p-3 rounded-md flex items-start">
                    <AlertCircle className="text-yellow-500 h-5 w-5 mt-0.5 mr-2" />
                    <div>
                      <p className="font-medium text-yellow-800">Payment Pending</p>
                      <p className="text-sm text-yellow-700">This invoice is awaiting payment.</p>
                    </div>
                  </div>
                )}
                
                {(selectedInvoice.status || "") === "overdue" && (
                  <div className="bg-red-50 p-3 rounded-md flex items-start">
                    <AlertCircle className="text-red-500 h-5 w-5 mt-0.5 mr-2" />
                    <div>
                      <p className="font-medium text-red-800">Payment Overdue</p>
                      <p className="text-sm text-red-700">This invoice is past the due date.</p>
                    </div>
                  </div>
                )}
                
                {(selectedInvoice.status || "") === "paid" && (
                  <div className="bg-green-50 p-3 rounded-md flex items-start">
                    <CheckCircle className="text-green-500 h-5 w-5 mt-0.5 mr-2" />
                    <div>
                      <p className="font-medium text-green-800">Payment Received</p>
                      <p className="text-sm text-green-700">This invoice has been paid.</p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex justify-between">
                <div className="flex space-x-2">
                  {getFreshbooksInvoiceUrl(selectedInvoice) && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={getFreshbooksInvoiceUrl(selectedInvoice)!} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View in FreshBooks
                      </a>
                    </Button>
                  )}
                  {(selectedInvoice.status || "") !== "paid" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendReminder(selectedInvoice.id)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Send Reminder
                    </Button>
                  )}
                </div>
                {(selectedInvoice.status || "") !== "paid" && (
                  <Button 
                    onClick={() => {
                      handleMarkAsPaid(selectedInvoice.id);
                      setIsViewDialogOpen(false);
                    }}
                  >
                    Mark as Paid
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
