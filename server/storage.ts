import { users, permits, notifications, templates, aiSuggestions, webhookConfig, workLocations, type User, type InsertUser, type Permit, type InsertPermit, type Notification, type InsertNotification, type Template, type InsertTemplate, type AiSuggestion, type InsertAiSuggestion, type WebhookConfig, type InsertWebhookConfig, type WorkLocation, type InsertWorkLocation } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
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
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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
        ...insertPermit,
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
        atmosphereTest: insertPermit.atmosphereTest || false,
        ventilation: insertPermit.ventilation || false,
        ppe: insertPermit.ppe || false,
        emergencyProcedures: insertPermit.emergencyProcedures || false,
        fireWatch: insertPermit.fireWatch || false,
        isolationLockout: insertPermit.isolationLockout || false,
        oxygenLevel: insertPermit.oxygenLevel || null,
        lelLevel: insertPermit.lelLevel || null,
        h2sLevel: insertPermit.h2sLevel || null,
        departmentHead: insertPermit.departmentHead || null,
        maintenanceApprover: insertPermit.maintenanceApprover || null,
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
    const result = await db.delete(permits).where(eq(permits.id, id));
    return (result.rowCount || 0) > 0;
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
      const suggestion = await db
        .select()
        .from(aiSuggestions)
        .where(eq(aiSuggestions.id, id))
        .limit(1);

      if (!suggestion.length) return false;

      const { permitId, fieldName, suggestedValue } = suggestion[0];

      if (fieldName) {
        // Apply the suggestion to the permit
        const updateData: any = {};
        updateData[fieldName] = suggestedValue;
        updateData.updatedAt = new Date();

        await db
          .update(permits)
          .set(updateData)
          .where(eq(permits.id, permitId));
      }

      // Mark suggestion as accepted
      await this.updateSuggestionStatus(id, 'accepted');
      return true;
    } catch (error) {
      console.error('Error applying suggestion:', error);
      return false;
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
    return result.rowCount > 0;
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
      console.error('Webhook test error for URL:', config[0]?.webhookUrl);
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

  async getSafetyOfficers(): Promise<User[]> {
    return await this.getUsersByRole('safety_officer');
  }

  async getMaintenanceApprovers(): Promise<User[]> {
    return await this.getUsersByRole('maintenance');
  }
}

export const storage = new DatabaseStorage();
