import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  department: text("department").notNull(),
  role: text("role").notNull(), // 'admin', 'department_head', 'safety_officer', 'maintenance', 'employee'
});

export const permits = pgTable("permits", {
  id: serial("id").primaryKey(),
  permitId: text("permit_id").notNull().unique(), // e.g., CS-2024-001
  type: text("type").notNull(), // 'confined_space', 'hot_work', 'electrical', 'chemical', 'height'
  location: text("location").notNull(),
  workLocationId: integer("work_location_id").references(() => workLocations.id),
  mapPositionX: real("map_position_x"),
  mapPositionY: real("map_position_y"),
  description: text("description").notNull(),
  requestorId: integer("requestor_id").references(() => users.id),
  requestorName: text("requestor_name").notNull(),
  department: text("department").notNull(),
  contactNumber: text("contact_number").notNull(),
  emergencyContact: text("emergency_contact").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'active', 'completed', 'expired', 'rejected'
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  safetyOfficer: text("safety_officer"),
  departmentHead: text("department_head"), // Required approver
  maintenanceApprover: text("maintenance_approver"), // Required approver
  identifiedHazards: text("identified_hazards"),
  additionalComments: text("additional_comments"),
  
  // TRBS Hazard Assessment - replaces old safety checklist and atmospheric monitoring
  selectedHazards: text("selected_hazards").array(), // Array of "categoryId-hazardIndex" strings
  hazardNotes: text("hazard_notes"), // JSON string with notes per hazard
  completedMeasures: text("completed_measures").array(), // Array of completed protective measure IDs
  
  // Approval tracking - Required approvals
  departmentHeadApproval: boolean("department_head_approval").default(false),
  departmentHeadApprovalDate: timestamp("department_head_approval_date"),
  maintenanceApproval: boolean("maintenance_approval").default(false),
  maintenanceApprovalDate: timestamp("maintenance_approval_date"),
  // Optional additional approvals
  safetyOfficerApproval: boolean("safety_officer_approval").default(false),
  safetyOfficerApprovalDate: timestamp("safety_officer_approval_date"),
  
  // Performer information - filled after approval
  performerName: text("performer_name"),
  performerSignature: text("performer_signature"),
  workStartedAt: timestamp("work_started_at"),
  workCompletedAt: timestamp("work_completed_at"),
  
  // Safety assessment fields - AI recommendations
  immediateActions: text("immediate_actions"), // JSON array of immediate actions needed
  beforeWorkStarts: text("before_work_starts"), // JSON array of actions before work begins
  complianceNotes: text("compliance_notes"), // Compliance and regulatory notes
  
  // Risk assessment fields
  overallRisk: text("overall_risk"), // low, medium, high, critical
  
  // Workflow tracking fields
  statusHistory: text("status_history"), // JSON array of status changes
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  activatedAt: timestamp("activated_at"),
  completedAt: timestamp("completed_at"),
  submittedBy: integer("submitted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'info', 'warning', 'success', 'error'
  relatedPermitId: integer("related_permit_id").references(() => permits.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  template: jsonb("template").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  permitId: integer("permit_id").references(() => permits.id).notNull(),
  suggestionType: text("suggestion_type").notNull(), // 'improvement', 'safety', 'compliance'
  fieldName: text("field_name"), // Which permit field this suggestion applies to
  originalValue: text("original_value"),
  suggestedValue: text("suggested_value").notNull(),
  reasoning: text("reasoning").notNull(),
  priority: text("priority").notNull(), // 'low', 'medium', 'high', 'critical'
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'rejected'
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webhookConfig = pgTable("webhook_config", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestStatus: text("last_test_status"), // 'success', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workLocations = pgTable("work_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  building: text("building"),
  area: text("area"),
  mapPositionX: integer("map_position_x"),
  mapPositionY: integer("map_position_y"),
  mapBackgroundId: integer("map_background_id").references(() => mapBackgrounds.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const permitAttachments = pgTable("permit_attachments", {
  id: serial("id").primaryKey(),
  permitId: integer("permit_id").references(() => permits.id).notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(), // 'image', 'document', 'other'
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  filePath: text("file_path").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mapBackgrounds = pgTable("map_backgrounds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imagePath: text("image_path").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  headerIcon: text("header_icon"), // Base64 encoded image or file path
  applicationTitle: text("application_title").notNull().default("Arbeitserlaubnis"),
  defaultMapView: text("default_map_view"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPermitSchema = createInsertSchema(permits).omit({
  id: true,
  permitId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string(),
  endDate: z.string(),
  immediateActions: z.string().optional(),
  beforeWorkStarts: z.string().optional(),
  complianceNotes: z.string().optional(),
  overallRisk: z.string().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  mapPosition: z.string().optional(),
});

// Schema for draft permits with optional fields
export const insertDraftPermitSchema = createInsertSchema(permits).omit({
  id: true,
  permitId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  type: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  requestorName: z.string().optional(),
  department: z.string().optional(),
  contactNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  riskLevel: z.string().optional(),
  safetyOfficer: z.string().optional(),
  departmentHead: z.string().optional(),
  maintenanceApprover: z.string().optional(),
  identifiedHazards: z.string().optional(),
  additionalComments: z.string().optional(),
  selectedHazards: z.array(z.string()).optional(),
  hazardNotes: z.string().optional(),
  completedMeasures: z.array(z.string()).optional(),
  immediateActions: z.string().optional(),
  beforeWorkStarts: z.string().optional(),
  complianceNotes: z.string().optional(),
  overallRisk: z.string().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  mapPosition: z.string().optional(),
  status: z.string().default("draft"),
}).partial();

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiSuggestionSchema = createInsertSchema(aiSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertWebhookConfigSchema = createInsertSchema(webhookConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkLocationSchema = createInsertSchema(workLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMapBackgroundSchema = createInsertSchema(mapBackgrounds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermitAttachmentSchema = createInsertSchema(permitAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPermit = z.infer<typeof insertPermitSchema>;
export type Permit = typeof permits.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertAiSuggestion = z.infer<typeof insertAiSuggestionSchema>;
export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type InsertWebhookConfig = z.infer<typeof insertWebhookConfigSchema>;
export type WebhookConfig = typeof webhookConfig.$inferSelect;
export type InsertWorkLocation = z.infer<typeof insertWorkLocationSchema>;
export type WorkLocation = typeof workLocations.$inferSelect;
export type InsertPermitAttachment = z.infer<typeof insertPermitAttachmentSchema>;
export type PermitAttachment = typeof permitAttachments.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertMapBackground = z.infer<typeof insertMapBackgroundSchema>;
export type MapBackground = typeof mapBackgrounds.$inferSelect;
