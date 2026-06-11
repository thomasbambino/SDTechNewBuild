import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from "react-beautiful-dnd";
import {
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  GripVertical,
  LayoutGrid,
  FileText,
  Users,
  MessageSquare,
  Home,
  RefreshCw,
  Crop,
  Globe,
  ExternalLink,
  Pencil,
  Layout,
  Code,
  Briefcase,
  BarChart,
  Database,
  Shield,
  Zap,
  Settings,
  Monitor,
  Smartphone,
  Wrench,
} from "lucide-react";

const SERVICE_ICON_OPTIONS = [
  { key: "layout",     label: "Layout",     Icon: Layout },
  { key: "code",       label: "Code",       Icon: Code },
  { key: "briefcase",  label: "Consulting", Icon: Briefcase },
  { key: "barChart",   label: "Analytics",  Icon: BarChart },
  { key: "globe",      label: "Web",        Icon: Globe },
  { key: "database",   label: "Database",   Icon: Database },
  { key: "shield",     label: "Security",   Icon: Shield },
  { key: "zap",        label: "Speed",      Icon: Zap },
  { key: "settings",   label: "IT/Ops",     Icon: Settings },
  { key: "monitor",    label: "Hardware",   Icon: Monitor },
  { key: "users",      label: "Team",       Icon: Users },
  { key: "smartphone", label: "Mobile",     Icon: Smartphone },
  { key: "wrench",     label: "Support",    Icon: Wrench },
];
import Cropper from "react-easy-crop";
import heic2any from "heic2any";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Content } from "@shared/schema";

interface ContentWithId extends Content {
  tempId?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function getCroppedBlob(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.92);
  });
}

