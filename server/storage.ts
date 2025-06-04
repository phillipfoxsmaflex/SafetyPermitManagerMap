import { users, permits, notifications, type User, type InsertUser, type Permit, type InsertPermit, type Notification, type InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  private permitCounter: number = 1;

  private generatePermitId(type: string): string {
    const typeMap: Record<string, string> = {
      'confined_space': 'CS',
      'hot_work': 'HW',
      'electrical': 'EL',
      'chemical': 'CH',
      'height': 'HT'
    };
    
    const prefix = typeMap[type] || 'GN';
    const year = new Date().getFullYear();
    const number = this.permitCounter.toString().padStart(3, '0');
    this.permitCounter++;
    
    return `${prefix}-${year}-${number}`;
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
    const permitId = this.generatePermitId(insertPermit.type);
    const now = new Date();
    
    const [permit] = await db
      .insert(permits)
      .values({
        ...insertPermit,
        permitId,
        status: 'pending',
        requestorId: insertPermit.requestorId || null,
        startDate: new Date(insertPermit.startDate),
        endDate: new Date(insertPermit.endDate),
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
        supervisorApproval: false,
        supervisorApprovalDate: null,
        safetyOfficerApproval: false,
        safetyOfficerApprovalDate: null,
        operationsManagerApproval: false,
        operationsManagerApprovalDate: null,
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
    return result.rowCount > 0;
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
}

export const storage = new DatabaseStorage();
