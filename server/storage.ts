import { users, permits, notifications, templates, type User, type InsertUser, type Permit, type InsertPermit, type Notification, type InsertNotification, type Template, type InsertTemplate } from "@shared/schema";
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
  
  // Template operations
  getAllTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
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
}

export const storage = new DatabaseStorage();
