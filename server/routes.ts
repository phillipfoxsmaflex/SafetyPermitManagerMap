import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPermitSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get permit statistics (must come before /api/permits/:id)
  app.get("/api/permits/stats", async (req, res) => {
    try {
      const stats = await storage.getPermitStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit statistics" });
    }
  });

  // Get permits by status (must come before /api/permits/:id)
  app.get("/api/permits/status/:status", async (req, res) => {
    try {
      const status = req.params.status;
      const permits = await storage.getPermitsByStatus(status);
      res.json(permits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits by status" });
    }
  });

  // Get all permits
  app.get("/api/permits", async (req, res) => {
    try {
      const permits = await storage.getAllPermits();
      res.json(permits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits" });
    }
  });

  // Get permit by ID
  app.get("/api/permits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const permit = await storage.getPermit(id);
      
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      res.json(permit);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit" });
    }
  });

  // Create new permit
  app.post("/api/permits", async (req, res) => {
    try {
      const validatedData = insertPermitSchema.parse(req.body);
      const permit = await storage.createPermit(validatedData);
      res.status(201).json(permit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create permit" });
    }
  });

  // Update permit
  app.patch("/api/permits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const permit = await storage.updatePermit(id, updates);
      
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      res.json(permit);
    } catch (error) {
      res.status(500).json({ message: "Failed to update permit" });
    }
  });

  // Delete permit
  app.delete("/api/permits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePermit(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      res.json({ message: "Permit deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete permit" });
    }
  });



  // Approve permit (supervisor, safety officer, operations manager)
  app.post("/api/permits/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approverRole } = req.body;
      
      const permit = await storage.getPermit(id);
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      const updates: any = {};
      const now = new Date();
      
      switch (approverRole) {
        case 'supervisor':
          updates.supervisorApproval = true;
          updates.supervisorApprovalDate = now;
          break;
        case 'safety_officer':
          updates.safetyOfficerApproval = true;
          updates.safetyOfficerApprovalDate = now;
          break;
        case 'operations_manager':
          updates.operationsManagerApproval = true;
          updates.operationsManagerApprovalDate = now;
          break;
        default:
          return res.status(400).json({ message: "Invalid approver role" });
      }
      
      // Check if all approvals are complete
      const updatedPermit = { ...permit, ...updates };
      if (updatedPermit.supervisorApproval && 
          updatedPermit.safetyOfficerApproval && 
          updatedPermit.operationsManagerApproval) {
        updates.status = 'approved';
      }
      
      const result = await storage.updatePermit(id, updates);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve permit" });
    }
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
