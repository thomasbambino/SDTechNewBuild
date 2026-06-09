import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from "react-beautiful-dnd";
import {
  Save,
  Eye,
  Plus,
  Trash2,
  Upload,
  GripVertical,
  LayoutGrid,
  FileText,
  Users,
  MessageSquare,
  Home
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Content } from "@shared/schema";

interface ContentWithId extends Content {
  tempId?: string;
}

export default function ContentEditorPage() {
  const { toast } = useToast();
  
  // Content types for tabs
  const contentTypes = [
    { value: "hero", label: "Hero Section", icon: <Home className="mr-2 h-4 w-4" /> },
    { value: "service", label: "Services", icon: <LayoutGrid className="mr-2 h-4 w-4" /> },
    { value: "about", label: "About Us", icon: <Users className="mr-2 h-4 w-4" /> },
    { value: "testimonial", label: "Testimonials", icon: <MessageSquare className="mr-2 h-4 w-4" /> },
    { value: "content", label: "Other Content", icon: <FileText className="mr-2 h-4 w-4" /> }
  ];

  const [activeTab, setActiveTab] = useState("hero");
  const [contents, setContents] = useState<Record<string, ContentWithId[]>>({});
  const [editingContent, setEditingContent] = useState<ContentWithId | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Fetch all content
  const { data: allContents, isLoading } = useQuery<Content[]>({
    queryKey: ['/api/contents'],
  });
  
  // Create content mutation
  const createContentMutation = useMutation({
    mutationFn: async (content: Partial<Content>) => {
      const res = await apiRequest('POST', '/api/contents', content);
      return await res.json();
    },
    onSuccess: (newContent) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/content/${newContent.type}`] });
      toast({
        title: "Content created",
        description: "New content has been added successfully.",
      });
      setEditingContent(null);
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number, content: Partial<Content> }) => {
      const res = await apiRequest('PUT', `/api/contents/${id}`, content);
      return await res.json();
    },
    onSuccess: (updatedContent) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/content/${updatedContent.type}`] });
      toast({
        title: "Content updated",
        description: "Content has been updated successfully.",
      });
      setEditingContent(null);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/contents/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contents'] });
      // Invalidate all type-specific queries since we may not know the type at this point
      ['hero', 'service', 'about', 'testimonial', 'content'].forEach(type => {
        queryClient.invalidateQueries({ queryKey: [`/api/content/${type}`] });
      });
      toast({
        title: "Content deleted",
        description: "Content has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  // Organize contents by type when data is loaded
  useEffect(() => {
    if (allContents) {
      const organizedContents: Record<string, ContentWithId[]> = {};
      
      // Initialize empty arrays for each content type
      contentTypes.forEach(type => {
        organizedContents[type.value] = [];
      });
      
      // Populate with actual content
      allContents.forEach(content => {
        if (organizedContents[content.type]) {
          organizedContents[content.type].push(content);
        } else {
          // If it's a type not in our predefined list, add to "content"
          organizedContents.content.push(content);
        }
      });
      
      // Sort by order
      Object.keys(organizedContents).forEach(type => {
        organizedContents[type].sort((a, b) => a.order - b.order);
      });
      
      setContents(organizedContents);
    }
  }, [allContents]);
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    
    // If dropped outside a droppable area
    if (!destination) {
      return;
    }
    
    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    // Get the content type from the droppable ID
    const contentType = source.droppableId;
    
    // Copy the array
    const newItems = Array.from(contents[contentType]);
    
    // Remove the item from the source
    const [removed] = newItems.splice(source.index, 1);
    
    // Insert the item at the destination
    newItems.splice(destination.index, 0, removed);
    
    // Update the order property of each item
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }));
    
    // Update the state
    setContents(prev => ({
      ...prev,
      [contentType]: updatedItems
    }));
    
    // Here you would also update the order in the database
    // For each item that changed position
    updatedItems.forEach(item => {
      if (item.id && item.order !== undefined) {
        updateContentMutation.mutate({
          id: item.id,
          content: { order: item.order }
        });
      }
    });
  };
  
  // Add new content
  const handleAddContent = () => {
    const tempId = `temp-${Date.now()}`;
    const newContent: ContentWithId = {
      id: 0, // Will be replaced by the server
      tempId,
      type: activeTab,
      title: "",
      subtitle: "",
      content: "",
      imagePath: null,
      order: contents[activeTab].length,
      isActive: true,
      updatedAt: new Date().toISOString()
    };
    
    setEditingContent(newContent);
    setImagePreview(null);
  };
  
  // Edit existing content
  const handleEditContent = (content: ContentWithId) => {
    setEditingContent(content);
    setImagePreview(content.imagePath);
  };
  
  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload the file to a server
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      
      // Update the editing content with the new image path
      if (editingContent) {
        setEditingContent({
          ...editingContent,
          imagePath: `/uploads/content_${Date.now()}`
        });
      }
    }
  };
  
  // Handle form field changes
  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingContent) {
      setEditingContent({
        ...editingContent,
        [name]: value
      });
    }
  };
  
  // Handle active status toggle
  const handleActiveToggle = (checked: boolean) => {
    if (editingContent) {
      setEditingContent({
        ...editingContent,
        isActive: checked
      });
    }
  };
  
  // Save content (create or update)
  const handleSaveContent = () => {
    if (editingContent) {
      // Remove tempId and id for new content
      const { tempId, ...contentData } = editingContent;
      
      if (editingContent.id === 0) {
        // Create new content
        createContentMutation.mutate(contentData);
      } else {
        // Update existing content
        updateContentMutation.mutate({
          id: editingContent.id,
          content: contentData
        });
      }
    }
  };
  
  // Delete content
  const handleDeleteContent = (id: number) => {
    if (window.confirm("Are you sure you want to delete this content?")) {
      deleteContentMutation.mutate(id);
    }
  };
  
  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Content Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Edit your public-facing website content
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <Button 
              variant="outline"
              onClick={() => window.open('/', '_blank')}
              className="flex items-center"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Website
            </Button>
            
            <Button 
              onClick={handleAddContent}
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Loading content...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Content sections navigation */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Content Sections</CardTitle>
                  <CardDescription>
                    Manage different sections of your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    orientation="vertical"
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="flex flex-col items-stretch h-auto space-y-1">
                      {contentTypes.map(type => (
                        <TabsTrigger
                          key={type.value}
                          value={type.value}
                          className="justify-start text-left"
                        >
                          <div className="flex items-center">
                            {type.icon}
                            {type.label}
                            {contents[type.value]?.length > 0 && (
                              <span className="ml-auto bg-gray-200 text-gray-800 py-0.5 px-2 rounded-full text-xs">
                                {contents[type.value].length}
                              </span>
                            )}
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            {/* Content items and editor */}
            <div className="md:col-span-2">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {contentTypes.find(t => t.value === activeTab)?.label || 'Content'}
                  </CardTitle>
                  <CardDescription>
                    Drag and drop to reorder items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contents[activeTab]?.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-md">
                      <p className="text-gray-500">No content items yet</p>
                      <Button
                        variant="outline"
                        onClick={handleAddContent}
                        className="mt-4"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add {contentTypes.find(t => t.value === activeTab)?.label || 'Content'}
                      </Button>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId={activeTab}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {contents[activeTab]?.map((item, index) => (
                              <Draggable
                                key={item.id || item.tempId}
                                draggableId={String(item.id || item.tempId)}
                                index={index}
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="flex items-center p-3 rounded-md border hover:bg-gray-50"
                                  >
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="mr-3 cursor-move text-gray-400"
                                    >
                                      <GripVertical className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">
                                        {item.title || `Untitled ${index + 1}`}
                                      </p>
                                      <p className="text-sm text-gray-500 truncate">
                                        {item.subtitle || item.content?.substring(0, 50) || 'No description'}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleEditContent(item)}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeleteContent(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </CardContent>
              </Card>
              
              {/* Content editor */}
              {editingContent && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingContent.id === 0 ? 'Add New Content' : 'Edit Content'}
                    </CardTitle>
                    <CardDescription>
                      {editingContent.id === 0 
                        ? `Adding new ${contentTypes.find(t => t.value === activeTab)?.label || 'content'}`
                        : `Editing ${editingContent.title || 'content'}`
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        value={editingContent.title || ''}
                        onChange={handleContentChange}
                        placeholder="Enter title"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        name="subtitle"
                        value={editingContent.subtitle || ''}
                        onChange={handleContentChange}
                        placeholder="Enter subtitle"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        name="content"
                        value={editingContent.content || ''}
                        onChange={handleContentChange}
                        placeholder="Enter content"
                        rows={5}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Image</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Content preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400">No image</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <Label 
                            htmlFor="image-upload" 
                            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Image
                          </Label>
                          <Input 
                            id="image-upload" 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={editingContent.isActive}
                        onCheckedChange={handleActiveToggle}
                      />
                      <Label htmlFor="active">Active</Label>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setEditingContent(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveContent}
                      disabled={createContentMutation.isPending || updateContentMutation.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {createContentMutation.isPending || updateContentMutation.isPending
                        ? 'Saving...'
                        : 'Save Changes'
                      }
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
