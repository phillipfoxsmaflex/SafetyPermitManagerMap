import { users, permits, notifications, templates, aiSuggestions, webhookConfig, workLocations, permitAttachments, sessions, systemSettings, type User, type InsertUser, type Permit, type InsertPermit, type Notification, type InsertNotification, type Template, type InsertTemplate, type AiSuggestion, type InsertAiSuggestion, type WebhookConfig, type InsertWebhookConfig, type WorkLocation, type InsertWorkLocation, type PermitAttachment, type InsertPermitAttachment, type Session, type InsertSession, type SystemSettings, type InsertSystemSettings } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, lt } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFullName(fullName: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;

  // Permit operations
  getPermit(id: number): Promise<Permit | undefined>;
  getPermitByPermitId(permitId: string): Promise<Permit | undefined>;
  getAllPermits(): Promise<Permit[]>;
  getPermitsByStatus(status: string): Promise<Permit[]>;
  getPermitsByRequestor(requestorId: number): Promise<Permit[]>;
  createPermit(permit: InsertPermit): Promise<Permit>;
  updatePermit(id: number, updates: Partial<Permit>): Promise<Permit | undefined>;
  deletePermit(id: number): Promise<boolean>;
  getPermitStats(): Promise<{
    activePermits: number;
    pendingApproval: number;
    expiredToday: number;
    completed: number;
  }>;

  // Notification operations
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;

  // User role operations
  updateUserRole(userId: number, role: string): Promise<User | undefined>;
  updateUser(userId: number, updates: Partial<User>): Promise<User | undefined>;

  // Template operations
  getAllTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;

  // AI Suggestions operations
  getPermitSuggestions(permitId: number): Promise<AiSuggestion[]>;
  createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion>;
  updateSuggestionStatus(id: number, status: string): Promise<AiSuggestion | undefined>;
  applySuggestion(id: number): Promise<boolean>;
  applyAllSuggestions(permitId: number): Promise<number>;
  rejectAllSuggestions(permitId: number): Promise<number>;
  deleteAllSuggestions(permitId: number): Promise<number>;

  // Webhook configuration operations
  getAllWebhookConfigs(): Promise<WebhookConfig[]>;
  getActiveWebhookConfig(): Promise<WebhookConfig | undefined>;
  createWebhookConfig(config: InsertWebhookConfig): Promise<WebhookConfig>;
  updateWebhookConfig(id: number, updates: Partial<WebhookConfig>): Promise<WebhookConfig | undefined>;
  deleteWebhookConfig(id: number): Promise<boolean>;
  testWebhookConnection(id: number): Promise<boolean>;

  // Work Location operations
  getAllWorkLocations(): Promise<WorkLocation[]>;
  getActiveWorkLocations(): Promise<WorkLocation[]>;
  createWorkLocation(location: InsertWorkLocation): Promise<WorkLocation>;
  updateWorkLocation(id: number, updates: Partial<WorkLocation>): Promise<WorkLocation | undefined>;
  deleteWorkLocation(id: number): Promise<boolean>;

  // User role filtering operations
  getUsersByRole(role: string): Promise<User[]>;
  getDepartmentHeads(): Promise<User[]>;
  getSafetyOfficers(): Promise<User[]>;
  getMaintenanceApprovers(): Promise<User[]>;

  // Permit Attachment operations
  getPermitAttachments(permitId: number): Promise<PermitAttachment[]>;
  createPermitAttachment(attachment: InsertPermitAttachment): Promise<PermitAttachment>;
  deletePermitAttachment(id: number): Promise<boolean>;
  getAttachmentById(id: number): Promise<PermitAttachment | undefined>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSessionBySessionId(sessionId: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<boolean>;
  cleanupExpiredSessions(): Promise<void>;

  // AI Suggestions cleanup operations
  cleanupOldSuggestions(): Promise<number>;
  cleanupSuggestionsForUser(userId: number): Promise<number>;

  // Workflow operations
  updatePermitStatus(id: number, status: string, userId: number, comment?: string): Promise<Permit | undefined>;
  addStatusHistoryEntry(permitId: number, status: string, userId: number, comment?: string): Promise<void>;

  // System Settings operations
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings | undefined>;
  createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings>;
}

export class DatabaseStorage implements IStorage {
  private async generatePermitId(type: string): Promise<string> {
    const typeMap: Record<string, string> = {
      'confined_space': 'CS',
      'hot_work': 'HW',
      'electrical': 'EL',
      'chemical': 'CH',
      'height': 'HT'
    };

    const prefix = typeMap[type] || 'GN';
    const year = new Date().getFullYear();

    // Find the highest existing permit number for this type and year
    const existingPermits = await db.select()
      .from(permits)
      .where(like(permits.permitId, `${prefix}-${year}-%`));

    let maxNumber = 0;
    existingPermits.forEach(permit => {
      const match = permit.permitId.match(new RegExp(`${prefix}-${year}-(\\d+)`));
      if (match) {
        maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
      }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${prefix}-${year}-${nextNumber}`;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password if it's not already hashed
    if (insertUser.password && !insertUser.password.startsWith('$2b$')) {
      insertUser.password = await bcrypt.hash(insertUser.password, 10);
    }
    
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByFullName(fullName: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.fullName, fullName)).limit(1);
    return user;
  }

  async getPermit(id: number): Promise<Permit | undefined> {
    const [permit] = await db.select().from(permits).where(eq(permits.id, id));
    return permit || undefined;
  }

  async getPermitByPermitId(permitId: string): Promise<Permit | undefined> {
    const [permit] = await db.select().from(permits).where(eq(permits.permitId, permitId));
    return permit || undefined;
  }

  async getAllPermits(): Promise<Permit[]> {
    return await db.select().from(permits).orderBy(permits.createdAt);
  }

  async getPermitsByStatus(status: string): Promise<Permit[]> {
    return await db.select().from(permits).where(eq(permits.status, status));
  }

  async getPermitsByRequestor(requestorId: number): Promise<Permit[]> {
    return await db.select().from(permits).where(eq(permits.requestorId, requestorId));
  }

  async createPermit(insertPermit: InsertPermit): Promise<Permit> {
    const permitId = await this.generatePermitId(insertPermit.type);
    const now = new Date();

    const [permit] = await db
      .insert(permits)
      .values({
        type: insertPermit.type,
        location: insertPermit.location,
        description: insertPermit.description,
        requestorName: insertPermit.requestorName,
        department: insertPermit.department,
        contactNumber: insertPermit.contactNumber,
        emergencyContact: insertPermit.emergencyContact,
        permitId,
        status: insertPermit.status || 'pending',
        requestorId: insertPermit.requestorId || null,
        startDate: insertPermit.startDate ? new Date(insertPermit.startDate) : null,
        endDate: insertPermit.endDate ? new Date(insertPermit.endDate) : null,
        createdAt: now,
        updatedAt: now,
        riskLevel: insertPermit.riskLevel || null,
        safetyOfficer: insertPermit.safetyOfficer || null,
        identifiedHazards: insertPermit.identifiedHazards || null,
        additionalComments: insertPermit.additionalComments || null,
        selectedHazards: insertPermit.selectedHazards || [],
        hazardNotes: insertPermit.hazardNotes || '{}',
        completedMeasures: insertPermit.completedMeasures || [],
        departmentHead: insertPermit.departmentHead || null,
        maintenanceApprover: insertPermit.maintenanceApprover || null,
        // Add missing critical fields
        immediateActions: insertPermit.immediateActions || null,
        beforeWorkStarts: insertPermit.beforeWorkStarts || null,
        complianceNotes: insertPermit.complianceNotes || null,
        overallRisk: insertPermit.overallRisk || null,
        performerName: insertPermit.performerName || null,
        performerSignature: insertPermit.performerSignature || null,
        workLocationId: insertPermit.workLocationId || null,
        departmentHeadApproval: false,
        departmentHeadApprovalDate: null,
        maintenanceApproval: false,
        maintenanceApprovalDate: null,
        safetyOfficerApproval: false,
        safetyOfficerApprovalDate: null,
      })
      .returning();

    return permit;
  }

  async updatePermit(id: number, updates: Partial<Permit>): Promise<Permit | undefined> {
    const [permit] = await db
      .update(permits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(permits.id, id))
      .returning();

    return permit || undefined;
  }

  async deletePermit(id: number): Promise<boolean> {
    try {
      // Delete all associated data in the correct order to avoid foreign key constraints

      // 1. Delete AI suggestions
      await db.delete(aiSuggestions).where(eq(aiSuggestions.permitId, id));

      // 2. Delete permit attachments
      await db.delete(permitAttachments).where(eq(permitAttachments.permitId, id));

      // 3. Delete notifications related to this permit
      await db.delete(notifications).where(eq(notifications.relatedPermitId, id));

      // 4. Finally delete the permit itself
      const result = await db.delete(permits).where(eq(permits.id, id));

      console.log(`Deleted permit ${id} and all associated data: suggestions, attachments, notifications`);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`Error deleting permit ${id} and associated data:`, error);
      throw error;
    }
  }

  async getPermitStats(): Promise<{
    activePermits: number;
    pendingApproval: number;
    expiredToday: number;
    completed: number;
  }> {
    const allPermits = await db.select().from(permits);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      activePermits: allPermits.filter(p => p.status === 'active').length,
      pendingApproval: allPermits.filter(p => p.status === 'pending').length,
      expiredToday: allPermits.filter(p => {
        if (!p.endDate) return false;
        const endDate = new Date(p.endDate);
        return endDate >= today && endDate < tomorrow && p.status === 'expired';
      }).length,
      completed: allPermits.filter(p => p.status === 'completed').length,
    };
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return userNotifications;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return unreadNotifications.length;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return true;
  }

  // User role operations
  async updateUserRole(userId: number, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<User | undefined> {
    // Hash password if it's being updated and not already hashed
    if (updates.password && !updates.password.startsWith('$2b$')) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db
      .insert(templates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  // AI Suggestions operations
  async getPermitSuggestions(permitId: number): Promise<AiSuggestion[]> {
    return await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.permitId, permitId))
      .orderBy(desc(aiSuggestions.createdAt));
  }

  async createAiSuggestion(insertSuggestion: InsertAiSuggestion): Promise<AiSuggestion> {
    const [suggestion] = await db
      .insert(aiSuggestions)
      .values(insertSuggestion)
      .returning();
    return suggestion;
  }

  async updateSuggestionStatus(id: number, status: string): Promise<AiSuggestion | undefined> {
    const [suggestion] = await db
      .update(aiSuggestions)
      .set({ 
        status,
        appliedAt: status === 'accepted' ? new Date() : null
      })
      .where(eq(aiSuggestions.id, id))
      .returning();
    return suggestion;
  }

  async applySuggestion(id: number): Promise<boolean> {
    try {
      console.log(`Applying AI suggestion ${id}...`);

      const [suggestion] = await db
        .select()
        .from(aiSuggestions)
        .where(eq(aiSuggestions.id, id))
        .limit(1);

      if (!suggestion) {
        console.error(`Suggestion ${id} not found`);
        return false;
      }

      const { permitId, fieldName, suggestedValue } = suggestion;
      console.log(`Suggestion details: permitId=${permitId}, fieldName=${fieldName}, value=${suggestedValue}`);

      if (fieldName && suggestedValue !== null && suggestedValue !== undefined) {
        // Get current permit data
        const [currentPermit] = await db
          .select()
          .from(permits)
          .where(eq(permits.id, permitId))
          .limit(1);

        if (!currentPermit) {
          console.error(`Permit ${permitId} not found`);
          return false;
        }

        // Validate and sanitize the suggested value based on field type
        const sanitizedValue = this.sanitizeSuggestionValue(fieldName, suggestedValue);
        console.log(`Sanitized value for ${fieldName}:`, sanitizedValue);

        if (sanitizedValue === null) {
          console.warn(`Skipping invalid suggestion for field ${fieldName}:`, suggestedValue);
          return true; // Skip but don't fail
        }

        // Map camelCase field names to Drizzle schema field names
        const fieldMapping: Record<string, string> = {
          // Basic fields
          'immediateActions': 'immediateActions',
          'beforeWorkStarts': 'beforeWorkStarts',
          'preventiveMeasures': 'beforeWorkStarts',  // KORREKTUR: Frontend preventiveMeasures → Backend beforeWorkStarts
          'complianceNotes': 'complianceNotes',
          'additionalComments': 'additionalComments',
          'identifiedHazards': 'identifiedHazards',
          'overallRisk': 'overallRisk',
          'selectedHazards': 'selectedHazards',
          'hazardNotes': 'hazardNotes',
          'completedMeasures': 'completedMeasures',
          'requestorName': 'requestorName',
          'contactNumber': 'contactNumber',
          'emergencyContact': 'emergencyContact',
          'startDate': 'startDate',
          'endDate': 'endDate',
          'riskLevel': 'riskLevel',
          'safetyOfficer': 'safetyOfficer',
          'departmentHead': 'departmentHead',
          'maintenanceApprover': 'maintenanceApprover',
          'performerName': 'performerName',
          'performerSignature': 'performerSignature',
          // Direct mapping
          'location': 'location',
          'description': 'description',
          'department': 'department',
          'status': 'status'
        };

        const schemaFieldName = fieldMapping[fieldName] || fieldName;
        console.log(`Mapped field ${fieldName} to schema field ${schemaFieldName}`);

        // Special handling for hazard-related fields with direct replacement
        if (fieldName === 'selectedHazards') {
          console.log(`Processing selectedHazards with direct replacement`);

          // Parse and apply selectedHazards directly
          let newSelectedHazards: string[] = [];
          if (Array.isArray(sanitizedValue)) {
            newSelectedHazards = sanitizedValue;
          } else if (typeof sanitizedValue === 'string') {
            try {
              newSelectedHazards = JSON.parse(sanitizedValue);
            } catch {
              newSelectedHazards = [];
            }
          }

          console.log(`Directly updating selectedHazards to:`, newSelectedHazards);
          console.log(`Type of newSelectedHazards:`, typeof newSelectedHazards, Array.isArray(newSelectedHazards));

          // Ensure it's an array for PostgreSQL array column
          if (!Array.isArray(newSelectedHazards)) {
            newSelectedHazards = [];
          }

          await db
            .update(permits)
            .set({
              selectedHazards: newSelectedHazards,
              updatedAt: new Date()
            })
            .where(eq(permits.id, permitId));

        } else if (fieldName === 'hazardNotes') {
          console.log(`Processing hazardNotes with direct replacement`);

          // Parse and apply hazardNotes directly
          let newHazardNotes: Record<string, string> = {};
          if (typeof sanitizedValue === 'string') {
            try {
              newHazardNotes = JSON.parse(sanitizedValue);
            } catch {
              newHazardNotes = {};
            }
          } else if (typeof sanitizedValue === 'object' && sanitizedValue !== null) {
            newHazardNotes = sanitizedValue as Record<string, string>;
          }

          console.log(`Directly updating hazardNotes to:`, newHazardNotes);

          await db
            .update(permits)
            .set({
              hazardNotes: JSON.stringify(newHazardNotes),
              updatedAt: new Date()
            })
            .where(eq(permits.id, permitId));

        } else {
          // Apply regular field updates using proper Drizzle syntax
          console.log(`Updating permit ${permitId} with field ${schemaFieldName}:`, sanitizedValue);

          // Create update object with explicit field mapping
          const updateData: any = {
            updatedAt: new Date()
          };
          updateData[schemaFieldName] = sanitizedValue;

          const result = await db
            .update(permits)
            .set(updateData)
            .where(eq(permits.id, permitId));

          console.log(`Update result successful`);
        }
      }

      // Mark suggestion as accepted and applied
      console.log(`Marking suggestion ${id} as accepted`);
      await db
        .update(aiSuggestions)
        .set({ 
          status: 'accepted',
          appliedAt: new Date()
        })
        .where(eq(aiSuggestions.id, id));

      console.log(`Successfully applied suggestion ${id}`);
      return true;
    } catch (error) {
      console.error('Error applying suggestion:', error);
      console.error('Suggestion ID:', id);
      console.error('Error details:', error);
      return false;
    }
  }

  private sanitizeSuggestionValue(fieldName: string, suggestedValue: any): any {
    try {
      switch (fieldName) {
        // Array fields
        case 'selectedHazards':
          if (Array.isArray(suggestedValue)) {
            // Handle array of hazard objects with notes
            if (suggestedValue.length > 0 && typeof suggestedValue[0] === 'object' && suggestedValue[0].hazardId) {
              // Extract just the hazard IDs for selectedHazards field
              return suggestedValue.map(item => item.hazardId);
            }
            return suggestedValue;
          } else if (typeof suggestedValue === 'string') {
            // Try to parse as JSON array first
            try {
              const parsed = JSON.parse(suggestedValue);
              if (Array.isArray(parsed)) {
                // Handle array of hazard objects
                if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].hazardId) {
                  return parsed.map(item => item.hazardId);
                }
                return parsed;
              }
            } catch {
              // Not valid JSON, continue with string parsing
            }

            // Handle comma-separated string format like "1-0, 7-1, 8-0, 4-0"
            if (suggestedValue.includes(',')) {
              return suggestedValue.split(',').map(s => s.trim()).filter(s => s);
            }

            // Single value or space-separated values
            return suggestedValue.split(/[,\s]+/).map(s => s.trim()).filter(s => s);
          }
          return [];

        case 'completedMeasures':
          if (Array.isArray(suggestedValue)) {
            return suggestedValue;
          } else if (typeof suggestedValue === 'string') {
            // Try to parse as JSON array first
            try {
              const parsed = JSON.parse(suggestedValue);
              if (Array.isArray(parsed)) {
                return parsed;
              }
            } catch {
              // Not valid JSON, continue with string parsing
            }

            // Handle comma-separated string format like "1-0, 7-1, 8-0, 4-0"
            if (suggestedValue.includes(',')) {
              return suggestedValue.split(',').map(s => s.trim()).filter(s => s);
            }

            // Single value or space-separated values
            return suggestedValue.split(/[,\s]+/).map(s => s.trim()).filter(s => s);
          }
          return [];

        case 'hazardNotes':
          if (typeof suggestedValue === 'object' && suggestedValue !== null) {
            return JSON.stringify(suggestedValue);
          } else if (typeof suggestedValue === 'string') {
            try {
              JSON.parse(suggestedValue);
              return suggestedValue;
            } catch {
              return JSON.stringify({ general: suggestedValue });
            }
          }
          return '{}';

        case 'startDate':
        case 'endDate':
          if (suggestedValue && typeof suggestedValue === 'object' && 'toISOString' in suggestedValue) {
            return suggestedValue;
          } else if (typeof suggestedValue === 'string') {
            const parsedDate = new Date(suggestedValue);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate;
            }
          }
          return null; // Invalid date, skip this suggestion

        case 'requestorId':
        case 'uploadedBy':
          const numValue = parseInt(String(suggestedValue));
          return isNaN(numValue) ? null : numValue;

        case 'immediateActions':
        case 'beforeWorkStarts':
        case 'complianceNotes':
        case 'additionalComments':
        case 'identifiedHazards':
        case 'location':
        case 'description':
        case 'requestorName':
        case 'department':
        case 'contactNumber':
        case 'emergencyContact':
        case 'performerName':
        case 'performerSignature':
        case 'overallRisk':
          // Text fields - ensure string format
          return String(suggestedValue || '');

        case 'departmentHeadApproval':
        case 'safetyOfficerApproval':
        case 'maintenanceApproval':
          // Boolean fields
          return Boolean(suggestedValue);

        case 'departmentHeadId':
        case 'safetyOfficerId':
        case 'maintenanceApproverId':
        case 'workLocationId':
          // ID fields - ensure valid number or null
          const idValue = parseInt(String(suggestedValue));
          return isNaN(idValue) ? null : idValue;

        default:
          // For any other text fields, ensure it's a string
          return String(suggestedValue || '');
      }
    } catch (error) {
      console.error(`Error sanitizing value for ${fieldName}:`, error);
      return null;
    }
  }

  async mapSuggestionToTRBS(suggestion: any, permit: any): Promise<void> {
    try {
      const { fieldName, suggestedValue, reasoning, suggestionType } = suggestion;

      let currentSelectedHazards: string[] = [];
      let currentHazardNotes: Record<string, string> = {};

      try {
        currentSelectedHazards = permit.selectedHazards ? 
          (Array.isArray(permit.selectedHazards) ? permit.selectedHazards : JSON.parse(permit.selectedHazards)) : [];
        currentHazardNotes = permit.hazardNotes ? 
          (typeof permit.hazardNotes === 'object' ? permit.hazardNotes : JSON.parse(permit.hazardNotes)) : {};
      } catch (e) {
        console.error('Error parsing current hazard data:', e);
      }

      let hasNewMapping = false;

      // Handle structured hazard data from AI suggestions - this should take priority
      if (fieldName === 'selectedHazards') {
        try {
          let hazardData: any = null;

          // Try to parse suggested value as JSON if it's a string
          if (typeof suggestedValue === 'string') {
            try {
              hazardData = JSON.parse(suggestedValue);
            } catch {
              // If not JSON, treat as simple text
              hazardData = suggestedValue;
            }
          } else {
            hazardData = suggestedValue;
          }

          console.log('Processing structured hazard data from AI suggestion:', hazardData);

          // Handle array of hazard objects with specific notes
          if (Array.isArray(hazardData)) {
            for (const hazardItem of hazardData) {
              if (hazardItem.hazardId && hazardItem.notes) {
                const hazardId = hazardItem.hazardId;
                if (!currentSelectedHazards.includes(hazardId)) {
                  currentSelectedHazards.push(hazardId);
                  hasNewMapping = true;
                }
                // Use the specific notes from the hazard item
                currentHazardNotes[hazardId] = hazardItem.notes;
                hasNewMapping = true;
                console.log(`Mapped hazard ${hazardId} with specific note: ${hazardItem.notes}`);
              }
            }

            // If we found structured data, return early to avoid generic mapping
            if (hasNewMapping) {
              console.log(`Updating permit ${permit.id} with structured TRBS mappings:`);
              console.log(`Selected hazards: ${currentSelectedHazards.join(', ')}`);
              console.log(`Hazard notes: ${JSON.stringify(currentHazardNotes)}`);

              await db
                .update(permits)
                .set({
                  selectedHazards: currentSelectedHazards,
                  hazardNotes: JSON.stringify(currentHazardNotes),
                  updatedAt: new Date()
                })
                .where(eq(permits.id, permit.id));

              console.log(`Successfully applied structured AI hazard mapping`);
              return;
            }
          }
          // Handle object with hazard mappings
          else if (typeof hazardData === 'object' && hazardData !== null) {
            for (const [key, value] of Object.entries(hazardData)) {
              if (key.match(/^\d+-\d+$/)) { // TRBS format like "4-3"
                const hazardId = key;
                if (!currentSelectedHazards.includes(hazardId)) {
                  currentSelectedHazards.push(hazardId);
                  hasNewMapping = true;
                }
                // Use the specific value as the note
                currentHazardNotes[hazardId] = String(value);
                hasNewMapping = true;
                console.log(`Mapped hazard ${hazardId} with note: ${value}`);
              }
            }

            // If we found structured data, return early to avoid generic mapping
            if (hasNewMapping) {
              console.log(`Updating permit ${permit.id} with structured TRBS mappings:`);
              console.log(`Selected hazards: ${currentSelectedHazards.join(', ')}`);
              console.log(`Hazard notes: ${JSON.stringify(currentHazardNotes)}`);

              await db
                .update(permits)
                .set({
                  selectedHazards: currentSelectedHazards,
                  hazardNotes: JSON.stringify(currentHazardNotes),
                  updatedAt: new Date()
                })
                .where(eq(permits.id, permit.id));

              console.log(`Successfully applied structured AI hazard mapping`);
              return;
            }
          }
        } catch (error) {
          console.error('Error processing structured hazard data:', error);
        }
      }

      // Enhanced TRBS hazard category mappings with comprehensive keywords
      const trbsMapping: Record<string, string[]> = {
        // Mechanische Gefährdungen
        'maschine|gerät|werkzeug|schnitt|quetsch|stoß|uncontrolled|beweglich|rotating|sharp': ['0-0', '0-1', '0-2', '0-3', '0-4'],

        // Absturzgefährdungen
        'absturz|höhe|leiter|gerüst|plattform|fall|sturz|height|ladder|scaffold': ['1-0', '1-1', '1-2', '1-3'],

        // Brand- und Explosionsgefährdungen
        'brand|feuer|flamm|entzünd|heiß|funken|zündung|fire|ignition|hot|spark': ['2-0', '2-1', '2-2'],
        'explosion|explosiv|gas|dampf|staub|explosive|vapor|dust|detonation': ['3-0', '3-1', '3-2'],

        // Elektrische Gefährdungen
        'elektr|strom|spannung|isolation|erdung|kurzschluss|electrical|voltage|current|shock': ['4-0', '4-1', '4-2'],

        // Gefahrstoffe
        'chemisch|giftig|ätzend|reizend|chemical|toxic|corrosive|irritant|carcinogen': ['5-0', '5-1', '5-2', '5-3'],
        'ethanol|lösungsmittel|säure|base|solvent|acid|alkali': ['5-0', '5-1'],

        // Biologische Gefährdungen
        'biologisch|bakterien|viren|pilze|infectious|bacteria|virus|fungi|contamination': ['6-0', '6-1'],

        // Physikalische Einwirkungen
        'lärm|vibration|strahlung|temperatur|noise|radiation|temperature|heat|cold': ['7-0', '7-1', '7-2'],

        // Ergonomische Gefährdungen
        'ergonomisch|heben|tragen|haltung|wiederholung|ergonomic|lifting|posture|repetitive': ['8-0', '8-1'],

        // Psychische Faktoren
        'stress|belastung|zeitdruck|überforderung|psychological|mental|pressure|overload': ['9-0', '9-1'],

        // Atemschutz und Inhalation
        'atemschutz|inhalation|dämpfe|aerosol|respiratory|breathing|fumes|vapor|inhale': ['5-2', '7-0'],

        // Augenschutz
        'auge|spritzer|strahlung|eye|splash|radiation|vision': ['5-3', '7-2'],

        // Hautschutz
        'haut|kontakt|absorption|skin|contact|dermal|gloves': ['5-1', '5-3']
      };

      // Analyze suggestion content for TRBS category mapping (fallback)
      const suggestionText = `${suggestedValue} ${reasoning}`.toLowerCase();
      let mappedHazards: string[] = [];

      console.log(`Analyzing suggestion for TRBS mapping: "${suggestionText}"`);

      // Map based on content analysis using regex patterns
      for (const [keywordPattern, hazardIds] of Object.entries(trbsMapping)) {
        const regex = new RegExp(keywordPattern, 'i');
        if (regex.test(suggestionText)) {
          console.log(`Matched pattern "${keywordPattern}" -> hazards: ${hazardIds.join(', ')}`);

          // Add relevant hazard if not already present
          for (const hazardId of hazardIds) {
            if (!currentSelectedHazards.includes(hazardId)) {
              currentSelectedHazards.push(hazardId);
              mappedHazards.push(hazardId);
              hasNewMapping = true;
              console.log(`Added hazard ${hazardId} to selected hazards`);
            }
          }

          // Add or update hazard notes with actual suggestion content
          if (hazardIds.length > 0) {
            const primaryHazard = hazardIds[0];
            // Use the actual suggestion content instead of generic text
            const noteContent = reasoning || suggestedValue || 'Von AI-Analyse erkannt';
            currentHazardNotes[primaryHazard] = noteContent;
            hasNewMapping = true;
            console.log(`Added note for hazard ${primaryHazard}: ${noteContent}`);
          }
        }
      }

      // Specific field-based mapping
      if (fieldName === 'identifiedHazards' && suggestionType === 'safety_improvement') {
        // Extract specific hazards from suggested value
        const hazardKeywords: Record<string, string[]> = {
          'absturz': ['1-0', '1-1'],
          'brand': ['2-0'],
          'explosion': ['3-0'],
          'elektrisch': ['4-0'],
          'chemisch': ['5-0'],
          'biologisch': ['6-0'],
          'lärm': ['7-0'],
          'vibration': ['7-1'],
          'ergonomisch': ['8-0'],
          'stress': ['9-0']
        };

        for (const [keyword, hazardIds] of Object.entries(hazardKeywords)) {
          if (suggestedValue.toLowerCase().includes(keyword)) {
            for (const hazardId of hazardIds) {
              if (!currentSelectedHazards.includes(hazardId)) {
                currentSelectedHazards.push(hazardId);
                // Use actual suggestion content instead of generic text
                const noteContent = reasoning || suggestedValue || 'Von AI-Analyse erkannt';
                currentHazardNotes[hazardId] = noteContent;
                hasNewMapping = true;
              }
            }
          }
        }
      }

      // Update permit with new TRBS mappings if any were added
      if (hasNewMapping) {
        console.log(`Updating permit ${permit.id} with new TRBS mappings:`);
        console.log(`Selected hazards: ${currentSelectedHazards.join(', ')}`);
        console.log(`Hazard notes: ${JSON.stringify(currentHazardNotes)}`);

        await db
          .update(permits)
          .set({
            selectedHazards: currentSelectedHazards,
            hazardNotes: JSON.stringify(currentHazardNotes),
            updatedAt: new Date()
          })
          .where(eq(permits.id, permit.id));

        console.log(`Successfully mapped AI suggestion to TRBS categories: ${mappedHazards.join(', ')}`);
      } else {
        console.log('No TRBS mappings were added for this suggestion');
      }

    } catch (error) {
      console.error('Error mapping suggestion to TRBS:', error);
    }
  }

  async applyAllSuggestions(permitId: number): Promise<number> {
    try {
      const pendingSuggestions = await db
        .select()
        .from(aiSuggestions)
        .where(and(
          eq(aiSuggestions.permitId, permitId),
          eq(aiSuggestions.status, 'pending')
        ));

      let appliedCount = 0;
      for (const suggestion of pendingSuggestions) {
        const success = await this.applySuggestion(suggestion.id);
        if (success) appliedCount++;
      }

      return appliedCount;
    } catch (error) {
      console.error('Error applying all suggestions:', error);
      return 0;
    }
  }

  async rejectAllSuggestions(permitId: number): Promise<number> {
    try {
      const result = await db
        .update(aiSuggestions)
        .set({ status: 'rejected' })
        .where(and(
          eq(aiSuggestions.permitId, permitId),
          eq(aiSuggestions.status, 'pending')
        ));

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error rejecting all suggestions:', error);
      return 0;
    }
  }

  async deleteAllSuggestions(permitId: number): Promise<number> {
    try {
      const result = await db
        .delete(aiSuggestions)
        .where(eq(aiSuggestions.permitId, permitId));

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting all suggestions:', error);
      return 0;
    }
  }

  // Webhook configuration operations
  async getAllWebhookConfigs(): Promise<WebhookConfig[]> {
    return await db
      .select()
      .from(webhookConfig)
      .orderBy(desc(webhookConfig.createdAt));
  }

  async getActiveWebhookConfig(): Promise<WebhookConfig | undefined> {
    const [config] = await db
      .select()
      .from(webhookConfig)
      .where(eq(webhookConfig.isActive, true))
      .limit(1);
    return config;
  }

  async createWebhookConfig(insertConfig: InsertWebhookConfig): Promise<WebhookConfig> {
    const [config] = await db
      .insert(webhookConfig)
      .values(insertConfig)
      .returning();
    return config;
  }

  async updateWebhookConfig(id: number, updates: Partial<WebhookConfig>): Promise<WebhookConfig | undefined> {
    const [config] = await db
      .update(webhookConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(webhookConfig.id, id))
      .returning();
    return config;
  }

  async deleteWebhookConfig(id: number): Promise<boolean> {
    const result = await db
      .delete(webhookConfig)
      .where(eq(webhookConfig.id, id));
    return (result.rowCount || 0) > 0;
  }

  async testWebhookConnection(id: number): Promise<boolean> {
    try {
      const config = await db
        .select()
        .from(webhookConfig)
        .where(eq(webhookConfig.id, id))
        .limit(1);

      if (!config.length) {
        console.error('Webhook config not found for id:', id);
        return false;
      }

      console.log('Testing webhook connection to:', config[0].webhookUrl);

      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test connection from permit management system'
      };

      // Create URL with query parameters for GET request
      const url = new URL(config[0].webhookUrl);
      url.searchParams.append('test', 'true');
      url.searchParams.append('timestamp', testPayload.timestamp);
      url.searchParams.append('message', testPayload.message);

      console.log('Full webhook URL with parameters:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const success = response.ok;

      if (success) {
        console.log('Webhook test successful. Response status:', response.status);
      } else {
        console.error('Webhook test failed. Response status:', response.status, 'Status text:', response.statusText);
      }

      // Update test status
      await this.updateWebhookConfig(id, {
        lastTestedAt: new Date(),
        lastTestStatus: success ? 'success' : 'failed'
      });

      return success;
    } catch (error) {
      console.error('Webhook test error for config ID:', id);
      console.error('Error details:', error);

      // Provide specific error information
      let errorType = 'Unknown error';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorType = 'Network connection failed';
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        errorType = 'Request timeout (10 seconds)';
      } else if (error instanceof Error) {
        errorType = error.message;
      }

      console.error('Error type:', errorType);

      // Update test status on error
      await this.updateWebhookConfig(id, {
        lastTestedAt: new Date(),
        lastTestStatus: 'failed'
      });
      return false;
    }
  }

  // Work Location operations
  async getAllWorkLocations(): Promise<WorkLocation[]> {
    return await db.select().from(workLocations).orderBy(desc(workLocations.createdAt));
  }

  async getActiveWorkLocations(): Promise<WorkLocation[]> {
    return await db.select()
      .from(workLocations)
      .where(eq(workLocations.isActive, true))
      .orderBy(workLocations.name);
  }

  async createWorkLocation(insertLocation: InsertWorkLocation): Promise<WorkLocation> {
    const [location] = await db
      .insert(workLocations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async updateWorkLocation(id: number, updates: Partial<WorkLocation>): Promise<WorkLocation | undefined> {
    const [location] = await db
      .update(workLocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workLocations.id, id))
      .returning();
    return location || undefined;
  }

  async deleteWorkLocation(id: number): Promise<boolean> {
    const result = await db
      .delete(workLocations)
      .where(eq(workLocations.id, id));
    return (result.rowCount || 0) > 0;
  }

  // User role filtering operations
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(users.fullName);
  }

  async getDepartmentHeads(): Promise<User[]> {
    return await this.getUsersByRole('department_head');
  }

  async getSafetySpecialists(): Promise<User[]> {
    return await this.getUsersByRole('safety_specialist');
  }

  async getMaintenanceApprovers(): Promise<User[]> {
    return await this.getUsersByRole('maintenance');
  }

  // Permit Attachment operations
  async getPermitAttachments(permitId: number): Promise<PermitAttachment[]> {
    return await db
      .select()
      .from(permitAttachments)
      .where(eq(permitAttachments.permitId, permitId))
      .orderBy(desc(permitAttachments.createdAt));
  }

  async createPermitAttachment(insertAttachment: InsertPermitAttachment): Promise<PermitAttachment> {
    const [attachment] = await db
      .insert(permitAttachments)
      .values(insertAttachment)
      .returning();
    return attachment;
  }

  async deletePermitAttachment(id: number): Promise<boolean> {
    const result = await db
      .delete(permitAttachments)
      .where(eq(permitAttachments.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAttachmentById(id: number): Promise<PermitAttachment | undefined> {
    const [attachment] = await db
      .select()
      .from(permitAttachments)
      .where(eq(permitAttachments.id, id))
      .limit(1);
    return attachment || undefined;
  }

  // Session operations
  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getSessionBySessionId(sessionId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);
    return session || undefined;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await db
      .delete(sessions)
      .where(eq(sessions.sessionId, sessionId));
    return (result.rowCount || 0) > 0;
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()));
  }

  // AI Suggestions cleanup operations
  async cleanupOldSuggestions(): Promise<number> {
    // Delete suggestions older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db
      .delete(aiSuggestions)
      .where(lt(aiSuggestions.createdAt, oneDayAgo));
    return result.rowCount || 0;
  }

  async cleanupSuggestionsForUser(userId: number): Promise<number> {
    // Get all permits for this user
    const userPermits = await db
      .select({ id: permits.id })
      .from(permits)
      .where(eq(permits.requestorId, userId));

    if (userPermits.length === 0) {
      return 0;
    }

    const permitIds = userPermits.map(p => p.id);
    let totalDeleted = 0;

    // Delete suggestions for each permit belonging to this user
    for (const permitId of permitIds) {
      const result = await db
        .delete(aiSuggestions)
        .where(eq(aiSuggestions.permitId, permitId));
      totalDeleted += result.rowCount || 0;
    }

    return totalDeleted;
  }

  async updatePermitStatus(id: number, status: string, userId: number, comment?: string): Promise<Permit | undefined> {
    // First add to status history
    await this.addStatusHistoryEntry(id, status, userId, comment);

    // Prepare update object with status-specific timestamps
    const updateData: Partial<Permit> = {
      status,
      updatedAt: new Date()
    };

    // Set specific timestamps based on status
    switch (status) {
      case 'pending':
        updateData.submittedAt = new Date();
        updateData.submittedBy = userId;
        break;
      case 'approved':
        updateData.approvedAt = new Date();
        break;
      case 'active':
        updateData.activatedAt = new Date();
        break;
      case 'completed':
        updateData.completedAt = new Date();
        break;
    }

    const [updatedPermit] = await db
      .update(permits)
      .set(updateData)
      .where(eq(permits.id, id))
      .returning();

    return updatedPermit;
  }

  async addStatusHistoryEntry(permitId: number, status: string, userId: number, comment?: string): Promise<void> {
    // Get current permit to read existing history
    const permit = await this.getPermit(permitId);
    if (!permit) return;

    // Get user name for history entry
    const user = await this.getUser(userId);
    const userName = user?.username || 'Unknown';

    // Parse existing history
    const existingHistory = permit.statusHistory ? JSON.parse(permit.statusHistory) : [];

    // Add new entry
    const newEntry = {
      status,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      comment
    };

    const updatedHistory = [...existingHistory, newEntry];

    // Update permit with new history
    await db
      .update(permits)
      .set({ 
        statusHistory: JSON.stringify(updatedHistory),
        updatedAt: new Date()
      })
      .where(eq(permits.id, permitId));
  }

  // System Settings operations
  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const [settings] = await db.select().from(systemSettings).limit(1);
    return settings || undefined;
  }

  async updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings | undefined> {
    const existing = await this.getSystemSettings();
    
    if (!existing) {
      // Create default settings if none exist
      const defaultSettings: InsertSystemSettings = {
        applicationTitle: updates.applicationTitle || "Arbeitserlaubnis",
        headerIcon: updates.headerIcon || null
      };
      return await this.createSystemSettings(defaultSettings);
    }

    const [updated] = await db
      .update(systemSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id))
      .returning();

    return updated || undefined;
  }

  async createSystemSettings(insertSettings: InsertSystemSettings): Promise<SystemSettings> {
    const [settings] = await db
      .insert(systemSettings)
      .values({
        ...insertSettings,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return settings;
  }
}

export const storage = new DatabaseStorage();