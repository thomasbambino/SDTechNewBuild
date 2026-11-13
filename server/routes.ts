import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { randomBytes } from "crypto";
import {
  insertClientSchema,
  insertProjectSchema,
  insertInquirySchema,
  insertDocumentSchema,
  insertContentSchema,
  insertUserSchema,
  InsertInquiry,
  InsertUser,
  PASSWORD_MIN_LENGTH,
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

  // Helper function to get file extension from MIME type.
  // SVG is intentionally excluded — serving user-supplied SVGs from the
  // same origin as the app is a stored-XSS vector.
  const getExtensionFromMimeType = (mimeType: string): string => {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/x-icon': '.ico',
      'image/vnd.microsoft.icon': '.ico'
    };

    return mimeToExt[mimeType] || '.img';
  };

  // Verify a file on disk actually begins with one of the allowed image
  // magic-byte signatures. Client-supplied mimetype is NOT trusted.
  const isAllowedImageFile = (filePath: string): boolean => {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(12);
      fs.readSync(fd, buf, 0, 12, 0);
      fs.closeSync(fd);
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
      // JPEG: FF D8 FF
      if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
      // GIF: 47 49 46 38 ("GIF8")
      if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
      // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 ("RIFF....WEBP")
      if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
          buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
      // ICO: 00 00 01 00
      if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return true;
      return false;
    } catch {
      return false;
    }
  };
  
  // Configure multer for file uploads.
  // Everything goes to client/public/uploads — in production this is a
  // Railway volume mount, so files persist across deploys. There used to
  // be a second copy to server/public/uploads but it lived on ephemeral
  // disk and got wiped on every deploy anyway.
  const clientUploadDir = path.join(process.cwd(), 'client/public/uploads');

  if (!fs.existsSync(clientUploadDir)) {
    fs.mkdirSync(clientUploadDir, { recursive: true });
  }

  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, clientUploadDir),
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname) || getExtensionFromMimeType(file.mimetype);
      const filename = `${file.fieldname}-${timestamp}${ext}`;
      cb(null, filename);
    }
  });
  
  const upload = multer({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
      // Allow-list of raster image mimetypes. SVG and anything else is rejected.
      // mimetype is client-supplied — magic bytes are re-verified post-write
      // via verifyUploadedImage() on each route that uses this upload.
      const allowed = new Set([
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'image/x-icon', 'image/vnd.microsoft.icon',
      ]);
      if (allowed.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PNG, JPEG, GIF, WebP, or ICO images are allowed'));
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });

  // Post-write verification: image uploads must pass magic-byte check.
  // Call this inside a route handler after `upload.single(...)` has run.
  const verifyUploadedImage = (req: Request, res: Response): boolean => {
    if (!req.file) return true;
    const filePath = path.join(clientUploadDir, req.file.filename);
    if (!isAllowedImageFile(filePath)) {
      try { fs.unlinkSync(filePath); } catch { /* swallow */ }
      res.status(400).json({ message: "Uploaded file is not a valid image" });
      return false;
    }
    return true;
  };

  // Handler for zod validation errors
  const validateRequest = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    try {
      // Replace req.body with the parsed result so schema coercions
      // (e.g. z.coerce.date() turning ISO strings into Date objects)
      // actually reach the route handler.
      req.body = schema.parse(req.body);
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
  app.post("/api/inquiries", async (req, res, next) => {
    try {
      const { name, email, phone, message, address, city, state, zip } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ message: "name, email, and message are required" });
      }

      // Build full message including address details
      const fullMessage = [
        message,
        address || city || state || zip ? `\nAddress: ${[address, city, state, zip].filter(Boolean).join(', ')}` : '',
      ].join('');

      const inquiry = await storage.createInquiry({
        name,
        email,
        phone: phone || '',
        message: fullMessage,
        status: 'pending',
      });

      await storage.createActivity({
        userId: undefined,
        action: "Inquiry Submitted",
        details: `New inquiry from ${inquiry.name}`,
        entityType: "inquiry",
        entityId: inquiry.id
      });

      // Note: we used to also create a clients row here, but that duplicated
      // records every time a visitor submitted the form. The admin inquiry
      // approval flow creates the client when the inquiry is accepted.

      // Fire-and-forget: create in FreshBooks if connected
      (async () => {
        try {
          const { freshbooksService } = await import("./freshbooks");
          const connected = await freshbooksService.isConnected();
          if (!connected) return;

          const nameParts = name.trim().split(' ');
          await freshbooksService.createClient({
            firstName: nameParts[0] || name,
            lastName: nameParts.slice(1).join(' ') || '',
            email,
            phone: phone || '',
            address: address || '',
            city: city || '',
            state: state || '',
            zip: zip || '',
          });
        } catch (fbErr) {
          console.error('FreshBooks client creation failed (non-blocking):', fbErr);
        }
      })();

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

      // Always return every public field with a usable default so the
      // homepage/auth page don't render as a blank title when the DB
      // row hasn't been created yet.
      res.json({
        companyName: settings?.companyName ?? "SD Tech Pros",
        logoPath: settings?.logoPath ?? null,
        primaryColor: settings?.primaryColor ?? "hsl(222.2 47.4% 11.2%)",
        theme: settings?.theme ?? "light",
        radius: settings?.radius ?? 0.5,
        siteTitle: settings?.siteTitle ?? "SD Tech Pros Client Portal",
        siteDescription: settings?.siteDescription ?? null,
        favicon: settings?.favicon ?? null,
        contactEmail: settings?.contactEmail ?? null,
        contactPhone: settings?.contactPhone ?? null,
        contactAddress: settings?.contactAddress ?? null,
      });
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

  app.get("/api/clients/:id/related-counts", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const counts = await storage.getClientRelatedCounts(parseInt(req.params.id));
      res.json(counts);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const counts = await storage.getClientRelatedCounts(clientId);
      const blockers = Object.entries(counts).filter(([, n]) => n > 0);
      if (blockers.length > 0) {
        return res.status(409).json({
          message: "Client has attached items that must be removed first.",
          counts,
        });
      }

      await storage.deleteClient(clientId);

      await storage.createActivity({
        userId: req.user?.id,
        action: "Client Deleted",
        details: `Client deleted: ${client.name}`,
        entityType: "client",
        entityId: clientId,
      });

      res.sendStatus(204);
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
      // Coerce ISO date strings → Date for drizzle; partial() so any
      // subset of fields is fine on an update.
      const body = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(projectId, body);

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

  app.delete("/api/projects/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      await storage.deleteProject(projectId);

      await storage.createActivity({
        userId: req.user?.id,
        action: "Project Deleted",
        details: `Project deleted: ${project.name}`,
        entityType: "project",
        entityId: projectId,
      });

      res.sendStatus(204);
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
      // If admin, return all documents (optionally filtered by projectId)
      if (req.user?.role === "admin") {
        if (req.query.projectId) {
          const projectId = parseInt(req.query.projectId as string);
          const documents = await storage.getDocumentsByProjectId(projectId);
          return res.json(documents);
        }
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
      if (!verifyUploadedImage(req, res)) return;

      const relativePath = `/uploads/${req.file.filename}`;

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
      if (!verifyUploadedImage(req, res)) return;

      const relativePath = `/uploads/${req.file.filename}`;


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

  // Content image upload endpoint
  app.post("/api/content/image", isAuthenticated, hasRole("admin"), upload.single('image'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      if (!verifyUploadedImage(req, res)) return;
      const relativePath = `/uploads/${req.file.filename}`;
      res.json({ url: relativePath });
    } catch (error) {
      next(error);
    }
  });

  // Document file upload endpoint
  app.post("/api/documents/upload", isAuthenticated, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const relativePath = `/uploads/${req.file.filename}`;

      const projectId = req.body.projectId ? parseInt(req.body.projectId) : null;
      const clientId = req.body.clientId ? parseInt(req.body.clientId) : null;

      const document = await storage.createDocument({
        name: req.body.name || req.file.originalname,
        path: relativePath,
        type: req.file.mimetype,
        size: req.file.size,
        projectId,
        clientId,
        uploadedBy: req.user?.id,
      });

      await storage.createActivity({
        userId: req.user?.id,
        action: "Document Uploaded",
        details: `Document uploaded: ${document.name}`,
        entityType: "document",
        entityId: document.id,
      });

      res.status(201).json(document);
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
      let connection = await storage.getApiConnection("freshbooks");

      // If the token is expired (or about to be) and we have a refresh
      // token, refresh it before responding so the admin page doesn't
      // show a stale "please reconnect" state.
      if (connection?.refreshToken && connection.isActive) {
        const expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
        const needsRefresh = !expiresAt || Date.now() >= expiresAt - 60_000;
        if (needsRefresh) {
          try {
            const { freshbooksService } = await import("./freshbooks");
            await freshbooksService.refreshAccessToken();
            connection = await storage.getApiConnection("freshbooks");
          } catch (err) {
            console.error("Auto-refresh of FreshBooks token failed:", err);
          }
        }
      }

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

      // Preserve the existing refresh_token if the response omits one
      // (FreshBooks rotates on each refresh, but if that ever fails to
      // come back we don't want to erase the only way to re-auth).
      const updated = await storage.updateApiConnection("freshbooks", {
        provider: "freshbooks",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || connection.refreshToken,
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

      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({ message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
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

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const supplied = typeof req.body?.newPassword === "string" ? req.body.newPassword.trim() : "";
      let newPassword: string;
      if (supplied) {
        if (supplied.length < 8) {
          return res.status(400).json({ message: "Password must be at least 8 characters" });
        }
        newPassword = supplied;
      } else {
        newPassword = randomBytes(9).toString("base64url");
      }

      const updatedUser = await storage.updateUser(userId, {
        password: await hashPassword(newPassword),
        updatedAt: new Date()
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to reset password" });
      }

      await storage.createActivity({
        userId: req.user?.id,
        action: "Password Reset",
        details: `Password reset for user ${user.username}`,
        entityType: "user",
        entityId: user.id
      });

      res.json({
        message: "Password has been reset",
        username: user.username,
        newPassword,
      });
    } catch (error) {
      next(error);
    }
  });

  // ── Custom Pages ──────────────────────────────────────────────────────────

  // Public: get a published page by slug
  app.get("/api/pages/:slug", async (req, res, next) => {
    try {
      const page = await storage.getCustomPageBySlug(req.params.slug);
      if (!page || !page.isPublished) return res.status(404).json({ message: "Page not found" });
      res.json(page);
    } catch (err) { next(err); }
  });

  // Admin: list all pages
  app.get("/api/pages", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      res.json(await storage.getAllCustomPages());
    } catch (err) { next(err); }
  });

  // Admin: create page
  app.post("/api/pages", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const { title, slug, content, isPublished } = req.body;
      if (!title || !slug) return res.status(400).json({ message: "title and slug are required" });
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const page = await storage.createCustomPage({ title, slug: cleanSlug, content: content || "", isPublished: isPublished !== false });
      res.status(201).json(page);
    } catch (err) { next(err); }
  });

  // Admin: update page
  app.put("/api/pages/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const { title, slug, content, isPublished } = req.body;
      const cleanSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") : undefined;
      const updated = await storage.updateCustomPage(parseInt(req.params.id), { title, slug: cleanSlug, content, isPublished });
      if (!updated) return res.status(404).json({ message: "Page not found" });
      res.json(updated);
    } catch (err) { next(err); }
  });

  // Admin: delete page
  app.delete("/api/pages/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      await storage.deleteCustomPage(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) { next(err); }
  });

  // ── Messages ──────────────────────────────────────────────────────────────

  // Admin: unread message count for current admin
  app.get("/api/messages/unread-count", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const count = await storage.getUnreadCountForAdmin(req.user!.id);
      res.json({ count });
    } catch (err) { next(err); }
  });

  // Admin: list all clients that have messages + unread counts
  app.get("/api/messages/clients", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const counts = await storage.getAllClientsWithMessageCounts(req.user!.id);
      const allClients = await storage.getAllClients();
      const result = counts.map(c => ({
        ...c,
        client: allClients.find(cl => cl.id === c.clientId) || null,
      }));
      res.json(result);
    } catch (err) { next(err); }
  });

  // Get messages for current client (or for clientId if admin)
  app.get("/api/messages", isAuthenticated, async (req, res, next) => {
    try {
      let clientId: number;
      if (req.user?.role === "admin") {
        if (!req.query.clientId) return res.status(400).json({ message: "clientId required" });
        clientId = parseInt(req.query.clientId as string);
        // Mark admin-received messages (from client) as read
        await storage.markMessagesReadForClient(clientId, req.user.id);
      } else {
        const client = await storage.getClientByUserId(req.user!.id);
        if (!client) return res.status(404).json({ message: "Client profile not found" });
        clientId = client.id;
        await storage.markMessagesReadForClient(clientId, req.user!.id);
      }
      const msgs = await storage.getMessagesByClientId(clientId);
      res.json(msgs);
    } catch (err) { next(err); }
  });

  // Send a message
  app.post("/api/messages", isAuthenticated, async (req, res, next) => {
    try {
      const { content, clientId: bodyClientId } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content is required" });

      let clientId: number;
      if (req.user?.role === "admin") {
        if (!bodyClientId) return res.status(400).json({ message: "clientId required" });
        clientId = parseInt(bodyClientId);
      } else {
        const client = await storage.getClientByUserId(req.user!.id);
        if (!client) return res.status(404).json({ message: "Client profile not found" });
        clientId = client.id;
      }

      const msg = await storage.createMessage({ clientId, senderUserId: req.user!.id, content: content.trim(), isRead: false });
      res.status(201).json(msg);
    } catch (err) { next(err); }
  });

  // ── Milestones ────────────────────────────────────────────────────────────

  app.get("/api/projects/:projectId/milestones", isAuthenticated, async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (req.user?.role !== "admin") {
        // Verify client owns this project
        const client = await storage.getClientByUserId(req.user!.id);
        if (!client) return res.status(403).json({ message: "Forbidden" });
        const project = await storage.getProject(projectId);
        if (!project || project.clientId !== client.id) return res.status(403).json({ message: "Forbidden" });
      }
      const items = await storage.getMilestonesByProjectId(projectId);
      res.json(items);
    } catch (err) { next(err); }
  });

  app.post("/api/milestones", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const { projectId, title, notes, imagePaths } = req.body;
      if (!projectId || !title) return res.status(400).json({ message: "projectId and title required" });
      const milestone = await storage.createMilestone({
        projectId: parseInt(projectId),
        title,
        notes: notes || null,
        imagePaths: imagePaths ? JSON.stringify(imagePaths) : null,
        createdBy: req.user!.id,
      });
      res.status(201).json(milestone);
    } catch (err) { next(err); }
  });

  app.put("/api/milestones/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const { title, notes, imagePaths } = req.body;
      const updated = await storage.updateMilestone(parseInt(req.params.id), {
        title,
        notes: notes || null,
        imagePaths: imagePaths ? JSON.stringify(imagePaths) : null,
      });
      if (!updated) return res.status(404).json({ message: "Milestone not found" });
      res.json(updated);
    } catch (err) { next(err); }
  });

  app.delete("/api/milestones/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      await storage.deleteMilestone(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) { next(err); }
  });

  // Milestone image upload
  app.post("/api/milestones/image", isAuthenticated, hasRole("admin"), upload.single("image"), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      if (!verifyUploadedImage(req, res)) return;
      const relativePath = `/uploads/${req.file.filename}`;
      res.json({ url: relativePath });
    } catch (err) { next(err); }
  });

  // ── Client Notes ──────────────────────────────────────────────────────────

  app.get("/api/client-notes", isAuthenticated, async (req, res, next) => {
    try {
      let clientId: number;
      if (req.user?.role === "admin") {
        if (!req.query.clientId) return res.status(400).json({ message: "clientId required" });
        clientId = parseInt(req.query.clientId as string);
      } else {
        const client = await storage.getClientByUserId(req.user!.id);
        if (!client) return res.status(404).json({ message: "Client profile not found" });
        clientId = client.id;
      }
      const notes = await storage.getClientNotesByClientId(clientId);
      res.json(notes);
    } catch (err) { next(err); }
  });

  app.post("/api/client-notes", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const { clientId, title, content, isPinned } = req.body;
      if (!clientId || !title || !content) return res.status(400).json({ message: "clientId, title, content required" });
      const note = await storage.createClientNote({ clientId: parseInt(clientId), title, content, isPinned: !!isPinned, createdBy: req.user!.id });
      res.status(201).json(note);
    } catch (err) { next(err); }
  });

  app.put("/api/client-notes/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const { title, content, isPinned } = req.body;
      const updated = await storage.updateClientNote(parseInt(req.params.id), { title, content, isPinned: !!isPinned });
      if (!updated) return res.status(404).json({ message: "Note not found" });
      res.json(updated);
    } catch (err) { next(err); }
  });

  app.delete("/api/client-notes/:id", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      await storage.deleteClientNote(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) { next(err); }
  });

  // Create a login account for an existing client
  app.post("/api/clients/:id/create-login", isAuthenticated, hasRole("admin"), async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.userId) return res.status(400).json({ message: "Client already has a login" });
      if (!client.email) return res.status(400).json({ message: "Client has no email address" });

      // Generate username from name or email
      const baseUsername = client.name
        .toLowerCase().replace(/[^a-z0-9]/g, ".")
        .replace(/\.+/g, ".").replace(/^\.|\.$/, "")
        || client.email.split("@")[0];

      // Ensure username is unique
      let username = baseUsername;
      let suffix = 1;
      while (await storage.getUserByUsername(username)) {
        username = `${baseUsername}${suffix++}`;
      }

      // 12-char URL-safe random password from a CSPRNG.
      const tempPassword = randomBytes(9).toString("base64url");
      const hashedPassword = await hashPassword(tempPassword);

      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        name: client.name,
        email: client.email,
        role: "client",
      });

      await storage.updateClient(clientId, { userId: newUser.id });

      res.json({ username, tempPassword, userId: newUser.id });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
