import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
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
