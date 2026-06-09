import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { 
  insertClientSchema, 
  insertProjectSchema,
  insertInquirySchema,
  insertDocumentSchema,
  insertContentSchema,
  insertUserSchema,
  InsertInquiry,
  InsertUser
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";



// Auth middleware to ensure user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Role middleware to ensure user has specific role
const hasRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user?.role === role) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Insufficient permissions" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Add a dedicated test endpoint that serves a simple HTML page with the logo
  app.get('/api/debug/logo-test', (req, res) => {
    const logoPath = '/uploads/logo-1741979910954.png';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logo Test</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .test-item { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
        img { max-width: 300px; border: 2px solid #eee; }
        h2 { color: #333; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Logo Test Page</h1>
        
        <div class="test-item">
          <h2>Direct Image Path Test</h2>
          <p>Testing: <code>${logoPath}</code></p>
          <img src="${logoPath}" alt="Logo Test" onerror="this.parentNode.innerHTML += '<p class=\\'error\\'>❌ Image failed to load</p>'">
        </div>
        
        <div class="test-item">
          <h2>Alternative Path Test</h2>
          <p>Testing: <code>/uploads/logo-1741979910954.png</code></p>
          <img src="/uploads/logo-1741979910954.png" alt="Logo Test" onerror="this.parentNode.innerHTML += '<p class=\\'error\\'>❌ Image failed to load</p>'">
        </div>
        
        <div class="test-item">
          <h2>Path With Query Parameter Test</h2>
          <p>Testing: <code>${logoPath}?t=${Date.now()}</code></p>
          <img src="${logoPath}?t=${Date.now()}" alt="Logo Test" onerror="this.parentNode.innerHTML += '<p class=\\'error\\'>❌ Image failed to load</p>'">
        </div>
      </div>
    </body>
    </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Enhanced debug endpoint to check file accessibility - no auth required for debugging
  app.get('/api/debug/file-check', async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ message: "No file path provided" });
      }
      
      // Remove leading slash if present
      const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      
      // Create absolute paths
      const clientPublicPath = path.join(process.cwd(), 'client/public', cleanPath);
      const serverPublicPath = path.join(process.cwd(), 'server/public', cleanPath);
      
      // Check if files exist
      const clientFileExists = fs.existsSync(clientPublicPath);
      const serverFileExists = fs.existsSync(serverPublicPath);
      
      // Check file sizes if they exist
      let clientFileSize = 0;
      let serverFileSize = 0;
      let clientMimeType = null;
      let serverMimeType = null;
      let clientFileContent = null;
      
      if (clientFileExists) {
        const clientStats = fs.statSync(clientPublicPath);
        clientFileSize = clientStats.size;
        
        // Try to determine MIME type
        if (clientPublicPath.endsWith('.png')) {
          clientMimeType = 'image/png';
        } else if (clientPublicPath.endsWith('.jpg') || clientPublicPath.endsWith('.jpeg')) {
          clientMimeType = 'image/jpeg';
        } else if (clientPublicPath.endsWith('.svg')) {
          clientMimeType = 'image/svg+xml';
          // For SVGs, we can read the content
          clientFileContent = fs.readFileSync(clientPublicPath, 'utf8');
        }
      }
      
      if (serverFileExists) {
        const serverStats = fs.statSync(serverPublicPath);
        serverFileSize = serverStats.size;
        
        // Try to determine MIME type
        if (serverPublicPath.endsWith('.png')) {
          serverMimeType = 'image/png';
        } else if (serverPublicPath.endsWith('.jpg') || serverPublicPath.endsWith('.jpeg')) {
          serverMimeType = 'image/jpeg';
        } else if (serverPublicPath.endsWith('.svg')) {
          serverMimeType = 'image/svg+xml';
        }
      }
      
      // Test direct access URL
      const directUrl = `${req.protocol}://${req.get('host')}${filePath}`;
      const alternativeUrl = `${req.protocol}://${req.get('host')}/uploads/${path.basename(filePath)}`;
      
      res.json({
        requestedPath: filePath,
        cleanPath,
        clientPublicPath,
        serverPublicPath,
        clientFileExists,
        serverFileExists,
        clientFileSize,
        serverFileSize,
        clientMimeType,
        serverMimeType,
        directUrl,
        alternativeUrl,
        clientFileContent,
        currentUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking file", error: String(error) });
    }
  });
  
  // Helper function to get file extension from MIME type
  const getExtensionFromMimeType = (mimeType: string): string => {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'image/webp': '.webp',
      'image/x-icon': '.ico',
      'image/vnd.microsoft.icon': '.ico'
    };
    
    return mimeToExt[mimeType] || '.img';
  };
  
  // Configure multer for file uploads
  const clientUploadDir = path.join(process.cwd(), 'client/public/uploads');
  const serverUploadDir = path.join(process.cwd(), 'server/public/uploads');
  
  // Create uploads directories if they don't exist
  if (!fs.existsSync(clientUploadDir)) {
    fs.mkdirSync(clientUploadDir, { recursive: true });
  }
  
  if (!fs.existsSync(serverUploadDir)) {
    fs.mkdirSync(serverUploadDir, { recursive: true });
  }
  
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Save to client uploads directory first
      cb(null, clientUploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      // Make sure we preserve the file extension for proper MIME type detection
      // First check if original filename has an extension, otherwise get one from MIME type
      const ext = path.extname(file.originalname) || getExtensionFromMimeType(file.mimetype);
      
      // Use file.fieldname (like 'logo' or 'favicon') to name the file properly
      // Include the file extension in the name to ensure browser compatibility
      const filename = `${file.fieldname}-${timestamp}${ext}`;
      console.log(`Creating file: ${filename} with mimetype: ${file.mimetype}`);
      
      // Ensure server upload directory exists in case it was deleted
      if (!fs.existsSync(serverUploadDir)) {
        fs.mkdirSync(serverUploadDir, { recursive: true });
      }
      
      cb(null, filename);
    }
  });
  
  const upload = multer({ 
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
      // Only accept images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });

  // Handler for zod validation errors
  const validateRequest = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  };

  // Public routes
  app.post("/api/inquiries", validateRequest(insertInquirySchema), async (req, res, next) => {
    try {
      const inquiry = await storage.createInquiry(req.body as InsertInquiry);
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Inquiry Submitted",
        details: `New inquiry from ${inquiry.name}`,
        entityType: "inquiry",
        entityId: inquiry.id
      });
      
      res.status(201).json(inquiry);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/content/:type", async (req, res, next) => {
    try {
      const { type } = req.params;
      const contents = await storage.getContentByType(type);
      res.json(contents);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/settings/public", async (req, res, next) => {
    try {
      const settings = await storage.getSettings();
      
      // Only return public settings
      const publicSettings = settings ? {
        companyName: settings.companyName,
        logoPath: settings.logoPath,
        primaryColor: settings.primaryColor,
        theme: settings.theme,
        radius: settings.radius,
        siteTitle: settings.siteTitle,
        siteDescription: settings.siteDescription,
        favicon: settings.favicon,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        contactAddress: settings.contactAddress,
      } : {};

      res.json(publicSettings);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard data
  app.get("/api/dashboard/admin", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const clients = await storage.getAllClients();
      const projects = await storage.getAllProjects();
      const invoices = await storage.getAllInvoices();
      const pendingInquiries = await storage.getPendingInquiries();
      const recentActivities = await storage.getRecentActivities(5);
      
      // Calculate stats
      const activeProjects = projects.filter(p => p.status === "in_progress").length;
      const totalClients = clients.length;
      
      // Calculate outstanding invoices
      const outstandingInvoices = invoices
        .filter(i => i.status === "pending" || i.status === "overdue")
        .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
      
      const newInquiriesCount = pendingInquiries.length;
      
      res.json({
        stats: {
          activeProjects,
          totalClients,
          outstandingInvoices,
          newInquiriesCount
        },
        recentActivities,
        pendingInquiries,
        recentProjects: projects.slice(0, 5)
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/dashboard/client", isAuthenticated, async (req, res, next) => {
    try {
      // Get client associated with the current user
      const client = await storage.getClientByUserId(req.user?.id as number);
      
      if (!client) {
        return res.status(404).json({ message: "Client profile not found" });
      }
      
      // Get client projects, invoices, and documents
      const projects = await storage.getProjectsByClientId(client.id);
      const invoices = await storage.getInvoicesByClientId(client.id);
      const documents = await storage.getDocumentsByClientId(client.id);
      
      res.json({
        client,
        projects,
        invoices,
        documents
      });
    } catch (error) {
      next(error);
    }
  });

  // Client routes
  app.get("/api/clients", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/clients", isAuthenticated, hasRole("admin"), validateRequest(insertClientSchema), async (req, res, next) => {
    try {
      const client = await storage.createClient(req.body);
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Client Created",
        details: `New client created: ${client.name}`,
        entityType: "client",
        entityId: client.id
      });
      
      res.status(201).json(client);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/clients/:id", isAuthenticated, async (req, res, next) => {
    try {
      const client = await storage.getClient(parseInt(req.params.id));
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if user is admin or the client is associated with the user
      if (req.user?.role !== "admin" && client.userId !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this client" });
      }
      
      res.json(client);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/clients/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      const updatedClient = await storage.updateClient(clientId, req.body);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Client Updated",
        details: `Client ${updatedClient.name} updated`,
        entityType: "client",
        entityId: updatedClient.id
      });
      
      res.json(updatedClient);
    } catch (error) {
      next(error);
    }
  });

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req, res, next) => {
    try {
      // If admin, return all projects, else return only client's projects
      if (req.user?.role === "admin") {
        const projects = await storage.getAllProjects();
        return res.json(projects);
      }
      
      // For client users, find their client record and get projects
      const client = await storage.getClientByUserId(req.user?.id as number);
      
      if (!client) {
        return res.status(404).json({ message: "Client profile not found" });
      }
      
      const projects = await storage.getProjectsByClientId(client.id);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/projects", isAuthenticated, hasRole("admin"), validateRequest(insertProjectSchema), async (req, res, next) => {
    try {
      const project = await storage.createProject(req.body);
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Project Created",
        details: `New project created: ${project.name}`,
        entityType: "project",
        entityId: project.id
      });
      
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/projects/:id", isAuthenticated, async (req, res, next) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // If user is not admin, check if the project belongs to their client
      if (req.user?.role !== "admin") {
        const client = await storage.getClientByUserId(req.user?.id as number);
        
        if (!client || project.clientId !== client.id) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this project" });
        }
      }
      
      res.json(project);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/projects/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.id);
      const updatedProject = await storage.updateProject(projectId, req.body);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Project Updated",
        details: `Project ${updatedProject.name} updated`,
        entityType: "project",
        entityId: updatedProject.id
      });
      
      res.json(updatedProject);
    } catch (error) {
      next(error);
    }
  });

  // Invoice routes
  app.get("/api/invoices", isAuthenticated, async (req, res, next) => {
    try {
      // If admin, return all invoices, else return only client's invoices
      if (req.user?.role === "admin") {
        const invoices = await storage.getAllInvoices();
        return res.json(invoices);
      }
      
      // For client users, find their client record and get invoices
      const client = await storage.getClientByUserId(req.user?.id as number);
      
      if (!client) {
        return res.status(404).json({ message: "Client profile not found" });
      }
      
      const invoices = await storage.getInvoicesByClientId(client.id);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/projects/:id/invoices", isAuthenticated, async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // If user is not admin, check if the project belongs to their client
      if (req.user?.role !== "admin") {
        const client = await storage.getClientByUserId(req.user?.id as number);
        
        if (!client || project.clientId !== client.id) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this project" });
        }
      }
      
      const invoices = await storage.getInvoicesByProjectId(projectId);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  // Document routes
  app.get("/api/documents", isAuthenticated, async (req, res, next) => {
    try {
      // If admin, return all documents, else return only client's documents
      if (req.user?.role === "admin") {
        const documents = await storage.getAllDocuments();
        return res.json(documents);
      }
      
      // For client users, find their client record and get documents
      const client = await storage.getClientByUserId(req.user?.id as number);
      
      if (!client) {
        return res.status(404).json({ message: "Client profile not found" });
      }
      
      const documents = await storage.getDocumentsByClientId(client.id);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/documents", isAuthenticated, validateRequest(insertDocumentSchema), async (req, res, next) => {
    try {
      // If not admin, ensure document is associated with user's client
      if (req.user?.role !== "admin") {
        const client = await storage.getClientByUserId(req.user?.id as number);
        
        if (!client) {
          return res.status(404).json({ message: "Client profile not found" });
        }
        
        // Ensure document is for user's client
        if (req.body.clientId && req.body.clientId !== client.id) {
          return res.status(403).json({ message: "Forbidden: You can only upload documents for your own account" });
        }
        
        // Set client ID if not provided
        if (!req.body.clientId) {
          req.body.clientId = client.id;
        }
      }
      
      const document = await storage.createDocument({
        ...req.body,
        uploadedBy: req.user?.id
      });
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Document Uploaded",
        details: `New document uploaded: ${document.name}`,
        entityType: "document",
        entityId: document.id
      });
      
      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/documents/:id", isAuthenticated, async (req, res, next) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check permissions
      if (req.user?.role !== "admin" && document.uploadedBy !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to delete this document" });
      }
      
      const deleted = await storage.deleteDocument(documentId);
      
      if (deleted) {
        await storage.createActivity({
          userId: req.user?.id,
          action: "Document Deleted",
          details: `Document deleted: ${document.name}`,
          entityType: "document",
          entityId: document.id
        });
        
        return res.status(204).send();
      }
      
      res.status(500).json({ message: "Failed to delete document" });
    } catch (error) {
      next(error);
    }
  });

  // Inquiry routes
  app.get("/api/inquiries", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const inquiries = await storage.getAllInquiries();
      res.json(inquiries);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/inquiries/pending", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const pendingInquiries = await storage.getPendingInquiries();
      res.json(pendingInquiries);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/inquiries/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const inquiryId = parseInt(req.params.id);
      const updatedInquiry = await storage.updateInquiry(inquiryId, req.body);
      
      if (!updatedInquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Inquiry Updated",
        details: `Inquiry status changed to ${updatedInquiry.status}`,
        entityType: "inquiry",
        entityId: updatedInquiry.id
      });
      
      res.json(updatedInquiry);
    } catch (error) {
      next(error);
    }
  });

  // Content management routes
  app.get("/api/contents", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const contents = await storage.getAllContents();
      res.json(contents);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/contents", isAuthenticated, hasRole("admin"), validateRequest(insertContentSchema), async (req, res, next) => {
    try {
      const content = await storage.createContent(req.body);
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Content Created",
        details: `New content created: ${content.title || content.type}`,
        entityType: "content",
        entityId: content.id
      });
      
      res.status(201).json(content);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/contents/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const contentId = parseInt(req.params.id);
      const updatedContent = await storage.updateContent(contentId, req.body);
      
      if (!updatedContent) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      await storage.createActivity({
        userId: req.user?.id,
        action: "Content Updated",
        details: `Content updated: ${updatedContent.title || updatedContent.type}`,
        entityType: "content",
        entityId: updatedContent.id
      });
      
      res.json(updatedContent);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/contents/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const contentId = parseInt(req.params.id);
      const content = await storage.getContent(contentId);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      const deleted = await storage.deleteContent(contentId);
      
      if (deleted) {
        await storage.createActivity({
          userId: req.user?.id,
          action: "Content Deleted",
          details: `Content deleted: ${content.title || content.type}`,
          entityType: "content",
          entityId: content.id
        });
        
        return res.status(204).send();
      }
      
      res.status(500).json({ message: "Failed to delete content" });
    } catch (error) {
      next(error);
    }
  });

  // Settings routes
  app.get("/api/settings", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/settings", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const updatedSettings = await storage.updateSettings(req.body);
      
      if (updatedSettings) {
        await storage.createActivity({
          userId: req.user?.id,
          action: "Settings Updated",
          details: "System settings were updated",
          entityType: "settings",
          entityId: updatedSettings.id
        });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      next(error);
    }
  });
  
  // Logo upload endpoint
  app.post("/api/settings/logo", isAuthenticated, hasRole("admin"), upload.single('logo'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      console.log("Logo uploaded:", req.file.filename, "Mimetype:", req.file.mimetype);
      
      // Get the relative path to use in the frontend with the file extension included
      const relativePath = `/uploads/${req.file.filename}`;
      
      // Copy the uploaded file to server/public/uploads for static serving
      try {
        const sourceFile = path.join(clientUploadDir, req.file.filename);
        const destFile = path.join(serverUploadDir, req.file.filename);
        
        // Make sure server uploads directory exists
        if (!fs.existsSync(serverUploadDir)) {
          fs.mkdirSync(serverUploadDir, { recursive: true });
        }
        
        // Copy the file to server/public/uploads
        fs.copyFileSync(sourceFile, destFile);
        console.log(`Logo file copied to server public directory: ${destFile}`);
      } catch (copyErr) {
        console.error('Error copying logo file to server directory:', copyErr);
        // Continue even if copy fails, as we still have the file in client/public
      }
      
      console.log("Updating logo path in settings to:", relativePath);
      
      const updatedSettings = await storage.updateSettings({
        logoPath: relativePath
      });
      
      if (updatedSettings) {
        await storage.createActivity({
          userId: req.user?.id,
          action: "Logo Updated",
          details: "Company logo was updated",
          entityType: "settings",
          entityId: updatedSettings.id
        });
      }
      
      res.json({ 
        url: relativePath,
        message: "Logo uploaded successfully" 
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Favicon upload endpoint
  app.post("/api/settings/favicon", isAuthenticated, hasRole("admin"), upload.single('favicon'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      console.log("Favicon uploaded:", req.file.filename, "Mimetype:", req.file.mimetype);
      
      // Get the relative path to use in the frontend with the file extension included
      const relativePath = `/uploads/${req.file.filename}`;
      
      // Copy the uploaded file to server/public/uploads for static serving
      try {
        const sourceFile = path.join(clientUploadDir, req.file.filename);
        const destFile = path.join(serverUploadDir, req.file.filename);
        
        // Make sure server uploads directory exists
        if (!fs.existsSync(serverUploadDir)) {
          fs.mkdirSync(serverUploadDir, { recursive: true });
        }
        
        // Copy the file to server/public/uploads
        fs.copyFileSync(sourceFile, destFile);
        console.log(`Favicon file copied to server public directory: ${destFile}`);
      } catch (copyErr) {
        console.error('Error copying favicon file to server directory:', copyErr);
        // Continue even if copy fails, as we still have the file in client/public
      }
      
      console.log("Updating favicon path in settings to:", relativePath);
      
      const updatedSettings = await storage.updateSettings({
        favicon: relativePath
      });
      
      if (updatedSettings) {
        await storage.createActivity({
          userId: req.user?.id,
          action: "Favicon Updated",
          details: "Site favicon was updated",
          entityType: "settings",
          entityId: updatedSettings.id
        });
      }
      
      res.json({ 
        url: relativePath,
        message: "Favicon uploaded successfully" 
      });
    } catch (error) {
      next(error);
    }
  });

  // Activity routes
  app.get("/api/activities", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  // Freshbooks API connection routes
  app.get("/api/api-connections/freshbooks", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const connection = await storage.getApiConnection("freshbooks");
      res.json(connection || null);
    } catch (error) {
      next(error);
    }
  });

  // Initiate FreshBooks OAuth — redirects browser to FreshBooks authorization page
  app.get("/api/api-connections/freshbooks/auth", isAuthenticated, hasRole("admin"), (req, res) => {
    const clientId = process.env.FRESHBOOKS_CLIENT_ID;
    const redirectUri = process.env.FRESHBOOKS_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return res.status(400).json({ message: "FRESHBOOKS_CLIENT_ID and FRESHBOOKS_REDIRECT_URI environment variables are not set." });
    }
    const url = `https://my.freshbooks.com/service/auth/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.redirect(url);
  });

  const handleFreshbooksCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, error } = req.query;
      if (error || !code) {
        return res.redirect("/admin/api-connections?error=freshbooks_denied");
      }

      const clientId = process.env.FRESHBOOKS_CLIENT_ID;
      const clientSecret = process.env.FRESHBOOKS_CLIENT_SECRET;
      const redirectUri = process.env.FRESHBOOKS_REDIRECT_URI;
      if (!clientId || !clientSecret || !redirectUri) {
        return res.redirect("/admin/api-connections?error=missing_env");
      }

      const tokenRes = await fetch("https://api.freshbooks.com/auth/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        console.error("FreshBooks token exchange failed:", body);
        return res.redirect("/admin/api-connections?error=token_exchange");
      }

      const tokenData = await tokenRes.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Fetch account ID and business ID from the user profile
      let accountId: string | null = null;
      let businessId: string | null = null;
      try {
        const meRes = await fetch("https://api.freshbooks.com/auth/api/v1/users/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          const bm = me.response?.business_memberships?.[0]?.business;
          accountId = bm?.account_id ?? null;
          businessId = bm?.id ? String(bm.id) : null;
        }
      } catch (e) {
        console.error("Failed to fetch FreshBooks account/business ID:", e);
      }

      await storage.updateApiConnection("freshbooks", {
        provider: "freshbooks",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        isActive: true,
        accountId,
        businessId,
      });

      await storage.createActivity({
        userId: (req.user as any)?.id,
        action: "FreshBooks Connected",
        details: "FreshBooks OAuth connection established",
        entityType: "api_connection",
        entityId: 0,
      });

      res.redirect("/admin/api-connections?connected=freshbooks");
    } catch (error) {
      next(error);
    }
  };

  // FreshBooks OAuth callback — registered redirect URI
  app.get("/auth/callback", isAuthenticated, hasRole("admin"), handleFreshbooksCallback);

  // FreshBooks OAuth callback — alternate path
  app.get("/api/api-connections/freshbooks/callback", isAuthenticated, hasRole("admin"), handleFreshbooksCallback);

  // Refresh FreshBooks token using stored refresh_token
  app.post("/api/api-connections/freshbooks/refresh", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const connection = await storage.getApiConnection("freshbooks");
      if (!connection?.refreshToken) {
        return res.status(400).json({ message: "No refresh token stored. Please reconnect." });
      }

      const clientId = process.env.FRESHBOOKS_CLIENT_ID;
      const clientSecret = process.env.FRESHBOOKS_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(400).json({ message: "FRESHBOOKS_CLIENT_ID and FRESHBOOKS_CLIENT_SECRET environment variables are not set." });
      }

      const tokenRes = await fetch("https://api.freshbooks.com/auth/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: connection.refreshToken,
        }),
      });

      if (!tokenRes.ok) {
        return res.status(502).json({ message: "Failed to refresh token. Please reconnect." });
      }

      const tokenData = await tokenRes.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      const updated = await storage.updateApiConnection("freshbooks", {
        provider: "freshbooks",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        isActive: true,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Disconnect FreshBooks
  app.delete("/api/api-connections/freshbooks", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const updated = await storage.updateApiConnection("freshbooks", {
        provider: "freshbooks",
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        isActive: false,
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Sync FreshBooks data
  app.post("/api/api-connections/freshbooks/sync", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const { freshbooksService } = await import("./freshbooks");
      await freshbooksService.syncAll();
      res.json({ message: "Sync completed successfully." });
    } catch (error) {
      next(error);
    }
  });

  // User Profile Update endpoint
  app.patch("/api/user/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure the user can only update their own profile unless they're an admin
      if (req.user?.id !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }
      
      // Extract the fields we want to allow updating
      const { fullName, email, username } = req.body;
      const updateData: any = {};
      
      if (fullName) updateData.name = fullName;
      if (email) updateData.email = email;
      if (username) updateData.username = username;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create activity record
      await storage.createActivity({
        userId: req.user?.id,
        action: "Profile Updated",
        details: `User ${updatedUser.username} updated their profile`,
        entityType: "user",
        entityId: updatedUser.id
      });
      
      // Don't send the password in the response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  // Change Password endpoint
  app.post("/api/user/change-password", isAuthenticated, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      const user = await storage.getUser(req.user?.id as number);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user with new password
      const updatedUser = await storage.updateUser(user.id, { 
        password: hashedPassword 
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      // Create activity record
      await storage.createActivity({
        userId: user.id,
        action: "Password Changed",
        details: `User ${user.username} changed their password`,
        entityType: "user",
        entityId: user.id
      });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  // User management routes
  app.get("/api/users", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove password field from users
      const usersWithoutPassword = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/users", isAuthenticated, hasRole("admin"), validateRequest(insertUserSchema), async (req, res, next) => {
    try {
      const { password, ...userData } = req.body;
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Create activity record
      await storage.createActivity({
        userId: req.user?.id,
        action: "User Created",
        details: `New user created: ${user.username}`,
        entityType: "user",
        entityId: user.id
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/users/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/users/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { role, ...otherUpdates } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        ...otherUpdates,
        role,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Create activity record
      await storage.createActivity({
        userId: req.user?.id,
        action: "User Updated",
        details: `User ${updatedUser.username} was updated`,
        entityType: "user",
        entityId: updatedUser.id
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/users/:id/reset-password", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
      
      // Hash the password
      const hashedPassword = await hashPassword(tempPassword);
      
      // Update user's password
      const updatedUser = await storage.updateUser(userId, {
        password: hashedPassword,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to reset password" });
      }
      
      // Create activity record
      await storage.createActivity({
        userId: req.user?.id,
        action: "Password Reset",
        details: `Password reset for user ${user.username}`,
        entityType: "user",
        entityId: user.id
      });
      
      // In a real app, this would send an email with the temp password
      // For now, return it in the response
      res.json({ 
        message: "Password has been reset",
        tempPassword: tempPassword
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