export default function ContentEditorPage() {
  const { toast } = useToast();

  const contentTypes = [
    { value: "hero", label: "Hero Section", icon: <Home className="mr-2 h-4 w-4" /> },
    { value: "service", label: "Services", icon: <LayoutGrid className="mr-2 h-4 w-4" /> },
    { value: "about", label: "About Us", icon: <Users className="mr-2 h-4 w-4" /> },
    { value: "testimonial", label: "Testimonials", icon: <MessageSquare className="mr-2 h-4 w-4" /> },
    { value: "content", label: "Other Content", icon: <FileText className="mr-2 h-4 w-4" /> },
  ];

  const [mode, setMode] = useState<"sections" | "pages">("sections");
  const [activeTab, setActiveTab] = useState("hero");
  const [contents, setContents] = useState<Record<string, ContentWithId[]>>({});
  const [editingContent, setEditingContent] = useState<ContentWithId | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  // Crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const rawFileRef = useRef<File | null>(null);

  const { data: allContents, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/contents"],
  });

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  // ── Custom Pages ────────────────────────────────────────────────────────
  interface CustomPage { id: number; title: string; slug: string; content: string | null; isPublished: boolean; updatedAt: string; }
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [pageForm, setPageForm] = useState({ title: "", slug: "", content: "", isPublished: true });
  const [isNewPage, setIsNewPage] = useState(false);

  const { data: customPages = [], refetch: refetchPages } = useQuery<CustomPage[]>({
    queryKey: ["/api/pages"],
    queryFn: async () => {
      const res = await fetch("/api/pages", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const savePageMutation = useMutation({
    mutationFn: async (data: typeof pageForm & { id?: number }) => {
      const { id, ...body } = data;
      const res = await (id
        ? fetch(`/api/pages/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : fetch("/api/pages", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { refetchPages(); setEditingPage(null); setIsNewPage(false); toast({ title: "Page saved" }); },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/pages/${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => { refetchPages(); toast({ title: "Page deleted" }); },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const openNewPage = () => { setPageForm({ title: "", slug: "", content: "", isPublished: true }); setEditingPage(null); setIsNewPage(true); };
  const openEditPage = (p: CustomPage) => { setEditingPage(p); setPageForm({ title: p.title, slug: p.slug, content: p.content ?? "", isPublished: p.isPublished }); setIsNewPage(false); };
  const handleSavePage = () => savePageMutation.mutate(editingPage ? { ...pageForm, id: editingPage.id } : pageForm);
  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const createContentMutation = useMutation({
    mutationFn: async (content: Partial<Content>) => {
      const res = await apiRequest("POST", "/api/contents", content);
      return await res.json();
    },
    onSuccess: (newContent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/content/${newContent.type}`] });
      toast({ title: "Content created" });
      setEditingContent(null);
      refreshPreview();
    },
    onError: (error) => {
      toast({ title: "Creation failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: Partial<Content> }) => {
      const res = await apiRequest("PUT", `/api/contents/${id}`, content);
      return await res.json();
    },
    onSuccess: (updatedContent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/content/${updatedContent.type}`] });
      toast({ title: "Content updated" });
      setEditingContent(null);
      refreshPreview();
    },
    onError: (error) => {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contents/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      ["hero", "service", "about", "testimonial", "content"].forEach((type) =>
        queryClient.invalidateQueries({ queryKey: [`/api/content/${type}`] })
      );
      toast({ title: "Content deleted" });
      refreshPreview();
    },
    onError: (error) => {
      toast({ title: "Deletion failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (allContents) {
      const organizedContents: Record<string, ContentWithId[]> = {};
      contentTypes.forEach((type) => { organizedContents[type.value] = []; });
      allContents.forEach((content) => {
        if (organizedContents[content.type]) organizedContents[content.type].push(content);
        else organizedContents.content.push(content);
      });
      Object.keys(organizedContents).forEach((type) => {
        organizedContents[type].sort((a, b) => a.order - b.order);
      });
      setContents(organizedContents);
    }
  }, [allContents]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const contentType = source.droppableId;
    const newItems = Array.from(contents[contentType]);
    const [removed] = newItems.splice(source.index, 1);
    newItems.splice(destination.index, 0, removed);
    const updatedItems = newItems.map((item, index) => ({ ...item, order: index }));
    setContents((prev) => ({ ...prev, [contentType]: updatedItems }));
    updatedItems.forEach((item) => {
      if (item.id && item.order !== undefined) {
        updateContentMutation.mutate({ id: item.id, content: { order: item.order } });
      }
    });
  };

  const handleAddContent = () => {
    const tempId = `temp-${Date.now()}`;
    const newContent: ContentWithId = {
      id: 0,
      tempId,
      type: activeTab,
      title: "",
      subtitle: "",
      content: "",
      imagePath: null,
      order: contents[activeTab].length,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
    setEditingContent(newContent);
    setImagePreview(null);
  };

  const handleEditContent = (content: ContentWithId) => {
    setEditingContent(content);
    setImagePreview(content.imagePath);
  };

  // Open file picker → show crop modal (converts HEIC to JPEG first)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    let processedFile = file;
    const isHeic = file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");

    if (isHeic) {
      try {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
      } catch (err) {
        toast({ title: "Could not convert HEIC image", description: "Try exporting as JPEG from Photos.", variant: "destructive" });
        return;
      }
    }

    rawFileRef.current = processedFile;
    const objectUrl = URL.createObjectURL(processedFile);
    setCropSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropModalOpen(true);
  };

  const onCropComplete = useCallback((_: unknown, croppedPixels: CropArea) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Apply crop: generate canvas blob → upload
  const handleApplyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const preview = URL.createObjectURL(blob);
      setImagePreview(preview);

      const formData = new FormData();
      formData.append("image", blob, rawFileRef.current?.name || "image.jpg");
      const res = await fetch("/api/content/image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      if (editingContent) setEditingContent({ ...editingContent, imagePath: url });
      setCropModalOpen(false);
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsCropping(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingContent) setEditingContent({ ...editingContent, [name]: value });
  };

  const handleActiveToggle = (checked: boolean) => {
    if (editingContent) setEditingContent({ ...editingContent, isActive: checked });
  };

  const handleSaveContent = () => {
    if (!editingContent) return;
    const { tempId, ...contentData } = editingContent;
    if (editingContent.id === 0) createContentMutation.mutate(contentData);
    else updateContentMutation.mutate({ id: editingContent.id, content: contentData });
  };

  const handleDeleteContent = (id: number) => {
    if (window.confirm("Are you sure you want to delete this content?")) deleteContentMutation.mutate(id);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
            <p className="text-sm text-gray-500">{mode === "sections" ? "Edit your public-facing website content" : "Hidden pages not shown in navigation"}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden">
              <button onClick={() => setMode("sections")} className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 ${mode === "sections" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}>
                <LayoutGrid className="h-3.5 w-3.5" />Sections
              </button>
              <button onClick={() => setMode("pages")} className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 border-l ${mode === "pages" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}>
                <Globe className="h-3.5 w-3.5" />Pages
              </button>
            </div>
            {mode === "sections" && <>
              <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              {showPreview && <Button variant="ghost" size="icon" onClick={refreshPreview}><RefreshCw className="h-4 w-4" /></Button>}
              <Button onClick={handleAddContent}><Plus className="mr-2 h-4 w-4" />Add Content</Button>
            </>}
            {mode === "pages" && <Button onClick={openNewPage}><Plus className="mr-2 h-4 w-4" />New Page</Button>}
          </div>
        </div>

        {/* Pages mode */}
        {mode === "pages" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Page list */}
            <div className="w-72 border-r flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto">
                {customPages.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No pages yet.</p>
                    <p className="text-xs mt-1">Create a privacy policy, terms, etc.</p>
                  </div>
                ) : customPages.map(p => (
                  <button key={p.id} onClick={() => openEditPage(p)} className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${editingPage?.id === p.id || (isNewPage && false) ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <span className={`text-xs ml-2 flex-shrink-0 ${p.isPublished ? "text-green-600" : "text-muted-foreground"}`}>{p.isPublished ? "Live" : "Draft"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">/pages/{p.slug}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Page editor */}
            <div className="flex-1 overflow-y-auto p-6">
              {!editingPage && !isNewPage ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Globe className="h-12 w-12 mb-3 opacity-20" />
                  <p className="font-medium">Select a page to edit</p>
                  <p className="text-sm mt-1">or create a new one</p>
                </div>
              ) : (
                <div className="max-w-2xl space-y-4">
                  <div className="space-y-1">
                    <Label>Page Title</Label>
                    <Input value={pageForm.title} onChange={e => { const t = e.target.value; setPageForm(f => ({ ...f, title: t, slug: isNewPage && !f.slug ? autoSlug(t) : f.slug })); }} placeholder="Privacy Policy" />
                  </div>
                  <div className="space-y-1">
                    <Label>URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">/pages/</span>
                      <Input value={pageForm.slug} onChange={e => setPageForm(f => ({ ...f, slug: e.target.value }))} placeholder="privacy-policy" className="flex-1" />
                      {pageForm.slug && (
                        <a href={`/pages/${pageForm.slug}`} target="_blank" rel="noreferrer" className="flex-shrink-0">
                          <Button variant="outline" size="sm" type="button"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Only letters, numbers, and hyphens. Not linked from the site nav.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Content</Label>
                    <Textarea value={pageForm.content} onChange={e => setPageForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your page content here..." rows={20} className="font-mono text-sm resize-none" />
                    <p className="text-xs text-muted-foreground">Plain text. Line breaks are preserved.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={pageForm.isPublished} onCheckedChange={v => setPageForm(f => ({ ...f, isPublished: v }))} id="page-published" />
                    <Label htmlFor="page-published">{pageForm.isPublished ? "Published (live)" : "Draft (hidden)"}</Label>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={handleSavePage} disabled={!pageForm.title || !pageForm.slug || savePageMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />{savePageMutation.isPending ? "Saving…" : "Save Page"}
                    </Button>
                    {editingPage && (
                      <Button variant="destructive" onClick={() => { if (confirm("Delete this page?")) deletePageMutation.mutate(editingPage.id); }} disabled={deletePageMutation.isPending}>
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => { setEditingPage(null); setIsNewPage(false); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Body — editor + optional preview */}
        {mode === "sections" && <div className={`flex flex-1 min-h-0 overflow-hidden ${showPreview ? "divide-x" : ""}`}>
          {/* Editor panel */}
          <div className={`overflow-y-auto p-6 ${showPreview ? "w-2/5 min-w-[380px]" : "w-full"}`}>
            {isLoading ? (
              <div className="text-center py-10 text-sm text-gray-500">Loading content...</div>
            ) : (
              <div className="space-y-6">
                {/* Section tabs */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs orientation="vertical" value={activeTab} onValueChange={(v) => { setActiveTab(v); setEditingContent(null); }} className="w-full">
                      <TabsList className="flex flex-col items-stretch h-auto space-y-1">
                        {contentTypes.map((type) => (
                          <TabsTrigger key={type.value} value={type.value} className="justify-start text-left">
                            <div className="flex items-center w-full">
                              {type.icon}
                              {type.label}
                              {contents[type.value]?.length > 0 && (
                                <span className="ml-auto bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">
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

                {/* Content list */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{contentTypes.find((t) => t.value === activeTab)?.label}</CardTitle>
                    <CardDescription>Drag to reorder</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contents[activeTab]?.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-md">
                        <p className="text-sm text-gray-500 mb-3">No items yet</p>
                        <Button variant="outline" size="sm" onClick={handleAddContent}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    ) : (
                      <>
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId={activeTab}>
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {contents[activeTab]?.map((item, index) => (
                                <Draggable key={item.id || item.tempId} draggableId={String(item.id || item.tempId)} index={index}>
                                  {(provided) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center p-3 rounded-md border hover:bg-gray-50">
                                      <div {...provided.dragHandleProps} className="mr-3 cursor-move text-gray-400">
                                        <GripVertical className="h-5 w-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{item.title || `Item ${index + 1}`}</p>
                                        <p className="text-xs text-gray-500 truncate">{item.subtitle || item.content?.substring(0, 40) || "—"}</p>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditContent(item)}>Edit</Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteContent(item.id)}>
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
                      <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleAddContent}>
                        <Plus className="mr-2 h-4 w-4" />Add Item
                      </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Content editor form */}
                {editingContent && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{editingContent.id === 0 ? "Add New" : "Edit"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" value={editingContent.title || ""} onChange={handleContentChange} placeholder="Title" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="subtitle">Subtitle</Label>
                        <Input id="subtitle" name="subtitle" value={editingContent.subtitle || ""} onChange={handleContentChange} placeholder="Subtitle" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="content">Content</Label>
                        <Textarea id="content" name="content" value={editingContent.content || ""} onChange={handleContentChange} placeholder="Content" rows={4} />
                      </div>

                      {/* Icon selector for service type */}
                      {editingContent.type === 'service' && (
                        <div className="space-y-2">
                          <Label>Icon</Label>
                          <div className="grid grid-cols-7 gap-1.5">
                            {SERVICE_ICON_OPTIONS.map(({ key, label, Icon }) => (
                              <button
                                key={key}
                                type="button"
                                title={label}
                                onClick={() => setEditingContent({ ...editingContent, imagePath: `icon:${key}` })}
                                className={`p-2 rounded border flex flex-col items-center gap-1 hover:bg-primary/10 transition-colors ${
                                  editingContent.imagePath === `icon:${key}` ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                                <span className="text-[9px] leading-none">{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image upload with crop (non-service types only) */}
                      {editingContent.type !== 'service' && <div className="space-y-2">
                        <Label>Image</Label>
                        <div className="flex items-start gap-4">
                          {imagePreview ? (
                            <div className="relative w-28 h-20 rounded-md overflow-hidden border bg-gray-100 flex-shrink-0">
                              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-28 h-20 rounded-md border bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                              No image
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="image-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4">
                              <Upload className="mr-2 h-4 w-4" />
                              Upload &amp; Crop
                            </Label>
                            <Input id="image-upload" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                            {imagePreview && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center"
                                onClick={() => {
                                  if (cropSrc) {
                                    setCrop({ x: 0, y: 0 });
                                    setZoom(1);
                                    setCropModalOpen(true);
                                  }
                                }}
                                disabled={!cropSrc}
                              >
                                <Crop className="mr-2 h-3 w-3" />
                                Adjust Crop
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>}

                      <div className="flex items-center gap-2">
                        <Switch id="active" checked={!!editingContent.isActive} onCheckedChange={handleActiveToggle} />
                        <Label htmlFor="active">Active</Label>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => setEditingContent(null)}>Cancel</Button>
                      <Button onClick={handleSaveContent} disabled={createContentMutation.isPending || updateContentMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        {createContentMutation.isPending || updateContentMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Live preview iframe */}
          {showPreview && (
            <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-white border-b text-xs text-gray-500">
                <span>Live Preview</span>
                <span className="text-gray-400">Refreshes after each save</span>
              </div>
              <iframe
                key={previewKey}
                src="/"
                className="flex-1 w-full border-0"
                title="Website Preview"
              />
            </div>
          )}
        </div>}
      </div>

      {/* Crop modal */}
      <Dialog open={cropModalOpen} onOpenChange={(open) => { if (!open) setCropModalOpen(false); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-80 bg-black rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-2 px-1">
            <Label className="text-sm text-gray-600">Zoom</Label>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropModalOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyCrop} disabled={isCropping}>
              {isCropping ? "Applying..." : "Apply Crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
