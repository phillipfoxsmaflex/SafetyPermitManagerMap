import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { insertPermitSchema, insertPermitAttachmentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configure multer for file uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueId}${extension}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      console.log(`File upload attempt: ${file.originalname}, mimetype: ${file.mimetype}`);
      
      // Allow images and common document formats
      const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt|xls|xlsx)$/i;
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream' // For some mobile uploads
      ];
      
      const hasValidExtension = allowedExtensions.test(file.originalname);
      const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
      
      // Special handling for camera captures that might have generic MIME types
      const isCameraCapture = file.originalname.toLowerCase().includes('image') || 
                            file.mimetype.startsWith('image/') ||
                            file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/i);
      
      if (hasValidExtension || hasValidMimeType || isCameraCapture) {
        console.log(`File accepted: ${file.originalname}`);
        return cb(null, true);
      } else {
        console.log(`File rejected: ${file.originalname}, mimetype: ${file.mimetype}`);
        cb(new Error(`Dateityp nicht unterstützt: ${file.mimetype}`));
      }
    }
  });
  
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
      console.log("Creating permit with data:", JSON.stringify(req.body, null, 2));
      
      // Validate and convert dates
      const processedData = { ...req.body };
      
      // Check if dates are valid
      if (req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ 
            message: "Ungültiges Startdatum. Bitte geben Sie ein gültiges Datum ein." 
          });
        }
        processedData.startDate = startDate.toISOString();
      } else {
        processedData.startDate = null;
      }
      
      if (req.body.endDate) {
        const endDate = new Date(req.body.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ 
            message: "Ungültiges Enddatum. Bitte geben Sie ein gültiges Datum ein." 
          });
        }
        processedData.endDate = endDate.toISOString();
      } else {
        processedData.endDate = null;
      }
      
      // Check if end date is after start date
      if (processedData.startDate && processedData.endDate) {
        const start = new Date(processedData.startDate);
        const end = new Date(processedData.endDate);
        if (end < start) {
          return res.status(400).json({ 
            message: "Enddatum muss nach dem Startdatum liegen." 
          });
        }
      }
      
      const validatedData = insertPermitSchema.parse(processedData);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      
      const permit = await storage.createPermit(validatedData);
      console.log("Created permit:", permit);
      
      res.status(201).json(permit);
    } catch (error) {
      console.error("Error creating permit:", error);
      
      if (error instanceof z.ZodError) {
        console.log("Validation errors:", error.errors);
        return res.status(400).json({ 
          message: "Validierungsfehler. Bitte überprüfen Sie alle Pflichtfelder.", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Genehmigung konnte nicht erstellt werden. Bitte überprüfen Sie alle Eingaben und versuchen Sie es erneut." 
      });
    }
  });

  // Update permit
  app.patch("/api/permits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      console.log("Updating permit:", id, "with data:", updates);
      
      // Validate and clean up date fields
      const dateFields = ['startDate', 'endDate', 'workStartedAt', 'workCompletedAt'];
      for (const field of dateFields) {
        if (updates[field] !== undefined) {
          if (updates[field] === '' || updates[field] === null) {
            updates[field] = null;
          } else {
            const date = new Date(updates[field]);
            if (isNaN(date.getTime())) {
              return res.status(400).json({ 
                message: `Ungültiges Datum für Feld "${field}". Bitte geben Sie ein gültiges Datum ein.`,
                field: field
              });
            }
            updates[field] = date;
          }
        }
      }
      
      // Validate required fields based on permit type
      const validationErrors = [];
      
      if (!updates.startDate && updates.status !== 'draft') {
        validationErrors.push("Startdatum ist erforderlich");
      }
      
      if (!updates.endDate && updates.status !== 'draft') {
        validationErrors.push("Enddatum ist erforderlich");
      }
      
      if (updates.startDate && updates.endDate && updates.startDate >= updates.endDate) {
        validationErrors.push("Das Enddatum muss nach dem Startdatum liegen");
      }
      
      if (!updates.location?.trim()) {
        validationErrors.push("Arbeitsort ist erforderlich");
      }
      
      if (!updates.description?.trim()) {
        validationErrors.push("Beschreibung ist erforderlich");
      }
      
      if (!updates.requestorName?.trim()) {
        validationErrors.push("Name des Antragstellers ist erforderlich");
      }
      
      if (!updates.department?.trim()) {
        validationErrors.push("Abteilung ist erforderlich");
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          message: "Bitte korrigieren Sie die folgenden Fehler:",
          errors: validationErrors
        });
      }
      
      const permit = await storage.updatePermit(id, updates);
      
      if (!permit) {
        return res.status(404).json({ 
          message: "Genehmigung nicht gefunden. Möglicherweise wurde sie bereits gelöscht."
        });
      }
      
      res.json(permit);
    } catch (error) {
      console.error("Error updating permit:", error);
      
      if (error instanceof Error && error.message?.includes('toISOString')) {
        return res.status(400).json({ 
          message: "Ungültiges Datumsformat. Bitte überprüfen Sie alle Datumsfelder und versuchen Sie es erneut."
        });
      }
      
      if (error instanceof Error && error.message?.includes('validation')) {
        return res.status(400).json({ 
          message: "Validierungsfehler. Bitte überprüfen Sie alle Eingaben auf Korrektheit."
        });
      }
      
      res.status(500).json({ 
        message: "Die Genehmigung konnte nicht gespeichert werden. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut."
      });
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

  // Approve permit
  app.post("/api/permits/:id/approve", async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const { approvalType } = req.body;
      
      const permit = await storage.getPermit(permitId);
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      const updates: any = { updatedAt: new Date() };
      
      if (approvalType === "department_head") {
        updates.departmentHeadApproval = true;
        updates.departmentHeadApprovalDate = new Date();
      } else if (approvalType === "maintenance") {
        updates.maintenanceApproval = true;
        updates.maintenanceApprovalDate = new Date();
      } else if (approvalType === "safety_officer") {
        updates.safetyOfficerApproval = true;
        updates.safetyOfficerApprovalDate = new Date();
      }
      
      // Check if both required approvals are now complete
      const updatedPermit = await storage.updatePermit(permitId, updates);
      if (updatedPermit?.departmentHeadApproval && updatedPermit?.maintenanceApproval) {
        await storage.updatePermit(permitId, { status: "approved" });
      }
      
      res.json({ message: "Permit approved successfully" });
    } catch (error) {
      console.error("Error approving permit:", error);
      res.status(500).json({ message: "Failed to approve permit" });
    }
  });

  // Reject permit
  app.post("/api/permits/:id/reject", async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const permit = await storage.getPermit(permitId);
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      await storage.updatePermit(permitId, { 
        status: "rejected",
        additionalComments: reason,
        updatedAt: new Date()
      });
      
      res.json({ message: "Permit rejected successfully" });
    } catch (error) {
      console.error("Error rejecting permit:", error);
      res.status(500).json({ message: "Failed to reject permit" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread notification count" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Simple session storage (in production, use Redis or database)
  const sessions = new Map<string, number>();

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Create session
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      sessions.set(sessionId, user.id);
      
      // Set session cookie
      res.cookie('sessionId', sessionId, { 
        httpOnly: true, 
        secure: false, // In production, set to true with HTTPS
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      console.log('Setting session cookie:', sessionId);
      
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          fullName: user.fullName,
          role: user.role,
          department: user.department
        } 
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (sessionId) {
        sessions.delete(sessionId);
      }
      res.clearCookie('sessionId');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      console.log('Auth check - cookies:', req.cookies);
      console.log('Auth check - sessionId:', sessionId);
      console.log('Auth check - active sessions:', Array.from(sessions.keys()));
      
      if (!sessionId || !sessions.has(sessionId)) {
        console.log('No valid session found');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = sessions.get(sessionId);
      if (!userId) {
        console.log('No userId for session');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found in database');
        sessions.delete(sessionId);
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      console.log('Auth check successful for user:', user.username);
      res.json(user);
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // User management routes
  app.post("/api/users", async (req, res) => {
    try {
      const { username, password, role } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const newUser = await storage.createUser({
        username,
        password,
        role: role || "employee",
        fullName: username,
        department: "Default"
      });

      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const updatedUser = await storage.updateUser(userId, { password });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Templates routes
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      console.log("Creating template with data:", JSON.stringify(req.body, null, 2));
      
      const { name, template } = req.body;
      const createdBy = 1; // Mock user ID
      
      const newTemplate = await storage.createTemplate({
        name,
        template,
        createdBy
      });
      
      console.log("Created template:", newTemplate);
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // User management routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.patch("/api/users/:id/role", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { role } = req.body;
      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
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

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // AI Suggestions and Webhook routes
  
  // Send permit to AI for analysis
  app.post("/api/permits/:id/analyze", async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const permit = await storage.getPermit(permitId);
      
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }

      const webhookConfig = await storage.getActiveWebhookConfig();
      if (!webhookConfig) {
        return res.status(400).json({ message: "No active webhook configuration found" });
      }

      // Create comprehensive permit data for analysis
      const permitAnalysisData = {
        // Basic permit information
        permitId: permit.permitId,
        internalId: permit.id,
        type: permit.type,
        location: permit.location,
        description: permit.description,
        department: permit.department,
        riskLevel: permit.riskLevel,
        status: permit.status,
        
        // Personnel information
        requestorName: permit.requestorName,
        contactNumber: permit.contactNumber,
        emergencyContact: permit.emergencyContact,
        safetyOfficer: permit.safetyOfficer,
        departmentHead: permit.departmentHead,
        maintenanceApprover: permit.maintenanceApprover,
        performerName: permit.performerName,
        
        // Dates and timing
        startDate: permit.startDate?.toISOString(),
        endDate: permit.endDate?.toISOString(),
        workStartedAt: permit.workStartedAt?.toISOString(),
        workCompletedAt: permit.workCompletedAt?.toISOString(),
        
        // Safety assessment
        selectedHazards: permit.selectedHazards,
        hazardNotes: permit.hazardNotes,
        completedMeasures: permit.completedMeasures,
        identifiedHazards: permit.identifiedHazards,
        additionalComments: permit.additionalComments,
        
        // Approval status
        departmentHeadApproval: permit.departmentHeadApproval,
        departmentHeadApprovalDate: permit.departmentHeadApprovalDate?.toISOString(),
        maintenanceApproval: permit.maintenanceApproval,
        maintenanceApprovalDate: permit.maintenanceApprovalDate?.toISOString(),
        safetyOfficerApproval: permit.safetyOfficerApproval,
        safetyOfficerApprovalDate: permit.safetyOfficerApprovalDate?.toISOString(),
        
        // Analysis metadata
        analysisType: 'permit_improvement',
        timestamp: new Date().toISOString(),
        systemVersion: '1.0'
      };

      // Create URL with JSON permit data for GET request
      const url = new URL(webhookConfig.webhookUrl);
      url.searchParams.append('action', 'analyze_permit');
      url.searchParams.append('permitData', JSON.stringify(permitAnalysisData));

      console.log('Sending permit for AI analysis:', {
        permitId: permit.permitId,
        internalId: permit.id,
        webhookUrl: webhookConfig.webhookUrl,
        dataSize: JSON.stringify(permitAnalysisData).length
      });

      console.log('Full webhook URL:', url.toString().substring(0, 200) + '...');
      console.log('Permit data being sent:', JSON.stringify(permitAnalysisData, null, 2));

      // Send GET request to webhook
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        console.error('Webhook request failed:', response.status, response.statusText);
        throw new Error(`Webhook request failed: ${response.status}`);
      }

      console.log('Permit data sent successfully to AI analysis webhook');

      res.json({ 
        message: "Permit sent for AI analysis successfully",
        status: "processing" 
      });
    } catch (error) {
      console.error("Error sending permit for analysis:", error);
      res.status(500).json({ message: "Failed to send permit for analysis" });
    }
  });

  // Test endpoint to simulate AI response
  app.post("/api/webhooks/test-suggestions", async (req, res) => {
    try {
      const { permitId } = req.body;
      
      if (!permitId) {
        return res.status(400).json({ message: "permitId is required" });
      }

      // Simulate AI analysis response
      const mockAiResponse = {
        permitId: permitId,
        analysisComplete: true,
        riskAssessment: {
          overallRisk: "medium",
          riskFactors: [
            "Unvollständige Risikobeurteilung",
            "Fehlende Schutzmaßnahmen",
            "Keine Sicherheitsbeauftragter zugewiesen"
          ],
          complianceScore: 65
        },
        suggestions: [
          {
            type: "safety_improvement",
            priority: "high",
            fieldName: "riskLevel",
            originalValue: null,
            suggestedValue: "medium",
            reasoning: "Basierend auf der Arbeitsbeschreibung und dem Standort Tank 1 sollte das Risiko als 'medium' eingestuft werden. Dies erfordert zusätzliche Sicherheitsmaßnahmen und Überwachung."
          },
          {
            type: "personnel_requirement",
            priority: "high", 
            fieldName: "safetyOfficer",
            originalValue: "",
            suggestedValue: "Dr. Klaus Weber",
            reasoning: "Für Arbeiten an Tank 1 ist ein qualifizierter Sicherheitsbeauftragter erforderlich. Dr. Weber ist für chemische Anlagen zertifiziert und verfügbar."
          },
          {
            type: "safety_improvement",
            priority: "medium",
            fieldName: "completedMeasures", 
            originalValue: [],
            suggestedValue: ["atmospheric_monitoring", "ventilation", "ppe", "emergency_procedures"],
            reasoning: "Für Arbeiten an Tankbehältern werden standardmäßig Atmosphärenüberwachung, Belüftung, PSA und Notfallverfahren empfohlen."
          },
          {
            type: "documentation_improvement",
            priority: "medium",
            fieldName: "identifiedHazards",
            originalValue: "",
            suggestedValue: "Chemische Dämpfe, Sauerstoffmangel, Explosionsgefahr, Sturz in Behälter",
            reasoning: "Vollständige Identifikation aller typischen Gefahren bei Tankarbeiten für bessere Risikobewertung und Vorbereitung."
          }
        ]
      };

      // Forward to actual suggestions endpoint
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/webhooks/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockAiResponse)
      });

      const result = await response.json();
      res.json({ message: "Test AI analysis sent", result });
    } catch (error) {
      console.error("Error in test suggestions:", error);
      res.status(500).json({ message: "Failed to send test suggestions" });
    }
  });

  // Receive AI suggestions from webhook
  app.post("/api/webhooks/suggestions", async (req, res) => {
    try {
      console.log('Received AI analysis response:', JSON.stringify(req.body, null, 2));
      
      const { 
        permitId, 
        analysisComplete, 
        suggestions, 
        riskAssessment, 
        recommendations,
        compliance_notes,
        error 
      } = req.body;
      
      if (!permitId) {
        return res.status(400).json({ message: "permitId is required" });
      }

      // Handle analysis errors
      if (!analysisComplete && error) {
        console.error('AI analysis failed for permit:', permitId, error);
        return res.status(200).json({ 
          message: "Analysis error received",
          error: error 
        });
      }

      if (!suggestions || !Array.isArray(suggestions)) {
        console.log('No suggestions provided for permit:', permitId);
        return res.status(200).json({ message: "No suggestions to process" });
      }

      // Find permit by permitId (string)
      const permit = await storage.getPermitByPermitId(permitId);
      if (!permit) {
        console.error('Permit not found:', permitId);
        return res.status(404).json({ message: "Permit not found" });
      }

      console.log(`Processing ${suggestions.length} AI suggestions for permit ${permitId}`);

      // Create AI suggestions with enhanced data
      const createdSuggestions = [];
      for (const suggestion of suggestions) {
        const aiSuggestion = await storage.createAiSuggestion({
          permitId: permit.id,
          suggestionType: suggestion.type || 'improvement',
          fieldName: suggestion.fieldName || null,
          originalValue: suggestion.originalValue || null,
          suggestedValue: suggestion.suggestedValue || suggestion.title,
          reasoning: suggestion.reasoning || suggestion.impact || 'AI analysis recommendation',
          priority: suggestion.priority || 'medium',
          status: 'pending'
        });
        createdSuggestions.push(aiSuggestion);
      }

      // Log additional analysis data for monitoring
      if (riskAssessment) {
        console.log('Risk assessment for permit', permitId, ':', {
          overallRisk: riskAssessment.overallRisk,
          complianceScore: riskAssessment.complianceScore,
          riskFactors: riskAssessment.riskFactors?.length || 0
        });
      }

      if (recommendations) {
        console.log('Recommendations for permit', permitId, ':', {
          immediateActions: recommendations.immediate_actions?.length || 0,
          beforeWorkStarts: recommendations.before_work_starts?.length || 0,
          monitoring: recommendations.monitoring_requirements?.length || 0
        });
      }

      res.json({ 
        message: "AI suggestions received successfully",
        suggestionsCount: createdSuggestions.length 
      });
    } catch (error) {
      console.error("Error receiving AI suggestions:", error);
      res.status(500).json({ message: "Failed to process AI suggestions" });
    }
  });

  // Get suggestions for a permit
  app.get("/api/permits/:id/suggestions", async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const suggestions = await storage.getPermitSuggestions(permitId);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Apply a suggestion
  app.post("/api/suggestions/:id/apply", async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.id);
      const success = await storage.applySuggestion(suggestionId);
      
      if (!success) {
        return res.status(404).json({ message: "Suggestion not found or could not be applied" });
      }

      res.json({ message: "Suggestion applied successfully" });
    } catch (error) {
      console.error("Error applying suggestion:", error);
      res.status(500).json({ message: "Failed to apply suggestion" });
    }
  });

  // Update suggestion status
  app.patch("/api/suggestions/:id/status", async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['pending', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const suggestion = await storage.updateSuggestionStatus(suggestionId, status);
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      res.json(suggestion);
    } catch (error) {
      console.error("Error updating suggestion status:", error);
      res.status(500).json({ message: "Failed to update suggestion status" });
    }
  });

  // Webhook configuration routes
  app.get("/api/webhook-configs", async (req, res) => {
    try {
      const configs = await storage.getAllWebhookConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching webhook configs:", error);
      res.status(500).json({ message: "Failed to fetch webhook configurations" });
    }
  });

  app.post("/api/webhook-configs", async (req, res) => {
    try {
      const { name, webhookUrl, isActive } = req.body;
      
      if (!name || !webhookUrl) {
        return res.status(400).json({ message: "Name and webhook URL are required" });
      }

      // If setting as active, deactivate others
      if (isActive) {
        const existingConfigs = await storage.getAllWebhookConfigs();
        for (const config of existingConfigs) {
          if (config.isActive) {
            await storage.updateWebhookConfig(config.id, { isActive: false });
          }
        }
      }

      const config = await storage.createWebhookConfig({
        name,
        webhookUrl,
        isActive: isActive || false
      });

      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating webhook config:", error);
      res.status(500).json({ message: "Failed to create webhook configuration" });
    }
  });

  app.patch("/api/webhook-configs/:id", async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      const updates = req.body;

      // If setting as active, deactivate others
      if (updates.isActive) {
        const existingConfigs = await storage.getAllWebhookConfigs();
        for (const config of existingConfigs) {
          if (config.isActive && config.id !== configId) {
            await storage.updateWebhookConfig(config.id, { isActive: false });
          }
        }
      }

      const config = await storage.updateWebhookConfig(configId, updates);
      if (!config) {
        return res.status(404).json({ message: "Webhook configuration not found" });
      }

      res.json(config);
    } catch (error) {
      console.error("Error updating webhook config:", error);
      res.status(500).json({ message: "Failed to update webhook configuration" });
    }
  });

  app.delete("/api/webhook-configs/:id", async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      const success = await storage.deleteWebhookConfig(configId);
      
      if (!success) {
        return res.status(404).json({ message: "Webhook configuration not found" });
      }

      res.json({ message: "Webhook configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting webhook config:", error);
      res.status(500).json({ message: "Failed to delete webhook configuration" });
    }
  });

  app.post("/api/webhook-configs/:id/test", async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      const success = await storage.testWebhookConnection(configId);
      
      res.json({ 
        success,
        message: success ? "Connection test successful" : "Connection test failed"
      });
    } catch (error) {
      console.error("Error testing webhook connection:", error);
      res.status(500).json({ message: "Failed to test webhook connection" });
    }
  });

  // Work Location routes
  app.get("/api/work-locations", async (req, res) => {
    try {
      const locations = await storage.getAllWorkLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching work locations:", error);
      res.status(500).json({ message: "Failed to fetch work locations" });
    }
  });

  app.get("/api/work-locations/active", async (req, res) => {
    try {
      const locations = await storage.getActiveWorkLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching active work locations:", error);
      res.status(500).json({ message: "Failed to fetch active work locations" });
    }
  });

  app.post("/api/work-locations", async (req, res) => {
    try {
      const { name, description, building, area, isActive } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const location = await storage.createWorkLocation({
        name,
        description,
        building,
        area,
        isActive: isActive ?? true
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating work location:", error);
      res.status(500).json({ message: "Failed to create work location" });
    }
  });

  app.patch("/api/work-locations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, building, area, isActive } = req.body;
      
      const location = await storage.updateWorkLocation(id, {
        name,
        description,
        building,
        area,
        isActive
      });
      
      if (!location) {
        return res.status(404).json({ message: "Work location not found" });
      }
      
      res.json(location);
    } catch (error) {
      console.error("Error updating work location:", error);
      res.status(500).json({ message: "Failed to update work location" });
    }
  });

  app.delete("/api/work-locations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWorkLocation(id);
      
      if (!success) {
        return res.status(404).json({ message: "Work location not found" });
      }
      
      res.json({ message: "Work location deleted successfully" });
    } catch (error) {
      console.error("Error deleting work location:", error);
      res.status(500).json({ message: "Failed to delete work location" });
    }
  });

  // User role-based routes for dropdowns
  app.get("/api/users/department-heads", async (req, res) => {
    try {
      const users = await storage.getDepartmentHeads();
      res.json(users);
    } catch (error) {
      console.error("Error fetching department heads:", error);
      res.status(500).json({ message: "Failed to fetch department heads" });
    }
  });

  app.get("/api/users/safety-officers", async (req, res) => {
    try {
      const users = await storage.getSafetyOfficers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching safety officers:", error);
      res.status(500).json({ message: "Failed to fetch safety officers" });
    }
  });

  app.get("/api/users/maintenance-approvers", async (req, res) => {
    try {
      const users = await storage.getMaintenanceApprovers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching maintenance approvers:", error);
      res.status(500).json({ message: "Failed to fetch maintenance approvers" });
    }
  });

  app.get("/api/users/by-role/:role", async (req, res) => {
    try {
      const role = req.params.role;
      const users = await storage.getUsersByRole(role);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ message: "Failed to fetch users by role" });
    }
  });

  // Permit Attachment routes
  app.get("/api/permits/:id/attachments", async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const attachments = await storage.getPermitAttachments(permitId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/permits/:id/attachments", upload.single('file'), async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      
      if (isNaN(permitId)) {
        return res.status(400).json({ message: "Invalid permit ID" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Verify permit exists
      const permit = await storage.getPermit(permitId);
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }

      console.log(`Uploading attachment for permit ${permitId}: ${req.file.originalname}`);

      // Determine file type based on mime type
      let fileType = 'other';
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype === 'application/pdf' || 
                 req.file.mimetype.includes('document') ||
                 req.file.mimetype.includes('text') ||
                 req.file.mimetype.includes('spreadsheet')) {
        fileType = 'document';
      }

      const attachmentData = {
        permitId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileType,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: 1, // TODO: Get from session
        description: req.body.description || null
      };

      const attachment = await storage.createPermitAttachment(attachmentData);
      console.log(`Attachment created successfully for permit ${permitId}:`, attachment.id);
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res.status(500).json({ message: "Failed to upload attachment" });
    }
  });

  app.get("/api/attachments/:id/download", async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id);
      const attachment = await storage.getAttachmentById(attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      const filePath = attachment.filePath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ message: "Failed to download attachment" });
    }
  });

  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id);
      const attachment = await storage.getAttachmentById(attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // Delete file from disk
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }

      // Delete from database
      const deleted = await storage.deletePermitAttachment(attachmentId);
      
      if (deleted) {
        res.json({ message: "Attachment deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete attachment" });
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // Serve documentation file as raw markdown
  app.get("/api/documentation/n8n-integration", (req, res) => {
    const filePath = "n8n-ai-agent-integration.md";
    
    fs.readFile(filePath, 'utf8', (err: any, data: string) => {
      if (err) {
        console.error('Error reading documentation file:', err);
        return res.status(404).json({ message: "Documentation not found" });
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="n8n-ai-agent-integration.md"');
      res.send(data);
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
