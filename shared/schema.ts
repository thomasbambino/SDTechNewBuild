import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Shared password rules — enforced on every form that sets a password.
export const PASSWORD_MIN_LENGTH = 8;
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);

// User-related schemas
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("client"), // admin, internal, client, pending
  status: text("status").notNull().default("active"), // active, disabled
  // For role="client": which client this user belongs to. Multiple users can
  // share a clientId (owner + team members). clients.userId still identifies
  // the designated "primary" owner.
  clientId: integer("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Client-related schemas
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  freshbooksId: text("freshbooks_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Project-related schemas
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  status: text("status").default("planning"), // planning, in_progress, on_hold, completed
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  budget: doublePrecision("budget"),
  progress: integer("progress").default(0),
  freshbooksId: text("freshbooks_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Frontend sends ISO strings (or null) for dates; coerce so drizzle
    // doesn't choke when inserting.
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  });

// Invoice-related schemas
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").default("pending"), // pending, paid, overdue
  dueDate: timestamp("due_date"),
  description: text("description"),
  freshbooksId: text("freshbooks_id"),
  freshbooksUrl: text("freshbooks_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Document-related schemas
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type"),
  size: integer("size"),
  projectId: integer("project_id").references(() => projects.id),
  clientId: integer("client_id").references(() => clients.id),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Inquiry-related schemas
export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInquirySchema = createInsertSchema(inquiries)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Branding and Theme settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").default("SD Tech Pros"),
  logoPath: text("logo_path"),
  primaryColor: text("primary_color").default("#2B5A94"),
  theme: text("theme").default("light"), // light, dark
  radius: doublePrecision("radius").default(0.5),
  siteTitle: text("site_title").default("SD Tech Pros Client Portal"),
  siteDescription: text("site_description"),
  favicon: text("favicon"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings)
  .omit({ id: true, updatedAt: true });

// Content management for public website
export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // hero, service, about, testimonial, contact
  title: text("title"),
  subtitle: text("subtitle"),
  content: text("content"),
  imagePath: text("image_path"),
  // Optional "before" photo — used today by Recent Work (type=job) to drive
  // the before/after toggle on the public card. Null-safe for other content
  // types that don't need a second image.
  imagePathBefore: text("image_path_before"),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentSchema = createInsertSchema(contents)
  .omit({ id: true, updatedAt: true });

// Activity log
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  entityType: text("entity_type"), // project, client, invoice, etc.
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities)
  .omit({ id: true, createdAt: true });

// API credentials for Freshbooks
export const apiConnections = pgTable("api_connections", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // freshbooks, google_analytics, etc.
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  accountId: text("account_id"),
  businessId: text("business_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApiConnectionSchema = createInsertSchema(apiConnections)
  .omit({ id: true, updatedAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;

export type Content = typeof contents.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type ApiConnection = typeof apiConnections.$inferSelect;
export type InsertApiConnection = z.infer<typeof insertApiConnectionSchema>;

// Messages between clients and admin
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  senderUserId: integer("sender_user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, createdAt: true });

// Tracks which admin users have read which messages
export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  readAt: timestamp("read_at").defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Project milestones / progress updates
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  imagePaths: text("image_paths"), // JSON array string
  createdBy: integer("created_by").references(() => users.id),
  // Flip to true to surface this update on the public /case-studies page.
  // Admin-only toggle; off by default so nothing leaks.
  isPublic: boolean("is_public").default(false),
  publicSummary: text("public_summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMilestoneSchema = createInsertSchema(milestones)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

// Likes on timeline posts. One row per (post, user).
export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").references(() => milestones.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PostLike = typeof postLikes.$inferSelect;

// Comments on timeline posts.
export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").references(() => milestones.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPostCommentSchema = createInsertSchema(postComments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;

// Client-visible notes created by admin
export const clientNotes = pgTable("client_notes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  title: text("title").notNull(),
  // Optional free-text body. Kept optional so a note can be just a title + structured fields.
  content: text("content").notNull().default(""),
  // One of: "general", "credentials", "network", "access". Drives rendering.
  category: text("category").notNull().default("general"),
  // JSON array of { label: string, value: string, isSecret: boolean }
  // for category === "credentials" or "network" style notes.
  fields: text("fields"),
  isPinned: boolean("is_pinned").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientNoteSchema = createInsertSchema(clientNotes)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ClientNote = typeof clientNotes.$inferSelect;
export type InsertClientNote = z.infer<typeof insertClientNoteSchema>;

// Single-use password reset tokens. Admin can trigger one, or a user
// can request one from the Forgot-Password page. Short-lived.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  // Hashed before storage so a DB dump can't be used to reset accounts.
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Per-project task list. Admins add/complete/reorder; clients see
// the list on their dashboard and project view.
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // null = open, set = done. Timestamp lets us show "completed 2 days ago".
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  // Admin-controlled display order. Integer — gaps are fine.
  order: integer("order").notNull().default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

// Freeform key/value store for editable UI strings (eyebrows, CTAs,
// nav labels, etc.). One row per key; the code registers defaults that
// win when no row exists, so the UI never shows blank text.
export const siteStrings = pgTable("site_strings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteStringSchema = createInsertSchema(siteStrings)
  .omit({ id: true, updatedAt: true });

export type SiteString = typeof siteStrings.$inferSelect;
export type InsertSiteString = z.infer<typeof insertSiteStringSchema>;

// Custom hidden pages (e.g. privacy policy, terms)
export const customPages = pgTable("custom_pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomPageSchema = createInsertSchema(customPages)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type CustomPage = typeof customPages.$inferSelect;
export type InsertCustomPage = z.infer<typeof insertCustomPageSchema>;

// ─── Service tickets ────────────────────────────────────────────────────────
// Structured service requests. Clients file them; admins triage, schedule, and
// resolve. Separate from free-form messages: tickets have state, priority,
// and can be converted into a project once scoped.
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  // Set after admin converts the ticket into real work.
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  // support | install | outage | question | other
  category: text("category").notNull().default("support"),
  // low | normal | high | urgent
  priority: text("priority").notNull().default("normal"),
  // new | acknowledged | in_progress | scheduled | resolved | closed
  status: text("status").notNull().default("new"),
  // Free-text (e.g. "Oceanside office, server closet"). Clients fill it in.
  location: text("location"),
  createdBy: integer("created_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTicketSchema = createInsertSchema(tickets)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Thread of back-and-forth on a single ticket. Admin + client both post.
export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketCommentSchema = createInsertSchema(ticketComments)
  .omit({ id: true, createdAt: true });

export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;

// ─── Appointments / on-site visit scheduling ────────────────────────────────
// Either a client-requested slot ("come look at the NVR Tuesday") or an
// admin-booked visit. Linked to a project or ticket when applicable.
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  ticketId: integer("ticket_id").references(() => tickets.id),
  title: text("title").notNull(),
  notes: text("notes"),
  location: text("location"),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  // requested | confirmed | completed | cancelled
  status: text("status").notNull().default("requested"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
  });

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// ─── Equipment inventory per client ─────────────────────────────────────────
// What switches/cameras/APs/NVRs/servers etc. are installed at a client site.
// Lets both sides track warranty and replacement cycles.
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  // switch | router | ap | camera | nvr | firewall | server | ups | other
  category: text("category").notNull().default("other"),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  firmware: text("firmware"),
  location: text("location"),
  installedAt: timestamp("installed_at"),
  warrantyExpiresAt: timestamp("warranty_expires_at"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    installedAt: z.coerce.date().nullable().optional(),
    warrantyExpiresAt: z.coerce.date().nullable().optional(),
  });

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

// ─── Managed service plans ──────────────────────────────────────────────────
// Reusable plan definitions (e.g. "Essentials", "Business", "Enterprise") +
// per-client assignment. No billing happens here — FreshBooks handles the
// invoicing — this is the entitlement + display layer.
export const servicePlans = pgTable("service_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: doublePrecision("monthly_price").notNull().default(0),
  includedHours: doublePrecision("included_hours"),
  // JSON array of feature strings for the marketing-style bullet list.
  features: text("features"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServicePlanSchema = createInsertSchema(servicePlans)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ServicePlan = typeof servicePlans.$inferSelect;
export type InsertServicePlan = z.infer<typeof insertServicePlanSchema>;

export const clientPlans = pgTable("client_plans", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  planId: integer("plan_id").references(() => servicePlans.id).notNull(),
  // active | paused | cancelled
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientPlanSchema = createInsertSchema(clientPlans)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ClientPlan = typeof clientPlans.$inferSelect;
export type InsertClientPlan = z.infer<typeof insertClientPlanSchema>;

// ─── Message / ticket attachments ───────────────────────────────────────────
// Files attached to a message or a ticket. One row per file; the parent is
// identified by (messageId, ticketId) with exactly one of them non-null.
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id),
  ticketId: integer("ticket_id").references(() => tickets.id),
  ticketCommentId: integer("ticket_comment_id").references(() => ticketComments.id),
  name: text("name").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAttachmentSchema = createInsertSchema(attachments)
  .omit({ id: true, createdAt: true });

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
