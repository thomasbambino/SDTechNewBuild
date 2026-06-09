import { 
  users, User, InsertUser, 
  clients, Client, InsertClient,
  projects, Project, InsertProject,
  invoices, Invoice, InsertInvoice,
  documents, Document, InsertDocument,
  inquiries, Inquiry, InsertInquiry,
  settings, Setting, InsertSetting,
  contents, Content, InsertContent,
  activities, Activity, InsertActivity,
  apiConnections, ApiConnection, InsertApiConnection
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, desc, asc, SQL } from 'drizzle-orm';
import postgres from 'postgres';
import connectPg from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientByUserId(userId: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  
  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByClientId(clientId: number): Promise<Invoice[]>;
  getInvoicesByProjectId(projectId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByProjectId(projectId: number): Promise<Document[]>;
  getDocumentsByClientId(clientId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
  getAllDocuments(): Promise<Document[]>;
  
  // Inquiry operations
  getInquiry(id: number): Promise<Inquiry | undefined>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  updateInquiry(id: number, inquiry: Partial<Inquiry>): Promise<Inquiry | undefined>;
  getPendingInquiries(): Promise<Inquiry[]>;
  getAllInquiries(): Promise<Inquiry[]>;
  
  // Settings operations
  getSettings(): Promise<Setting | undefined>;
  updateSettings(settings: Partial<Setting>): Promise<Setting | undefined>;
  
  // Content operations
  getContent(id: number): Promise<Content | undefined>;
  getContentByType(type: string): Promise<Content[]>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: number, content: Partial<Content>): Promise<Content | undefined>;
  deleteContent(id: number): Promise<boolean>;
  getAllContents(): Promise<Content[]>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  
  // API Connection operations
  getApiConnection(provider: string): Promise<ApiConnection | undefined>;
  updateApiConnection(provider: string, connection: Partial<ApiConnection>): Promise<ApiConnection | undefined>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private projects: Map<number, Project>;
  private invoices: Map<number, Invoice>;
  private documents: Map<number, Document>;
  private inquiries: Map<number, Inquiry>;
  private settingsObj: Setting | undefined;
  private contents: Map<number, Content>;
  private activities: Map<number, Activity>;
  private apiConnections: Map<string, ApiConnection>;
  
  sessionStore: any;
  
  private userCurrentId: number;
  private clientCurrentId: number;
  private projectCurrentId: number;
  private invoiceCurrentId: number;
  private documentCurrentId: number;
  private inquiryCurrentId: number;
  private contentCurrentId: number;
  private activityCurrentId: number;
  private apiConnectionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.projects = new Map();
    this.invoices = new Map();
    this.documents = new Map();
    this.inquiries = new Map();
    this.contents = new Map();
    this.activities = new Map();
    this.apiConnections = new Map();
    
    this.userCurrentId = 1;
    this.clientCurrentId = 1;
    this.projectCurrentId = 1;
    this.invoiceCurrentId = 1;
    this.documentCurrentId = 1;
    this.inquiryCurrentId = 1;
    this.contentCurrentId = 1;
    this.activityCurrentId = 1;
    this.apiConnectionCurrentId = 1;
    
    this.settingsObj = {
      id: 1,
      companyName: "SD Tech Pros",
      logoPath: null,
      primaryColor: "hsl(222.2 47.4% 11.2%)",
      theme: "light",
      radius: 0.5,
      siteTitle: "SD Tech Pros Client Portal",
      siteDescription: null,
      favicon: null,
      updatedAt: new Date()
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    // Ensure role is never undefined
    const role = insertUser.role || 'client';
    const user: User = { 
      ...insertUser,
      role, // Assign the guaranteed non-undefined role
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { ...user, ...userUpdate, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClientByUserId(userId: number): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.userId === userId
    );
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientCurrentId++;
    const now = new Date();
    const client: Client = { ...insertClient, id, createdAt: now, updatedAt: now };
    this.clients.set(id, client);
    return client;
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient: Client = { ...client, ...clientUpdate, updatedAt: new Date() };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.clientId === clientId
    );
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectCurrentId++;
    const now = new Date();
    const project: Project = { ...insertProject, id, createdAt: now, updatedAt: now };
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject: Project = { ...project, ...projectUpdate, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }
  
  async getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.clientId === clientId
    );
  }
  
  async getInvoicesByProjectId(projectId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.projectId === projectId
    );
  }
  
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceCurrentId++;
    const now = new Date();
    const invoice: Invoice = { ...insertInvoice, id, createdAt: now, updatedAt: now };
    this.invoices.set(id, invoice);
    return invoice;
  }
  
  async updateInvoice(id: number, invoiceUpdate: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice: Invoice = { ...invoice, ...invoiceUpdate, updatedAt: new Date() };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }
  
  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentsByProjectId(projectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.projectId === projectId
    );
  }
  
  async getDocumentsByClientId(clientId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.clientId === clientId
    );
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentCurrentId++;
    const now = new Date();
    const document: Document = { ...insertDocument, id, createdAt: now, updatedAt: now };
    this.documents.set(id, document);
    return document;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
  
  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }
  
  // Inquiry operations
  async getInquiry(id: number): Promise<Inquiry | undefined> {
    return this.inquiries.get(id);
  }
  
  async createInquiry(insertInquiry: InsertInquiry): Promise<Inquiry> {
    const id = this.inquiryCurrentId++;
    const now = new Date();
    const inquiry: Inquiry = { ...insertInquiry, id, createdAt: now, updatedAt: now };
    this.inquiries.set(id, inquiry);
    return inquiry;
  }
  
  async updateInquiry(id: number, inquiryUpdate: Partial<Inquiry>): Promise<Inquiry | undefined> {
    const inquiry = this.inquiries.get(id);
    if (!inquiry) return undefined;
    
    const updatedInquiry: Inquiry = { ...inquiry, ...inquiryUpdate, updatedAt: new Date() };
    this.inquiries.set(id, updatedInquiry);
    return updatedInquiry;
  }
  
  async getPendingInquiries(): Promise<Inquiry[]> {
    return Array.from(this.inquiries.values()).filter(
      (inquiry) => inquiry.status === "pending"
    );
  }
  
  async getAllInquiries(): Promise<Inquiry[]> {
    return Array.from(this.inquiries.values());
  }
  
  // Settings operations
  async getSettings(): Promise<Setting | undefined> {
    return this.settingsObj;
  }
  
  async updateSettings(settingsUpdate: Partial<Setting>): Promise<Setting | undefined> {
    if (!this.settingsObj) return undefined;
    
    this.settingsObj = { ...this.settingsObj, ...settingsUpdate, updatedAt: new Date() };
    return this.settingsObj;
  }
  
  // Content operations
  async getContent(id: number): Promise<Content | undefined> {
    return this.contents.get(id);
  }
  
  async getContentByType(type: string): Promise<Content[]> {
    return Array.from(this.contents.values()).filter(
      (content) => content.type === type && content.isActive
    );
  }
  
  async createContent(insertContent: InsertContent): Promise<Content> {
    const id = this.contentCurrentId++;
    const now = new Date();
    const content: Content = { ...insertContent, id, updatedAt: now };
    this.contents.set(id, content);
    return content;
  }
  
  async updateContent(id: number, contentUpdate: Partial<Content>): Promise<Content | undefined> {
    const content = this.contents.get(id);
    if (!content) return undefined;
    
    const updatedContent: Content = { ...content, ...contentUpdate, updatedAt: new Date() };
    this.contents.set(id, updatedContent);
    return updatedContent;
  }
  
  async deleteContent(id: number): Promise<boolean> {
    return this.contents.delete(id);
  }
  
  async getAllContents(): Promise<Content[]> {
    return Array.from(this.contents.values());
  }
  
  // Activity operations
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const now = new Date();
    const activity: Activity = { ...insertActivity, id, createdAt: now };
    this.activities.set(id, activity);
    return activity;
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  // API Connection operations
  async getApiConnection(provider: string): Promise<ApiConnection | undefined> {
    return this.apiConnections.get(provider);
  }
  
  async updateApiConnection(provider: string, connectionUpdate: Partial<ApiConnection>): Promise<ApiConnection | undefined> {
    const connection = this.apiConnections.get(provider);
    
    if (connection) {
      const updatedConnection: ApiConnection = { ...connection, ...connectionUpdate, updatedAt: new Date() };
      this.apiConnections.set(provider, updatedConnection);
      return updatedConnection;
    } else if (connectionUpdate.provider) {
      const id = this.apiConnectionCurrentId++;
      const now = new Date();
      const newConnection: ApiConnection = { 
        id,
        provider: connectionUpdate.provider,
        accessToken: connectionUpdate.accessToken || null,
        refreshToken: connectionUpdate.refreshToken || null,
        expiresAt: connectionUpdate.expiresAt || null,
        isActive: connectionUpdate.isActive !== undefined ? connectionUpdate.isActive : true,
        updatedAt: now
      };
      this.apiConnections.set(provider, newConnection);
      return newConnection;
    }
    
    return undefined;
  }
}

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private client: ReturnType<typeof postgres>;
  sessionStore: any; // Fix the type issue with session.SessionStore

  constructor() {
    // Initialize the database connection
    this.client = postgres(process.env.DATABASE_URL as string, { max: 10 });
    this.db = drizzle(this.client);
    
    const pool = {
      query: (text: string, params: any[]) => this.client.unsafe(text, params),
      connect: () => Promise.resolve({
        query: (text: string, params: any[]) => this.client.unsafe(text, params),
        release: () => {}
      }),
    };

    // Use MemoryStore instead of PostgresSessionStore for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.client`SELECT * FROM users WHERE id = ${id}`;
    if (result.length === 0) return undefined;
    
    // Map the result to the expected User type
    const user = result[0];
    console.log('Found user by id:', user);
    
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user["createdat"] || user["createdAt"] || new Date(),
      updatedAt: user["updatedat"] || user["updatedAt"] || new Date()
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.client`SELECT * FROM users WHERE username = ${username}`;
    if (result.length === 0) return undefined;
    
    // Map the result to the expected User type
    const user = result[0];
    console.log('Found user:', user);
    
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user["createdat"] || user["createdAt"] || new Date(),
      updatedAt: user["updatedat"] || user["updatedAt"] || new Date()
    };
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.client`SELECT * FROM users WHERE email = ${email}`;
    if (result.length === 0) return undefined;
    
    // Map the result to the expected User type
    const user = result[0];
    console.log('Found user by email:', user);
    
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user["createdat"] || user["createdAt"] || new Date(),
      updatedAt: user["updatedat"] || user["updatedAt"] || new Date()
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }
  
  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    console.log(`Updating user with ID: ${id}, Update data:`, userUpdate);
    try {
      // First verify the user exists
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        console.log(`User with id ${id} not found`);
        return undefined;
      }
      
      // Prepare the update data
      const updateData: Partial<User> = {
        ...userUpdate,
        updatedAt: new Date()
      };
      
      // Using the eq function for safer comparisons
      const result = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
        
      if (result && result.length > 0) {
        console.log('Updated user result:', result[0]);
        return result[0];
      }
      
      console.log('No user updated');
      return undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await this.db.select().from(clients).where(({ id: clientId }) => clientId.equals(id));
    return client;
  }
  
  async getClientByUserId(userId: number): Promise<Client | undefined> {
    const [client] = await this.db.select().from(clients).where(({ userId: clientUserId }) => clientUserId.equals(userId));
    return client;
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await this.db.insert(clients).values(client).returning();
    return newClient;
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client | undefined> {
    const [updatedClient] = await this.db
      .update(clients)
      .set({ ...clientUpdate, updatedAt: new Date() })
      .where(({ id: clientId }) => clientId.equals(id))
      .returning();
    return updatedClient;
  }
  
  async getAllClients(): Promise<Client[]> {
    return await this.db.select().from(clients);
  }
  
  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(({ id: projectId }) => projectId.equals(id));
    return project;
  }
  
  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return await this.db.select().from(projects).where(({ clientId: projClientId }) => projClientId.equals(clientId));
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await this.db.insert(projects).values(project).returning();
    return newProject;
  }
  
  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await this.db
      .update(projects)
      .set({ ...projectUpdate, updatedAt: new Date() })
      .where(({ id: projectId }) => projectId.equals(id))
      .returning();
    return updatedProject;
  }
  
  async getAllProjects(): Promise<Project[]> {
    return await this.db.select().from(projects);
  }
  
  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await this.db.select().from(invoices).where(({ id: invoiceId }) => invoiceId.equals(id));
    return invoice;
  }
  
  async getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
    return await this.db.select().from(invoices).where(({ clientId: invClientId }) => invClientId.equals(clientId));
  }
  
  async getInvoicesByProjectId(projectId: number): Promise<Invoice[]> {
    return await this.db.select().from(invoices).where(({ projectId: invProjectId }) => invProjectId.equals(projectId));
  }
  
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await this.db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }
  
  async updateInvoice(id: number, invoiceUpdate: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updatedInvoice] = await this.db
      .update(invoices)
      .set({ ...invoiceUpdate, updatedAt: new Date() })
      .where(({ id: invoiceId }) => invoiceId.equals(id))
      .returning();
    return updatedInvoice;
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    return await this.db.select().from(invoices);
  }
  
  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await this.db.select().from(documents).where(({ id: docId }) => docId.equals(id));
    return document;
  }
  
  async getDocumentsByProjectId(projectId: number): Promise<Document[]> {
    return await this.db.select().from(documents).where(({ projectId: docProjectId }) => docProjectId.equals(projectId));
  }
  
  async getDocumentsByClientId(clientId: number): Promise<Document[]> {
    return await this.db.select().from(documents).where(({ clientId: docClientId }) => docClientId.equals(clientId));
  }
  
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await this.db.insert(documents).values(document).returning();
    return newDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    const result = await this.db.delete(documents).where(({ id: docId }) => docId.equals(id));
    return true; // Assuming operation was successful
  }
  
  async getAllDocuments(): Promise<Document[]> {
    return await this.db.select().from(documents);
  }
  
  // Inquiry operations
  async getInquiry(id: number): Promise<Inquiry | undefined> {
    const [inquiry] = await this.db.select().from(inquiries).where(({ id: inquiryId }) => inquiryId.equals(id));
    return inquiry;
  }
  
  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await this.db.insert(inquiries).values(inquiry).returning();
    return newInquiry;
  }
  
  async updateInquiry(id: number, inquiryUpdate: Partial<Inquiry>): Promise<Inquiry | undefined> {
    const [updatedInquiry] = await this.db
      .update(inquiries)
      .set({ ...inquiryUpdate, updatedAt: new Date() })
      .where(({ id: inquiryId }) => inquiryId.equals(id))
      .returning();
    return updatedInquiry;
  }
  
  async getPendingInquiries(): Promise<Inquiry[]> {
    return await this.client`
      SELECT 
        id,
        name,
        email,
        phone,
        message,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM inquiries 
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `;
  }
  
  async getAllInquiries(): Promise<Inquiry[]> {
    return await this.db.select().from(inquiries);
  }
  
  // Settings operations
  async getSettings(): Promise<Setting | undefined> {
    const result = await this.db.select().from(settings).limit(1);
    
    if (result.length === 0) return undefined;
    
    return result[0];
  }
  
  async updateSettings(settingsUpdate: Partial<Setting>): Promise<Setting | undefined> {
    const now = new Date();
    
    // Remove internal properties that should not be stored
    const { id, updatedAt, ...updateData } = settingsUpdate;
    
    // Update data with timestamp
    const dataToUpdate = {
      ...updateData,
      updatedAt: now
    };
    
    // Check if settings exist
    const existingSettings = await this.getSettings();
    
    try {
      if (existingSettings) {
        // Update existing settings
        const [updatedSettings] = await this.db
          .update(settings)
          .set(dataToUpdate)
          .where(eq(settings.id, existingSettings.id))
          .returning();
        
        return updatedSettings;
      } else {
        // Insert new settings with defaults
        const defaultSettings = {
          companyName: updateData.companyName || 'SD Tech Pros',
          logoPath: updateData.logoPath || null,
          primaryColor: updateData.primaryColor || 'hsl(222.2 47.4% 11.2%)',
          theme: updateData.theme || 'light',
          radius: updateData.radius !== undefined ? updateData.radius : 0.5,
          siteTitle: updateData.siteTitle || 'SD Tech Pros Client Portal',
          siteDescription: updateData.siteDescription || null,
          favicon: updateData.favicon || null,
          updatedAt: now
        };
        
        const [newSettings] = await this.db
          .insert(settings)
          .values(defaultSettings)
          .returning();
        
        return newSettings;
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      return existingSettings;
    }
  }
  
  // Content operations
  async getContent(id: number): Promise<Content | undefined> {
    const [content] = await this.db.select().from(contents).where(eq(contents.id, id));
    return content;
  }
  
  async getContentByType(type: string): Promise<Content[]> {
    return await this.db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.type, type),
          eq(contents.isActive, true)
        )
      );
  }
  
  async createContent(content: InsertContent): Promise<Content> {
    const [newContent] = await this.db.insert(contents).values(content).returning();
    return newContent;
  }
  
  async updateContent(id: number, contentUpdate: Partial<Content>): Promise<Content | undefined> {
    const [updatedContent] = await this.db
      .update(contents)
      .set({ ...contentUpdate, updatedAt: new Date() })
      .where(eq(contents.id, id))
      .returning();
    return updatedContent;
  }
  
  async deleteContent(id: number): Promise<boolean> {
    const result = await this.db.delete(contents).where(eq(contents.id, id));
    return true; // Assuming operation was successful
  }
  
  async getAllContents(): Promise<Content[]> {
    return await this.db.select().from(contents);
  }
  
  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await this.db.insert(activities).values(activity).returning();
    return newActivity;
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    return await this.db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }
  
  // API Connection operations
  async getApiConnection(provider: string): Promise<ApiConnection | undefined> {
    const [apiConnection] = await this.db
      .select()
      .from(apiConnections)
      .where(eq(apiConnections.provider, provider));
    return apiConnection;
  }
  
  async updateApiConnection(provider: string, connectionUpdate: Partial<ApiConnection>): Promise<ApiConnection | undefined> {
    const existingConnection = await this.getApiConnection(provider);

    // Ensure expiresAt is a Date object (frontend may send an ISO string)
    const expiresAt = connectionUpdate.expiresAt
      ? (connectionUpdate.expiresAt instanceof Date
          ? connectionUpdate.expiresAt
          : new Date(connectionUpdate.expiresAt as unknown as string))
      : null;

    if (existingConnection) {
      const [updatedConnection] = await this.db
        .update(apiConnections)
        .set({ ...connectionUpdate, expiresAt, updatedAt: new Date() })
        .where(eq(apiConnections.id, existingConnection.id))
        .returning();
      return updatedConnection;
    } else if (connectionUpdate.provider) {
      const [newConnection] = await this.db
        .insert(apiConnections)
        .values({
          provider: connectionUpdate.provider,
          accessToken: connectionUpdate.accessToken || null,
          refreshToken: connectionUpdate.refreshToken || null,
          expiresAt,
          isActive: connectionUpdate.isActive !== undefined ? connectionUpdate.isActive : true,
        })
        .returning();
      return newConnection;
    }
    
    return undefined;
  }
}

// Use DatabaseStorage instead of MemStorage to connect to the PostgreSQL database
export const storage = new DatabaseStorage();
