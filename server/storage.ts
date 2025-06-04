import { users, permits, type User, type InsertUser, type Permit, type InsertPermit } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private permits: Map<number, Permit>;
  private currentUserId: number;
  private currentPermitId: number;
  private permitCounter: number;

  constructor() {
    this.users = new Map();
    this.permits = new Map();
    this.currentUserId = 1;
    this.currentPermitId = 1;
    this.permitCounter = 1;
    
    // Initialize with some default users
    this.seedData();
  }

  private seedData() {
    // Create default users
    const defaultUsers: InsertUser[] = [
      {
        username: "hans.mueller",
        password: "password123",
        fullName: "Hans Mueller",
        department: "Operations",
        role: "supervisor"
      },
      {
        username: "safety.officer",
        password: "password123",
        fullName: "Dr. Sarah Weber",
        department: "Safety",
        role: "safety_officer"
      },
      {
        username: "ops.manager",
        password: "password123",
        fullName: "Michael Schmidt",
        department: "Operations",
        role: "operations_manager"
      }
    ];

    defaultUsers.forEach(user => {
      this.createUser(user);
    });
  }

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
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getPermit(id: number): Promise<Permit | undefined> {
    return this.permits.get(id);
  }

  async getPermitByPermitId(permitId: string): Promise<Permit | undefined> {
    return Array.from(this.permits.values()).find(
      (permit) => permit.permitId === permitId,
    );
  }

  async getAllPermits(): Promise<Permit[]> {
    return Array.from(this.permits.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getPermitsByStatus(status: string): Promise<Permit[]> {
    return Array.from(this.permits.values()).filter(
      (permit) => permit.status === status,
    );
  }

  async getPermitsByRequestor(requestorId: number): Promise<Permit[]> {
    return Array.from(this.permits.values()).filter(
      (permit) => permit.requestorId === requestorId,
    );
  }

  async createPermit(insertPermit: InsertPermit): Promise<Permit> {
    const id = this.currentPermitId++;
    const permitId = this.generatePermitId(insertPermit.type);
    const now = new Date();
    
    const permit: Permit = {
      ...insertPermit,
      id,
      permitId,
      startDate: new Date(insertPermit.startDate),
      endDate: new Date(insertPermit.endDate),
      createdAt: now,
      updatedAt: now,
    };
    
    this.permits.set(id, permit);
    return permit;
  }

  async updatePermit(id: number, updates: Partial<Permit>): Promise<Permit | undefined> {
    const permit = this.permits.get(id);
    if (!permit) return undefined;
    
    const updatedPermit: Permit = {
      ...permit,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.permits.set(id, updatedPermit);
    return updatedPermit;
  }

  async deletePermit(id: number): Promise<boolean> {
    return this.permits.delete(id);
  }

  async getPermitStats(): Promise<{
    activePermits: number;
    pendingApproval: number;
    expiredToday: number;
    completed: number;
  }> {
    const permits = Array.from(this.permits.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      activePermits: permits.filter(p => p.status === 'active').length,
      pendingApproval: permits.filter(p => p.status === 'pending').length,
      expiredToday: permits.filter(p => {
        const endDate = new Date(p.endDate);
        return endDate >= today && endDate < tomorrow && p.status === 'expired';
      }).length,
      completed: permits.filter(p => p.status === 'completed').length,
    };
  }
}

export const storage = new MemStorage();
