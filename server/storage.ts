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
  apiConnections, ApiConnection, InsertApiConnection,
  messages, Message, InsertMessage,
  messageReads,
  milestones, Milestone, InsertMilestone,
  postLikes, PostLike,
  postComments, PostComment, InsertPostComment,
  clientNotes, ClientNote, InsertClientNote,
  customPages, CustomPage, InsertCustomPage,
  siteStrings, SiteString,
  projectTasks, ProjectTask, InsertProjectTask,
  passwordResetTokens, PasswordResetToken,
  tickets, Ticket, InsertTicket,
  ticketComments, TicketComment, InsertTicketComment,
  appointments, Appointment, InsertAppointment,
  assets, Asset, InsertAsset,
  servicePlans, ServicePlan, InsertServicePlan,
  clientPlans, ClientPlan, InsertClientPlan,
  attachments, Attachment, InsertAttachment,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, or, desc, asc, sql, ne, isNull, SQL } from 'drizzle-orm';
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
  getClientForUser(userId: number): Promise<Client | undefined>; // owner OR sub-user
  getClientMembers(clientId: number): Promise<User[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  getClientRelatedCounts(id: number): Promise<{ projects: number; invoices: number; documents: number; messages: number; notes: number }>;
  deleteClient(id: number): Promise<boolean>;
  getAllClients(): Promise<Client[]>;

  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
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

  // Message operations
  getMessagesByClientId(clientId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesReadForClient(clientId: number, readerUserId: number): Promise<void>;
  getUnreadCountForAdmin(adminUserId: number): Promise<number>;
  getAllClientsWithMessageCounts(adminUserId?: number): Promise<{ clientId: number; unreadCount: number; latestMessage: Message | null }[]>;

  // Milestone operations
  getMilestonesByProjectId(projectId: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, milestone: Partial<Milestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<boolean>;

  // Post engagement
  getPostEngagement(milestoneIds: number[], viewerUserId: number): Promise<Map<number, { likeCount: number; commentCount: number; likedByMe: boolean }>>;
  togglePostLike(milestoneId: number, userId: number): Promise<{ liked: boolean; likeCount: number }>;
  getPostComments(milestoneId: number): Promise<(PostComment & { authorName: string; authorRole: string })[]>;
  createPostComment(comment: InsertPostComment): Promise<PostComment>;
  deletePostComment(id: number): Promise<PostComment | undefined>;

  // Client note operations
  getClientNotesByClientId(clientId: number): Promise<ClientNote[]>;
  createClientNote(note: InsertClientNote): Promise<ClientNote>;
  updateClientNote(id: number, note: Partial<ClientNote>): Promise<ClientNote | undefined>;
  deleteClientNote(id: number): Promise<boolean>;

  // Site string operations
  getAllSiteStrings(): Promise<SiteString[]>;
  upsertSiteStrings(entries: { key: string; value: string }[]): Promise<void>;

  // Password reset tokens
  createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken>;
  findValidPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;

  // User deletion with FK cleanup
  deleteUser(id: number): Promise<{ ok: true } | { ok: false; reason: "primary_owner"; clientIds: number[] }>;

  // Project task operations
  getProjectTasks(projectId: number): Promise<ProjectTask[]>;
  getProjectTasksByClientId(clientId: number): Promise<ProjectTask[]>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: number, task: Partial<ProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: number): Promise<boolean>;

  // Custom page operations
  getAllCustomPages(): Promise<CustomPage[]>;
  getCustomPageBySlug(slug: string): Promise<CustomPage | undefined>;
  createCustomPage(page: InsertCustomPage): Promise<CustomPage>;
  updateCustomPage(id: number, page: Partial<CustomPage>): Promise<CustomPage | undefined>;
  deleteCustomPage(id: number): Promise<boolean>;

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
      primaryColor: "#2B5A94",
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
    
    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      clientId: user["client_id"] ?? user["clientId"] ?? null,
      createdAt: user["createdat"] || user["createdAt"] || new Date(),
      updatedAt: user["updatedat"] || user["updatedAt"] || new Date()
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.client`SELECT * FROM users WHERE username = ${username}`;
    if (result.length === 0) return undefined;

    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      clientId: user["client_id"] ?? user["clientId"] ?? null,
      createdAt: user["createdat"] || user["createdAt"] || new Date(),
      updatedAt: user["updatedat"] || user["updatedAt"] || new Date()
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.client`SELECT * FROM users WHERE email = ${email}`;
    if (result.length === 0) return undefined;

    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      clientId: user["client_id"] ?? user["clientId"] ?? null,
      createdAt: user["createdat"] || user["createdAt"] || new Date(),
      updatedAt: user["updatedat"] || user["updatedAt"] || new Date()
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }
  
  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    try {
      const existingUser = await this.getUser(id);
      if (!existingUser) return undefined;

      const updateData: Partial<User> = {
        ...userUpdate,
        updatedAt: new Date()
      };

      const result = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return result?.[0];
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
    const [client] = await this.db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByUserId(userId: number): Promise<Client | undefined> {
    const [client] = await this.db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async getClientForUser(userId: number): Promise<Client | undefined> {
    // Primary (owner) first…
    const primary = await this.getClientByUserId(userId);
    if (primary) return primary;
    // …otherwise sub-user: look up the user's client_id.
    const user = await this.getUser(userId);
    if (!user || user.clientId == null) return undefined;
    return this.getClient(user.clientId);
  }

  async getClientMembers(clientId: number): Promise<User[]> {
    return await this.db.select().from(users).where(eq(users.clientId, clientId));
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await this.db.insert(clients).values(client).returning();
    return newClient;
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client | undefined> {
    const [updatedClient] = await this.db
      .update(clients)
      .set({ ...clientUpdate, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async getClientRelatedCounts(id: number): Promise<{ projects: number; invoices: number; documents: number; messages: number; notes: number }> {
    const [p, i, d, m, n] = await Promise.all([
      this.db.select().from(projects).where(eq(projects.clientId, id)),
      this.db.select().from(invoices).where(eq(invoices.clientId, id)),
      this.db.select().from(documents).where(eq(documents.clientId, id)),
      this.db.select().from(messages).where(eq(messages.clientId, id)),
      this.db.select().from(clientNotes).where(eq(clientNotes.clientId, id)),
    ]);
    return { projects: p.length, invoices: i.length, documents: d.length, messages: m.length, notes: n.length };
  }

  async deleteClient(id: number): Promise<boolean> {
    const client = await this.getClient(id);
    if (!client) return false;
    await this.db.delete(clients).where(eq(clients.id, id));
    if (client.userId) {
      await this.db.delete(users).where(eq(users.id, client.userId));
    }
    return true;
  }

  async getAllClients(): Promise<Client[]> {
    return await this.db.select().from(clients);
  }
  
  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return await this.db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await this.db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await this.db
      .update(projects)
      .set({ ...projectUpdate, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const project = await this.getProject(id);
    if (!project) return false;
    await this.db.delete(projectTasks).where(eq(projectTasks.projectId, id));
    await this.db.delete(milestones).where(eq(milestones.projectId, id));
    await this.db.delete(documents).where(eq(documents.projectId, id));
    await this.db.delete(invoices).where(eq(invoices.projectId, id));
    await this.db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.db.select().from(projects);
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await this.db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
    return await this.db.select().from(invoices).where(eq(invoices.clientId, clientId));
  }

  async getInvoicesByProjectId(projectId: number): Promise<Invoice[]> {
    return await this.db.select().from(invoices).where(eq(invoices.projectId, projectId));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await this.db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoiceUpdate: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updatedInvoice] = await this.db
      .update(invoices)
      .set({ ...invoiceUpdate, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await this.db.select().from(invoices);
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await this.db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByProjectId(projectId: number): Promise<Document[]> {
    return await this.db.select().from(documents).where(eq(documents.projectId, projectId));
  }

  async getDocumentsByClientId(clientId: number): Promise<Document[]> {
    return await this.db.select().from(documents).where(eq(documents.clientId, clientId));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await this.db.insert(documents).values(document).returning();
    return newDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const deleted = await this.db.delete(documents).where(eq(documents.id, id)).returning({ id: documents.id });
    return deleted.length > 0;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await this.db.select().from(documents);
  }

  // Inquiry operations
  async getInquiry(id: number): Promise<Inquiry | undefined> {
    const [inquiry] = await this.db.select().from(inquiries).where(eq(inquiries.id, id));
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
      .where(eq(inquiries.id, id))
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
          primaryColor: updateData.primaryColor || '#2B5A94',
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
    // isActive defaults to true but legacy rows may be NULL — treat NULL as active
    // so pre-existing content keeps rendering. Order by the admin-controlled
    // `order` column so reordering in the editor affects the public site.
    return await this.db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.type, type),
          or(eq(contents.isActive, true), isNull(contents.isActive)),
        )
      )
      .orderBy(asc(contents.order), asc(contents.id));
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
    const deleted = await this.db.delete(contents).where(eq(contents.id, id)).returning({ id: contents.id });
    return deleted.length > 0;
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
    // Join users so the client can show "tommyshorez signed in" instead of
    // "Someone signed in". Users may be deleted; LEFT JOIN keeps the row.
    const rows = await this.client<(Activity & { userName: string | null; userRole: string | null })[]>`
      SELECT
        a.id,
        a.user_id   AS "userId",
        a.action,
        a.details,
        a.entity_type AS "entityType",
        a.entity_id AS "entityId",
        a.created_at AS "createdAt",
        COALESCE(u.name, u.username) AS "userName",
        u.role      AS "userRole"
      FROM activities a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;
    return rows as unknown as Activity[];
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

  // Message operations
  async getMessagesByClientId(clientId: number): Promise<Message[]> {
    return await this.db.select().from(messages).where(eq(messages.clientId, clientId)).orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await this.db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessagesReadForClient(clientId: number, readerUserId: number): Promise<void> {
    // Mark the simple is_read flag in a single UPDATE.
    await this.db.update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.clientId, clientId),
        ne(messages.senderUserId, readerUserId),
        eq(messages.isRead, false),
      ));

    // And record per-reader reads in one bulk upsert.
    await this.client`
      INSERT INTO message_reads (message_id, user_id)
      SELECT m.id, ${readerUserId}
      FROM messages m
      WHERE m.client_id = ${clientId}
        AND m.sender_user_id <> ${readerUserId}
      ON CONFLICT DO NOTHING
    `;
  }

  async getUnreadCountForAdmin(adminUserId: number): Promise<number> {
    // Count messages not sent by this admin that have no matching
    // message_reads row for them. Single query, no in-memory filtering.
    const result = await this.client`
      SELECT COUNT(*)::int AS count
      FROM messages m
      WHERE m.sender_user_id <> ${adminUserId}
        AND NOT EXISTS (
          SELECT 1 FROM message_reads r
          WHERE r.message_id = m.id AND r.user_id = ${adminUserId}
        )
    `;
    return (result[0] as { count: number })?.count ?? 0;
  }

  async getAllClientsWithMessageCounts(adminUserId?: number): Promise<{ clientId: number; unreadCount: number; latestMessage: Message | null }[]> {
    const allMessages = await this.db.select().from(messages).orderBy(desc(messages.createdAt));
    const reads = adminUserId
      ? await this.db.select().from(messageReads).where(eq(messageReads.userId, adminUserId))
      : [];
    const readIds = new Set(reads.map(r => r.messageId));

    const byClient = new Map<number, { unreadCount: number; latestMessage: Message | null }>();
    for (const msg of allMessages) {
      if (!byClient.has(msg.clientId)) {
        byClient.set(msg.clientId, { unreadCount: 0, latestMessage: msg });
      }
      // Count unread: messages not sent by this admin and not in their reads
      const isFromClient = adminUserId ? msg.senderUserId !== adminUserId : !msg.isRead;
      if (isFromClient && !readIds.has(msg.id)) {
        byClient.get(msg.clientId)!.unreadCount++;
      }
    }
    return Array.from(byClient.entries()).map(([clientId, data]) => ({ clientId, ...data }));
  }

  // Milestone operations
  async getMilestonesByProjectId(projectId: number): Promise<Milestone[]> {
    return await this.db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.createdAt));
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await this.db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async updateMilestone(id: number, milestoneUpdate: Partial<Milestone>): Promise<Milestone | undefined> {
    const [updated] = await this.db.update(milestones).set({ ...milestoneUpdate, updatedAt: new Date() }).where(eq(milestones.id, id)).returning();
    return updated;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    // Blow away engagement first so the FK cascades aren't relied on in
    // environments where the constraint wasn't declared with ON DELETE CASCADE.
    await this.db.delete(postLikes).where(eq(postLikes.milestoneId, id));
    await this.db.delete(postComments).where(eq(postComments.milestoneId, id));
    const deleted = await this.db.delete(milestones).where(eq(milestones.id, id)).returning({ id: milestones.id });
    return deleted.length > 0;
  }

  // Post engagement
  async getPostEngagement(milestoneIds: number[], viewerUserId: number) {
    const result = new Map<number, { likeCount: number; commentCount: number; likedByMe: boolean }>();
    if (milestoneIds.length === 0) return result;
    // Seed defaults so every requested id is present in the output.
    for (const id of milestoneIds) result.set(id, { likeCount: 0, commentCount: 0, likedByMe: false });

    const likeRows = await this.client<{ milestone_id: number; cnt: number; liked_by_me: boolean }[]>`
      SELECT
        milestone_id,
        COUNT(*)::int AS cnt,
        BOOL_OR(user_id = ${viewerUserId}) AS liked_by_me
      FROM post_likes
      WHERE milestone_id = ANY(${milestoneIds as unknown as number[]})
      GROUP BY milestone_id
    `;
    for (const row of likeRows) {
      const bucket = result.get(row.milestone_id)!;
      bucket.likeCount = row.cnt;
      bucket.likedByMe = row.liked_by_me;
    }

    const commentRows = await this.client<{ milestone_id: number; cnt: number }[]>`
      SELECT milestone_id, COUNT(*)::int AS cnt
      FROM post_comments
      WHERE milestone_id = ANY(${milestoneIds as unknown as number[]})
      GROUP BY milestone_id
    `;
    for (const row of commentRows) {
      const bucket = result.get(row.milestone_id)!;
      bucket.commentCount = row.cnt;
    }

    return result;
  }

  async togglePostLike(milestoneId: number, userId: number) {
    const existing = await this.db.select().from(postLikes).where(
      and(eq(postLikes.milestoneId, milestoneId), eq(postLikes.userId, userId)),
    );
    if (existing.length > 0) {
      await this.db.delete(postLikes).where(
        and(eq(postLikes.milestoneId, milestoneId), eq(postLikes.userId, userId)),
      );
    } else {
      await this.db.insert(postLikes).values({ milestoneId, userId });
    }
    const [{ count }] = await this.client<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM post_likes WHERE milestone_id = ${milestoneId}
    `;
    return { liked: existing.length === 0, likeCount: count };
  }

  async getPostComments(milestoneId: number) {
    // Join with users so we don't N+1 lookup author names.
    const rows = await this.client<(PostComment & { author_name: string; author_role: string })[]>`
      SELECT
        c.id, c.milestone_id AS "milestoneId", c.user_id AS "userId",
        c.content, c.created_at AS "createdAt", c.updated_at AS "updatedAt",
        u.name AS author_name, u.role AS author_role
      FROM post_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.milestone_id = ${milestoneId}
      ORDER BY c.created_at ASC
    `;
    return rows.map(r => ({
      id: r.id,
      milestoneId: r.milestoneId,
      userId: r.userId,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      authorName: r.author_name,
      authorRole: r.author_role,
    }));
  }

  async createPostComment(comment: InsertPostComment): Promise<PostComment> {
    const [created] = await this.db.insert(postComments).values(comment).returning();
    return created;
  }

  async deletePostComment(id: number): Promise<PostComment | undefined> {
    const [deleted] = await this.db.delete(postComments).where(eq(postComments.id, id)).returning();
    return deleted;
  }

  // Client note operations
  async getClientNotesByClientId(clientId: number): Promise<ClientNote[]> {
    return await this.db.select().from(clientNotes).where(eq(clientNotes.clientId, clientId)).orderBy(desc(clientNotes.isPinned), desc(clientNotes.createdAt));
  }

  async createClientNote(note: InsertClientNote): Promise<ClientNote> {
    const [newNote] = await this.db.insert(clientNotes).values(note).returning();
    return newNote;
  }

  async updateClientNote(id: number, noteUpdate: Partial<ClientNote>): Promise<ClientNote | undefined> {
    const [updated] = await this.db.update(clientNotes).set({ ...noteUpdate, updatedAt: new Date() }).where(eq(clientNotes.id, id)).returning();
    return updated;
  }

  async deleteClientNote(id: number): Promise<boolean> {
    const deleted = await this.db.delete(clientNotes).where(eq(clientNotes.id, id)).returning({ id: clientNotes.id });
    return deleted.length > 0;
  }

  async getAllSiteStrings(): Promise<SiteString[]> {
    return await this.db.select().from(siteStrings);
  }

  async getProjectTasks(projectId: number): Promise<ProjectTask[]> {
    // Open items first (by order), then completed items (newest-completed first).
    const rows = await this.client<ProjectTask[]>`
      SELECT
        id, project_id AS "projectId", title, description,
        completed_at AS "completedAt", completed_by AS "completedBy",
        "order", created_by AS "createdBy",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM project_tasks
      WHERE project_id = ${projectId}
      ORDER BY
        (completed_at IS NOT NULL) ASC,
        "order" ASC,
        id ASC
    `;
    return rows;
  }

  async getProjectTasksByClientId(clientId: number): Promise<ProjectTask[]> {
    const rows = await this.client<ProjectTask[]>`
      SELECT
        t.id, t.project_id AS "projectId", t.title, t.description,
        t.completed_at AS "completedAt", t.completed_by AS "completedBy",
        t."order", t.created_by AS "createdBy",
        t.created_at AS "createdAt", t.updated_at AS "updatedAt"
      FROM project_tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.client_id = ${clientId}
      ORDER BY
        (t.completed_at IS NOT NULL) ASC,
        t."order" ASC,
        t.id ASC
    `;
    return rows;
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [created] = await this.db.insert(projectTasks).values(task).returning();
    return created;
  }

  async updateProjectTask(id: number, taskUpdate: Partial<ProjectTask>): Promise<ProjectTask | undefined> {
    const [updated] = await this.db
      .update(projectTasks)
      .set({ ...taskUpdate, updatedAt: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();
    return updated;
  }

  async deleteProjectTask(id: number): Promise<boolean> {
    const deleted = await this.db.delete(projectTasks).where(eq(projectTasks.id, id)).returning({ id: projectTasks.id });
    return deleted.length > 0;
  }

  async upsertSiteStrings(entries: { key: string; value: string }[]): Promise<void> {
    if (entries.length === 0) return;
    // Postgres ON CONFLICT upsert per row. One round-trip per key is fine
    // for this low-volume admin action; keeps the SQL readable.
    for (const { key, value } of entries) {
      await this.client`
        INSERT INTO site_strings (key, value, updated_at)
        VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }
  }

  async createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [row] = await this.db
      .insert(passwordResetTokens)
      .values({ userId, tokenHash, expiresAt })
      .returning();
    return row;
  }

  async findValidPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | undefined> {
    // Valid = not used and not expired.
    const now = new Date();
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    if (!row) return undefined;
    if (row.usedAt) return undefined;
    if (new Date(row.expiresAt) < now) return undefined;
    return row;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  /**
   * Hard-delete a user, cleaning up every FK that would otherwise block the
   * row delete. Refuses if the user is still the primary owner of any client
   * — the admin must reassign or delete the client first.
   */
  async deleteUser(id: number): Promise<{ ok: true } | { ok: false; reason: "primary_owner"; clientIds: number[] }> {
    // Primary-owner check first — don't silently orphan a client record.
    const ownedClients = await this.db.select().from(clients).where(eq(clients.userId, id));
    if (ownedClients.length > 0) {
      return { ok: false, reason: "primary_owner", clientIds: ownedClients.map(c => c.id) };
    }

    // Preserve audit trails by NULL'ing user references where the column
    // allows it (authors of past posts, notes, docs, activities). Hard-delete
    // engagement rows and ephemeral records.
    await this.client`UPDATE activities    SET user_id    = NULL WHERE user_id    = ${id}`;
    await this.client`UPDATE client_notes  SET created_by = NULL WHERE created_by = ${id}`;
    await this.client`UPDATE milestones    SET created_by = NULL WHERE created_by = ${id}`;
    await this.client`UPDATE documents     SET uploaded_by = NULL WHERE uploaded_by = ${id}`;
    await this.client`UPDATE project_tasks SET created_by  = NULL WHERE created_by  = ${id}`;
    await this.client`UPDATE project_tasks SET completed_by = NULL WHERE completed_by = ${id}`;

    // These columns are NOT NULL in the schema, so we hard-delete those rows.
    await this.db.delete(messages).where(eq(messages.senderUserId, id));
    await this.db.delete(messageReads).where(eq(messageReads.userId, id));
    await this.db.delete(postLikes).where(eq(postLikes.userId, id));
    await this.db.delete(postComments).where(eq(postComments.userId, id));
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));

    // Finally the user row itself.
    await this.db.delete(users).where(eq(users.id, id));
    return { ok: true };
  }

  async getAllCustomPages(): Promise<CustomPage[]> {
    return await this.db.select().from(customPages).orderBy(asc(customPages.createdAt));
  }

  async getCustomPageBySlug(slug: string): Promise<CustomPage | undefined> {
    const [page] = await this.db.select().from(customPages).where(eq(customPages.slug, slug));
    return page;
  }

  async createCustomPage(page: InsertCustomPage): Promise<CustomPage> {
    const [newPage] = await this.db.insert(customPages).values(page).returning();
    return newPage;
  }

  async updateCustomPage(id: number, pageUpdate: Partial<CustomPage>): Promise<CustomPage | undefined> {
    const [updated] = await this.db.update(customPages).set({ ...pageUpdate, updatedAt: new Date() }).where(eq(customPages.id, id)).returning();
    return updated;
  }

  async deleteCustomPage(id: number): Promise<boolean> {
    const deleted = await this.db.delete(customPages).where(eq(customPages.id, id)).returning({ id: customPages.id });
    return deleted.length > 0;
  }

  // ─── Tickets ────────────────────────────────────────────────────────────
  async getTicket(id: number): Promise<Ticket | undefined> {
    const [t] = await this.db.select().from(tickets).where(eq(tickets.id, id));
    return t;
  }
  async getTicketsByClient(clientId: number): Promise<Ticket[]> {
    return await this.db.select().from(tickets).where(eq(tickets.clientId, clientId)).orderBy(desc(tickets.createdAt));
  }
  async getAllTickets(): Promise<Ticket[]> {
    return await this.db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }
  async createTicket(t: InsertTicket): Promise<Ticket> {
    const [row] = await this.db.insert(tickets).values(t).returning();
    return row;
  }
  async updateTicket(id: number, patch: Partial<Ticket>): Promise<Ticket | undefined> {
    const [row] = await this.db.update(tickets).set({ ...patch, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    return row;
  }
  async deleteTicket(id: number): Promise<boolean> {
    await this.db.delete(attachments).where(eq(attachments.ticketId, id));
    await this.db.delete(ticketComments).where(eq(ticketComments.ticketId, id));
    const deleted = await this.db.delete(tickets).where(eq(tickets.id, id)).returning({ id: tickets.id });
    return deleted.length > 0;
  }
  async getTicketComments(ticketId: number): Promise<(TicketComment & { authorName: string; authorRole: string })[]> {
    const rows = await this.client`
      SELECT c.id, c.ticket_id, c.user_id, c.content, c.created_at,
             u.name AS author_name, u.role AS author_role
        FROM ticket_comments c
        LEFT JOIN users u ON u.id = c.user_id
       WHERE c.ticket_id = ${ticketId}
       ORDER BY c.created_at ASC`;
    return rows.map((r: any) => ({
      id: r.id,
      ticketId: r.ticket_id,
      userId: r.user_id,
      content: r.content,
      createdAt: r.created_at,
      authorName: r.author_name || "",
      authorRole: r.author_role || "",
    }));
  }
  async createTicketComment(c: InsertTicketComment): Promise<TicketComment> {
    const [row] = await this.db.insert(ticketComments).values(c).returning();
    return row;
  }

  // ─── Appointments ───────────────────────────────────────────────────────
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [a] = await this.db.select().from(appointments).where(eq(appointments.id, id));
    return a;
  }
  async getAppointmentsByClient(clientId: number): Promise<Appointment[]> {
    return await this.db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(asc(appointments.scheduledStart));
  }
  async getAllAppointments(): Promise<Appointment[]> {
    return await this.db.select().from(appointments).orderBy(asc(appointments.scheduledStart));
  }
  async createAppointment(a: InsertAppointment): Promise<Appointment> {
    const [row] = await this.db.insert(appointments).values(a).returning();
    return row;
  }
  async updateAppointment(id: number, patch: Partial<Appointment>): Promise<Appointment | undefined> {
    const [row] = await this.db.update(appointments).set({ ...patch, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    return row;
  }
  async deleteAppointment(id: number): Promise<boolean> {
    const deleted = await this.db.delete(appointments).where(eq(appointments.id, id)).returning({ id: appointments.id });
    return deleted.length > 0;
  }

  // ─── Assets ─────────────────────────────────────────────────────────────
  async getAsset(id: number): Promise<Asset | undefined> {
    const [a] = await this.db.select().from(assets).where(eq(assets.id, id));
    return a;
  }
  async getAssetsByClient(clientId: number): Promise<Asset[]> {
    return await this.db.select().from(assets).where(eq(assets.clientId, clientId)).orderBy(asc(assets.category), asc(assets.name));
  }
  async createAsset(a: InsertAsset): Promise<Asset> {
    const [row] = await this.db.insert(assets).values(a).returning();
    return row;
  }
  async updateAsset(id: number, patch: Partial<Asset>): Promise<Asset | undefined> {
    const [row] = await this.db.update(assets).set({ ...patch, updatedAt: new Date() }).where(eq(assets.id, id)).returning();
    return row;
  }
  async deleteAsset(id: number): Promise<boolean> {
    const deleted = await this.db.delete(assets).where(eq(assets.id, id)).returning({ id: assets.id });
    return deleted.length > 0;
  }

  // ─── Service plans + per-client assignments ─────────────────────────────
  async getAllServicePlans(activeOnly = false): Promise<ServicePlan[]> {
    if (activeOnly) {
      return await this.db.select().from(servicePlans).where(eq(servicePlans.isActive, true)).orderBy(asc(servicePlans.monthlyPrice));
    }
    return await this.db.select().from(servicePlans).orderBy(asc(servicePlans.monthlyPrice));
  }
  async getServicePlan(id: number): Promise<ServicePlan | undefined> {
    const [p] = await this.db.select().from(servicePlans).where(eq(servicePlans.id, id));
    return p;
  }
  async createServicePlan(p: InsertServicePlan): Promise<ServicePlan> {
    const [row] = await this.db.insert(servicePlans).values(p).returning();
    return row;
  }
  async updateServicePlan(id: number, patch: Partial<ServicePlan>): Promise<ServicePlan | undefined> {
    const [row] = await this.db.update(servicePlans).set({ ...patch, updatedAt: new Date() }).where(eq(servicePlans.id, id)).returning();
    return row;
  }
  async deleteServicePlan(id: number): Promise<boolean> {
    // Null out references on client_plans so cancellations survive the plan deletion.
    await this.client`DELETE FROM client_plans WHERE plan_id = ${id}`;
    const deleted = await this.db.delete(servicePlans).where(eq(servicePlans.id, id)).returning({ id: servicePlans.id });
    return deleted.length > 0;
  }
  async getClientPlan(clientId: number): Promise<(ClientPlan & { plan: ServicePlan }) | undefined> {
    const rows = await this.client`
      SELECT cp.id, cp.client_id, cp.plan_id, cp.status, cp.started_at, cp.cancelled_at, cp.created_at, cp.updated_at,
             sp.name AS plan_name, sp.description AS plan_description, sp.monthly_price, sp.included_hours,
             sp.features, sp.is_active, sp.created_at AS plan_created_at, sp.updated_at AS plan_updated_at
        FROM client_plans cp
        JOIN service_plans sp ON sp.id = cp.plan_id
       WHERE cp.client_id = ${clientId} AND cp.status = 'active'
       ORDER BY cp.started_at DESC
       LIMIT 1`;
    if (rows.length === 0) return undefined;
    const r: any = rows[0];
    return {
      id: r.id,
      clientId: r.client_id,
      planId: r.plan_id,
      status: r.status,
      startedAt: r.started_at,
      cancelledAt: r.cancelled_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      plan: {
        id: r.plan_id,
        name: r.plan_name,
        description: r.plan_description,
        monthlyPrice: r.monthly_price,
        includedHours: r.included_hours,
        features: r.features,
        isActive: r.is_active,
        createdAt: r.plan_created_at,
        updatedAt: r.plan_updated_at,
      },
    };
  }
  async assignClientPlan(clientId: number, planId: number): Promise<ClientPlan> {
    // Cancel any active plan first — one active plan per client.
    await this.client`UPDATE client_plans SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE client_id = ${clientId} AND status = 'active'`;
    const [row] = await this.db.insert(clientPlans).values({ clientId, planId, status: "active" }).returning();
    return row;
  }
  async cancelClientPlan(id: number): Promise<ClientPlan | undefined> {
    const [row] = await this.db.update(clientPlans)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(clientPlans.id, id)).returning();
    return row;
  }

  // ─── Attachments ────────────────────────────────────────────────────────
  async createAttachment(a: InsertAttachment): Promise<Attachment> {
    const [row] = await this.db.insert(attachments).values(a).returning();
    return row;
  }
  async getAttachmentsByMessage(messageId: number): Promise<Attachment[]> {
    return await this.db.select().from(attachments).where(eq(attachments.messageId, messageId));
  }
  async getAttachmentsByTicket(ticketId: number): Promise<Attachment[]> {
    return await this.db.select().from(attachments).where(eq(attachments.ticketId, ticketId));
  }
  async deleteAttachment(id: number): Promise<boolean> {
    const deleted = await this.db.delete(attachments).where(eq(attachments.id, id)).returning({ id: attachments.id });
    return deleted.length > 0;
  }

  // ─── Public case studies (flagged milestones) ───────────────────────────
  async getPublicMilestones(limit = 50): Promise<Array<Milestone & { projectName: string; clientName: string }>> {
    const rows = await this.client`
      SELECT m.id, m.project_id, m.title, m.notes, m.image_paths, m.created_by,
             m.is_public, m.public_summary, m.created_at, m.updated_at,
             p.name AS project_name, c.name AS client_name
        FROM milestones m
        JOIN projects p ON p.id = m.project_id
        JOIN clients c  ON c.id = p.client_id
       WHERE m.is_public = TRUE
       ORDER BY m.created_at DESC
       LIMIT ${limit}`;
    return rows.map((r: any) => ({
      id: r.id,
      projectId: r.project_id,
      title: r.title,
      notes: r.notes,
      imagePaths: r.image_paths,
      createdBy: r.created_by,
      isPublic: r.is_public,
      publicSummary: r.public_summary,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      projectName: r.project_name,
      clientName: r.client_name,
    }));
  }
}

// Use DatabaseStorage instead of MemStorage to connect to the PostgreSQL database
export const storage = new DatabaseStorage();
