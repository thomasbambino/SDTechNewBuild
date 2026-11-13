import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentsList, { Document } from "@/components/dashboard/DocumentsList";
import { Project } from "@/components/dashboard/ProjectsTable";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Folder,
  PlusCircle,
  Filter
} from "lucide-react";

export default function ClientDocumentsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Fetch all documents
  const { data: documents = [], isLoading: isDocumentsLoading, refetch } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  // Fetch projects for the filter dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Get document icon based on type
  const getDocumentIcon = (document: Document) => {
    const fileName = document.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      return <FileText className="text-red-600" />;
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      return <FileSpreadsheet className="text-green-600" />;
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif') || fileName.endsWith('.svg')) {
      return <FileImage className="text-purple-600" />;
    } else {
      return <FileText className="text-blue-600" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  // Handle document view
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsViewDialogOpen(true);
  };

  // Handle document download
  const handleDownloadDocument = (document: Document) => {
    toast({
      title: "Download started",
      description: `Downloading ${document.name}...`,
    });
    
    // In a real implementation, this would be a proper API endpoint
    window.open(document.path, '_blank');
  };

  // Handle file upload
  const handleFileUpload = () => {
    toast({
      title: "File uploaded",
      description: "Your document has been uploaded successfully.",
    });
    setIsUploadDialogOpen(false);
    refetch();
  };

  // Filter documents based on tab, search and project
  const filteredDocuments = documents.filter(document => {
    // Filter by document type tab
    if (activeTab === "spreadsheets" && 
        !(document.name.endsWith('.xlsx') || document.name.endsWith('.xls') || document.name.endsWith('.csv'))) {
      return false;
    }
    if (activeTab === "images" && 
        !(document.name.endsWith('.jpg') || document.name.endsWith('.jpeg') || document.name.endsWith('.png') || document.name.endsWith('.gif'))) {
      return false;
    }
    if (activeTab === "pdfs" && !document.name.endsWith('.pdf')) {
      return false;
    }

    // Filter by search
    const matchesSearch = document.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by project
    const matchesProject = !projectFilter || document.projectId === projectFilter;
    
    return matchesSearch && matchesProject;
  });

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Documents
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              className="flex items-center"
              disabled={isDocumentsLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={() => setIsUploadDialogOpen(true)}
              className="flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="pdfs">PDFs</TabsTrigger>
              <TabsTrigger value="spreadsheets">Spreadsheets</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <div className="relative flex-1 sm:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="search"
                  placeholder="Search documents..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={projectFilter?.toString() || "all"} onValueChange={(value) => setProjectFilter(value === "all" ? null : parseInt(value))}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            {isDocumentsLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-lg shadow">
                <Folder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || projectFilter 
                    ? "No documents match your search criteria" 
                    : "Upload a document to get started"}
                </p>
                <Button 
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="mt-4"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {filteredDocuments.map(document => (
                    <Card key={document.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                              {getDocumentIcon(document)}
                            </div>
                            <CardTitle className="text-base line-clamp-1">
                              {document.name}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-500">
                            Uploaded on {formatDate(document.createdAt)}
                          </p>
                          {document.projectName && (
                            <p className="text-gray-500">
                              Project: {document.projectName}
                            </p>
                          )}
                          {document.size && (
                            <p className="text-gray-500">
                              Size: {formatBytes(document.size)}
                            </p>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewDocument(document)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownloadDocument(document)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Document Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a document to share with your project team
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-name">Document Name</Label>
                <Input id="file-name" placeholder="Enter document name" className="mt-1" />
              </div>
              
              <div>
                <Label htmlFor="project">Project</Label>
                <Select>
                  <SelectTrigger id="project" className="mt-1">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="file-upload">File</Label>
                <div className="mt-1">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, XLS, JPG, PNG (MAX. 10MB)
                        </p>
                      </div>
                      <input id="file-upload" type="file" className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleFileUpload}>
                Upload Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Document Dialog */}
        {selectedDocument && (
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <div className="h-6 w-6 mr-2">
                    {getDocumentIcon(selectedDocument)}
                  </div>
                  {selectedDocument.name}
                </DialogTitle>
                <DialogDescription>
                  Uploaded on {formatDate(selectedDocument.createdAt)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto">
                    {getDocumentIcon(selectedDocument)}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Document preview not available. Please download to view.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Project</p>
                  <p className="font-medium">{selectedDocument.projectName || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Uploaded By</p>
                  <p className="font-medium">{selectedDocument.uploaderName || "System"}</p>
                </div>
                <div>
                  <p className="text-gray-500">File Type</p>
                  <p className="font-medium">{selectedDocument.type || selectedDocument.name.split('.').pop()?.toUpperCase() || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Size</p>
                  <p className="font-medium">{selectedDocument.size ? formatBytes(selectedDocument.size) : "Unknown"}</p>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadDocument(selectedDocument)}
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
