import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { insertPermitSchema, insertDraftPermitSchema, insertPermitAttachmentSchema } from "@shared/schema";
import { z } from "zod";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Complete TRBS data matching frontend source - all 11 categories with 48 hazards
function loadTRBSData() {
  const trbsData = {
    "title": "TRBS Gefährdungsbeurteilung - Vollständige Kategorien",
    "version": "2025",
    "categories": [
      {
        "id": "1",
        "category": "Mechanische Gefährdungen",
        "hazards": [
          {"hazard": "Quetschung durch bewegte Teile"},
          {"hazard": "Schneiden an scharfen Kanten"},
          {"hazard": "Stoß durch herunterfallende Gegenstände"},
          {"hazard": "Sturz durch ungesicherte Öffnungen"}
        ]
      },
      {
        "id": "2",
        "category": "Elektrische Gefährdungen",
        "hazards": [
          {"hazard": "Stromschlag durch defekte Geräte"},
          {"hazard": "Lichtbogen bei Schalthandlungen"},
          {"hazard": "Statische Entladung"},
          {"hazard": "Induktive Kopplung"}
        ]
      },
      {
        "id": "3",
        "category": "Gefahrstoffe",
        "hazards": [
          {"hazard": "Hautkontakt mit Gefahrstoffen"},
          {"hazard": "Einatmen von Gefahrstoffen"},
          {"hazard": "Verschlucken von Gefahrstoffen"},
          {"hazard": "Hautkontakt mit unter Druck stehenden Flüssigkeiten"}
        ]
      },
      {
        "id": "4",
        "category": "Biologische Arbeitsstoffe",
        "hazards": [
          {"hazard": "Infektionsgefährdung"},
          {"hazard": "sensibilisierende Wirkung"},
          {"hazard": "toxische Wirkung"}
        ]
      },
      {
        "id": "5",
        "category": "Brand- und Explosionsgefährdungen",
        "hazards": [
          {"hazard": "brennbare Feststoffe, Flüssigkeiten, Gase"},
          {"hazard": "explosionsfähige Atmosphäre"},
          {"hazard": "Explosivstoffe"}
        ]
      },
      {
        "id": "6",
        "category": "Thermische Gefährdungen",
        "hazards": [
          {"hazard": "heiße Medien/Oberflächen"},
          {"hazard": "kalte Medien/Oberflächen"},
          {"hazard": "Brand, Explosion"}
        ]
      },
      {
        "id": "7",
        "category": "Gefährdungen durch spezielle physikalische Einwirkungen",
        "hazards": [
          {"hazard": "Lärm"},
          {"hazard": "Ultraschall, Infraschall"},
          {"hazard": "Ganzkörpervibrationen"},
          {"hazard": "Hand-Arm-Vibrationen"},
          {"hazard": "optische Strahlung"},
          {"hazard": "ionisierende Strahlung"},
          {"hazard": "elektromagnetische Felder"},
          {"hazard": "Unter- oder Überdruck"}
        ]
      },
      {
        "id": "8",
        "category": "Gefährdungen durch Arbeitsumgebungsbedingungen",
        "hazards": [
          {"hazard": "Klima (Hitze, Kälte)"},
          {"hazard": "unzureichende Beleuchtung"},
          {"hazard": "Lärm"},
          {"hazard": "unzureichende Verkehrswege"},
          {"hazard": "Sturz, Ausgleiten"},
          {"hazard": "unzureichende Flucht- und Rettungswege"}
        ]
      },
      {
        "id": "9",
        "category": "Physische Belastung/Arbeitsschwere",
        "hazards": [
          {"hazard": "schwere dynamische Arbeit"},
          {"hazard": "einseitige dynamische Arbeit"},
          {"hazard": "Haltungsarbeit/Zwangshaltungen"},
          {"hazard": "Fortbewegung/ungünstige Körperhaltung"},
          {"hazard": "Kombination körperlicher Belastungsfaktoren"}
        ]
      },
      {
        "id": "10",
        "category": "Psychische Faktoren",
        "hazards": [
          {"hazard": "unzureichend gestaltete Arbeitsaufgabe"},
          {"hazard": "unzureichend gestaltete Arbeitsorganisation"},
          {"hazard": "unzureichend gestaltete soziale Bedingungen"},
          {"hazard": "unzureichend gestaltete Arbeitsplatz- und Arbeitsumgebungsfaktoren"}
        ]
      },
      {
        "id": "11",
        "category": "Sonstige Gefährdungen",
        "hazards": [
          {"hazard": "durch Menschen (körperliche Gewalt)"},
          {"hazard": "durch Tiere"},
          {"hazard": "durch Pflanzen und pflanzliche Produkte"},
          {"hazard": "Absturz in/durch Behälter, Becken, Gruben"}
        ]
      }
    ]
  };

  console.log('Successfully loaded embedded TRBS data:', {
    categories: trbsData.categories.length,
    totalHazards: trbsData.categories.reduce((sum: number, cat: any) => sum + cat.hazards.length, 0)
  });
  
  return trbsData;
}

// Enhanced function to format complete TRBS assessment for webhook
function formatCompleteTRBSForWebhook(permit: any) {
  try {
    const trbsData = loadTRBSData();
    
    // Parse permit's hazard selections and notes
    const selectedHazardsList = permit.selectedHazards || [];
    let hazardNotesObj: Record<string, string> = {};
    
    try {
      hazardNotesObj = permit.hazardNotes ? JSON.parse(permit.hazardNotes) : {};
    } catch (parseError) {
      console.warn('Invalid JSON in permit hazardNotes:', permit.hazardNotes);
      hazardNotesObj = {};
    }
    
    // Build complete TRBS assessment with all categories and hazards
    const trbsAssessment = {
      categories: trbsData.categories.map((category: any) => {
        const categoryHazards = category.hazards.map((hazard: any, hazardIndex: number) => {
          const hazardId = `${category.id}-${hazardIndex}`;
          const isSelected = selectedHazardsList.includes(hazardId);
          
          return {
            hazardId,
            hazardDescription: hazard.hazard,
            isSelected,
            notes: hazardNotesObj[hazardId] || "",
            riskLevel: isSelected ? (hazardNotesObj[hazardId] ? "assessed" : "identified") : "not_applicable"
          };
        });
        
        const selectedCount = categoryHazards.filter(h => h.isSelected).length;
        
        return {
          categoryId: parseInt(category.id),
          categoryName: category.category,
          hazards: categoryHazards,
          totalHazards: categoryHazards.length,
          selectedCount,
          hasSelections: selectedCount > 0,
          completionRate: Math.round((selectedCount / categoryHazards.length) * 100)
        };
      }),
      
      // Summary statistics
      summary: {
        totalCategories: trbsData.categories.length,
        totalHazards: trbsData.categories.reduce((sum: number, cat: any) => sum + cat.hazards.length, 0),
        selectedHazards: selectedHazardsList.length,
        categoriesWithSelections: trbsData.categories.filter((cat: any) => 
          cat.hazards.some((_: any, idx: number) => selectedHazardsList.includes(`${cat.id}-${idx}`))
        ).length,
        overallRisk: permit.overallRisk || "not_assessed",
        assessmentComplete: selectedHazardsList.length > 0
      },
      
      // Additional safety data
      safetyMeasures: {
        identifiedHazards: permit.identifiedHazards || "",
        completedMeasures: permit.completedMeasures || [],
        immediateActions: permit.immediateActions || "",
        beforeWorkStarts: permit.beforeWorkStarts || "",
        preventiveMeasures: permit.preventiveMeasures || "",
        complianceNotes: permit.complianceNotes || ""
      }
    };
    
    console.log('Formatted complete TRBS assessment for webhook:', {
      totalCategories: trbsAssessment.categories.length,
      totalHazards: trbsAssessment.summary.totalHazards,
      selectedHazards: trbsAssessment.summary.selectedHazards,
      categoriesWithSelections: trbsAssessment.summary.categoriesWithSelections
    });
    
    return trbsAssessment;
  } catch (error) {
    console.error('Error formatting complete TRBS data for webhook:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint (no auth required)
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  // Authentication middleware (unified)
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      const sessionId = req.cookies?.sessionId;
      console.log('Auth middleware - sessionId:', sessionId);
      
      if (!sessionId) {
        console.log('Auth middleware - No session ID found');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = await storage.getSessionBySessionId(sessionId);
      if (!session) {
        console.log('Auth middleware - No valid session found in database');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Check if session has expired
      if (session.expiresAt < new Date()) {
        console.log('Auth middleware - Session expired');
        await storage.deleteSession(sessionId);
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        console.log('Auth middleware - User not found in database');
        await storage.deleteSession(sessionId);
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      console.log('Auth middleware - successful for user:', user.username);
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: "Not authenticated" });
    }
  };
  
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

  // Separate multer configuration for icon uploads (uses memory storage)
  const iconUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit for icons
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files for icons
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for icons'));
      }
    }
  });
  
  // Get permit statistics (must come before /api/permits/:id)
  app.get("/api/permits/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getPermitStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit statistics" });
    }
  });

  // Get permits by status (must come before /api/permits/:id)
  app.get("/api/permits/status/:status", requireAuth, async (req, res) => {
    try {
      const status = req.params.status;
      const permits = await storage.getPermitsByStatus(status);
      res.json(permits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits by status" });
    }
  });

  // Get permits for map (must come before /api/permits/:id)
  app.get("/api/permits/map", requireAuth, async (req, res) => {
    try {
      const permits = await storage.getPermitsForMap();
      res.json(permits);
    } catch (error) {
      log(`Error fetching permits for map: ${error}`);
      res.status(500).json({ message: "Failed to fetch permits for map" });
    }
  });

  // Get all permits
  app.get("/api/permits", requireAuth, async (req, res) => {
    try {
      const permits = await storage.getAllPermits();
      res.json(permits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits" });
    }
  });

  // Get permit by ID with resolved approver names
  app.get("/api/permits/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const permit = await storage.getPermit(id);
      
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      // Resolve approver names from IDs stored in departmentHead, safetyOfficer, maintenanceApprover fields
      let resolvedPermit = { ...permit };
      
      // Parse names from stored text fields and try to find matching user IDs
      if (permit.departmentHead) {
        const user = await storage.getUserByFullName(permit.departmentHead);
        if (user) resolvedPermit.departmentHeadId = user.id;
      }
      
      if (permit.safetyOfficer) {
        const user = await storage.getUserByFullName(permit.safetyOfficer);
        if (user) resolvedPermit.safetyOfficerId = user.id;
      }
      
      if (permit.maintenanceApprover) {
        const user = await storage.getUserByFullName(permit.maintenanceApprover);
        if (user) resolvedPermit.maintenanceApproverId = user.id;
      }
      
      res.json(resolvedPermit);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit" });
    }
  });

  // Create new permit
  app.post("/api/permits", requireAuth, async (req, res) => {
    try {
      console.log("Creating permit with data:", JSON.stringify(req.body, null, 2));
      
      // Validate and convert dates
      const processedData = { ...req.body };
      
      // Handle dates based on whether it's a draft
      const isDraft = processedData.status === "draft";
      
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
        processedData.startDate = isDraft ? undefined : null;
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
        processedData.endDate = isDraft ? undefined : null;
      }
      
      // Handle work started/completed dates
      if (processedData.workStartedAt === "" || processedData.workStartedAt === null) {
        delete processedData.workStartedAt;
      }
      if (processedData.workCompletedAt === "" || processedData.workCompletedAt === null) {
        delete processedData.workCompletedAt;
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
      
      // Use appropriate validation schema based on status
      const validationSchema = isDraft ? insertDraftPermitSchema : insertPermitSchema;
      const validatedData = validationSchema.parse(processedData);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      
      // Handle draft permits with proper defaults
      const permitData = {
        ...validatedData,
        type: validatedData.type || "",
        location: validatedData.location || "",
        description: validatedData.description || "",
        requestorName: validatedData.requestorName || "",
        department: validatedData.department || "",
        contactNumber: validatedData.contactNumber || "",
        emergencyContact: validatedData.emergencyContact || "",
        startDate: processedData.startDate || "",
        endDate: processedData.endDate || "",
        status: validatedData.status || "pending",
      };
      
      // Handle map position data
      if (validatedData.mapPosition) {
        try {
          console.log("Parsing map position:", validatedData.mapPosition);
          const position = JSON.parse(validatedData.mapPosition);
          if (position && typeof position.x === 'number' && typeof position.y === 'number') {
            console.log("Setting map position:", position.x, position.y);
            permitData.mapPositionX = position.x;
            permitData.mapPositionY = position.y;
          } else {
            console.log("Invalid position format:", position);
          }
        } catch (e) {
          console.log("Error parsing map position:", e);
        }
      } else if (validatedData.positionX !== undefined && validatedData.positionY !== undefined) {
        console.log("Setting map position from positionX/Y:", validatedData.positionX, validatedData.positionY);
        permitData.mapPositionX = validatedData.positionX;
        permitData.mapPositionY = validatedData.positionY;
      } else {
        console.log("No position data found in validatedData:", { 
          mapPosition: validatedData.mapPosition, 
          positionX: validatedData.positionX, 
          positionY: validatedData.positionY 
        });
      }
      
      const permit = await storage.createPermit(permitData as any);
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
  app.patch("/api/permits/:id", requireAuth, async (req, res) => {
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
      
      // Handle map position data in updates
      if (updates.mapPosition) {
        try {
          console.log("Parsing map position for update:", updates.mapPosition);
          const position = JSON.parse(updates.mapPosition);
          if (position && typeof position.x === 'number' && typeof position.y === 'number') {
            console.log("Setting map position for update:", position.x, position.y);
            updates.mapPositionX = position.x;
            updates.mapPositionY = position.y;
          } else {
            console.log("Invalid position format for update:", position);
          }
          delete updates.mapPosition; // Remove the JSON string field
        } catch (e) {
          console.log("Error parsing map position for update:", e);
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
      
      if (updates.startDate && updates.endDate && updates.startDate.getTime() > updates.endDate.getTime()) {
        validationErrors.push("Das Enddatum darf nicht vor dem Startdatum liegen");
      }
      
      if (!updates.location?.trim() && updates.status !== 'draft') {
        validationErrors.push("Arbeitsort ist erforderlich");
      }
      
      if (!updates.description?.trim() && updates.status !== 'draft') {
        validationErrors.push("Beschreibung ist erforderlich");
      }
      
      if (!updates.requestorName?.trim() && updates.status !== 'draft') {
        validationErrors.push("Name des Antragstellers ist erforderlich");
      }
      
      if (!updates.department?.trim() && updates.status !== 'draft') {
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

  // Delete permit and all associated data (admin only)
  app.delete("/api/permits/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user is admin
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = await storage.getSessionBySessionId(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      console.log(`Admin ${user.username} requesting deletion of permit ${id}`);
      
      // Delete permit and all associated data
      const deleted = await storage.deletePermit(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      console.log(`Successfully deleted permit ${id} and all associated data`);
      res.json({ message: "Genehmigung und alle zugehörigen Daten wurden erfolgreich gelöscht" });
    } catch (error) {
      console.error("Error deleting permit:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Genehmigung" });
    }
  });

  // Workflow action endpoint
  app.post("/api/permits/:id/workflow", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const { action, nextStatus, comment } = req.body;
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = await storage.getSessionBySessionId(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const userId = session.userId;

      if (isNaN(permitId)) {
        return res.status(400).json({ message: "Invalid permit ID" });
      }

      if (!action || !nextStatus) {
        return res.status(400).json({ message: "Action and nextStatus are required" });
      }

      // Get current permit to validate transition
      const currentPermit = await storage.getPermit(permitId);
      if (!currentPermit) {
        return res.status(404).json({ message: "Permit not found" });
      }

      // Validate status transition based on action
      const validTransitions: Record<string, string[]> = {
        submit: ['draft'],
        withdraw: ['pending', 'approved'],
        approve: ['pending'],
        activate: ['approved'],
        complete: ['active'],
        reject: ['pending'],
        suspend: ['active']
      };

      console.log(`Workflow validation: action=${action}, currentStatus=${currentPermit.status}, nextStatus=${nextStatus}`);

      if (!validTransitions[action] || !validTransitions[action].includes(currentPermit.status)) {
        console.error(`Invalid transition: cannot ${action} from status ${currentPermit.status} to ${nextStatus}`);
        return res.status(400).json({ 
          message: `Invalid transition: cannot ${action} from status ${currentPermit.status} to ${nextStatus}` 
        });
      }

      // For approve action, handle individual approvals
      if (action === 'approve') {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(400).json({ message: "User not found" });
        }

        // Update specific approval based on user role and assignment
        const updates: Partial<any> = {};
        
        console.log(`Approval check for permit ${permitId}:`);
        console.log(`User: ${user.username}, Role: ${user.role}`);
        console.log(`Department Head: ${currentPermit.departmentHead}`);
        console.log(`Safety Officer: ${currentPermit.safetyOfficer}`);
        console.log(`Maintenance Approver: ${currentPermit.maintenanceApprover}`);
        
        // Check specific assignment first, then fall back to role-based approval
        if (currentPermit.departmentHead === user.fullName) {
          console.log('Setting department head approval by name match');
          updates.departmentHeadApproval = true;
          updates.departmentHeadApprovalDate = new Date();
        } else if (currentPermit.safetyOfficer === user.fullName) {
          console.log('Setting safety officer approval by name match');
          updates.safetyOfficerApproval = true;
          updates.safetyOfficerApprovalDate = new Date();
        } else if (currentPermit.maintenanceApprover === user.fullName) {
          console.log('Setting maintenance approval by name match');
          updates.maintenanceApproval = true;
          updates.maintenanceApprovalDate = new Date();
        } else if (user.role === 'department_head' && 
                   (!currentPermit.departmentHead || currentPermit.departmentHead === '') && 
                   !currentPermit.departmentHeadApproval) {
          // Department head can approve based on role if no specific department head is assigned
          updates.departmentHeadApproval = true;
          updates.departmentHeadApprovalDate = new Date();
        } else if (user.role === 'maintenance' && 
                   (!currentPermit.maintenanceApprover || currentPermit.maintenanceApprover === '') && 
                   !currentPermit.maintenanceApproval) {
          // Maintenance user can approve based on role if no specific maintenance approver is assigned
          console.log('Setting maintenance approval by role');
          updates.maintenanceApproval = true;
          updates.maintenanceApprovalDate = new Date();
        } else if (user.role === 'safety_officer' && 
                   (!currentPermit.safetyOfficer || currentPermit.safetyOfficer === '') && 
                   !currentPermit.safetyOfficerApproval) {
          // Safety officer can approve based on role if no specific safety officer is assigned
          console.log('Setting safety officer approval by role');
          updates.safetyOfficerApproval = true;
          updates.safetyOfficerApprovalDate = new Date();
        } else if (user.role === 'admin') {
          // Admin can approve any role that hasn't been approved yet
          if (!currentPermit.departmentHeadApproval) {
            updates.departmentHeadApproval = true;
            updates.departmentHeadApprovalDate = new Date();
          }
          if (!currentPermit.maintenanceApproval) {
            updates.maintenanceApproval = true;
            updates.maintenanceApprovalDate = new Date();
          }
          if (currentPermit.safetyOfficer && !currentPermit.safetyOfficerApproval) {
            updates.safetyOfficerApproval = true;
            updates.safetyOfficerApprovalDate = new Date();
          }
          // If no specific approvals are needed, admin still gets access
          if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "All required approvals already granted" });
          }
        } else {
          return res.status(403).json({ message: "Not authorized to approve this permit" });
        }

        // Update individual approvals first
        console.log('Updates to apply:', updates);
        const updateResult = await storage.updatePermit(permitId, updates);
        console.log('Update result:', updateResult);
        
        // Check if all required approvals are received
        const updatedPermit = await storage.getPermit(permitId);
        const requiredApprovals = updatedPermit?.departmentHeadApproval && updatedPermit?.maintenanceApproval;
        const optionalSafetyApproval = !updatedPermit?.safetyOfficer || updatedPermit?.safetyOfficerApproval;
        const allApproved = requiredApprovals && optionalSafetyApproval;
        
        if (allApproved) {
          // Move to approved status
          const finalPermit = await storage.updatePermitStatus(permitId, 'approved', userId, comment);
          res.json(finalPermit);
        } else {
          // Stay in pending, just record the individual approval
          await storage.addStatusHistoryEntry(permitId, 'pending', userId, `Teilgenehmigung erteilt: ${Object.keys(updates).join(', ')}`);
          const permit = await storage.getPermit(permitId);
          res.json(permit);
        }
      } else {
        // Handle other workflow actions
        console.log(`Executing workflow action: ${action} -> ${nextStatus} for permit ${permitId}`);
        
        // Special handling for withdraw action - reset all approvals
        if (action === 'withdraw' && nextStatus === 'draft') {
          console.log(`Withdrawing permit ${permitId} to draft - resetting all approvals`);
          
          // Reset all approval fields
          const resetData = {
            status: 'draft',
            departmentHeadApproval: false,
            departmentHeadApprovalDate: null,
            safetyOfficerApproval: false,
            safetyOfficerApprovalDate: null,
            maintenanceApproval: false,
            maintenanceApprovalDate: null,
            updatedAt: new Date()
          };
          
          const updatedPermit = await storage.updatePermit(permitId, resetData);
          
          if (!updatedPermit) {
            console.error(`Failed to withdraw permit ${permitId} to draft`);
            return res.status(500).json({ message: "Failed to withdraw permit to draft" });
          }
          
          // Add status history entry
          await storage.addStatusHistoryEntry(permitId, 'draft', userId, comment || 'Genehmigung zurückgezogen - alle Freigaben zurückgesetzt');
          
          console.log(`Successfully withdrew permit ${permitId} to draft and reset approvals`);
          res.json(updatedPermit);
        } else {
          // Regular status update
          const updatedPermit = await storage.updatePermitStatus(permitId, nextStatus, userId, comment);
          
          if (!updatedPermit) {
            console.error(`Failed to update permit ${permitId} status to ${nextStatus}`);
            return res.status(500).json({ message: "Failed to update permit status" });
          }
          
          console.log(`Successfully updated permit ${permitId} status to ${nextStatus}`);
          res.json(updatedPermit);
        }
      }
    } catch (error) {
      console.error("Error processing workflow action:", error);
      res.status(500).json({ message: "Failed to process workflow action" });
    }
  });

  // Approve permit
  app.post("/api/permits/:id/approve", requireAuth, async (req, res) => {
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
  app.post("/api/permits/:id/reject", requireAuth, async (req, res) => {
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
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread notification count" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
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

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if password is hashed (bcrypt) or plain text
      const isPasswordValid = user.password.startsWith('$2b$') 
        ? await storage.verifyPassword(password, user.password)
        : user.password === password;
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Clean up expired sessions first
      await storage.cleanupExpiredSessions();
      
      // Create session with proper expiration
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.createSession({
        sessionId,
        userId: user.id,
        expiresAt
      });
      
      // Set session cookie
      res.cookie('sessionId', sessionId, { 
        httpOnly: true, 
        secure: false, // In production, set to true with HTTPS
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      console.log('Created database session:', sessionId, 'for user:', user.username);
      
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
        // Get user from session before deleting it
        const session = await storage.getSessionBySessionId(sessionId);
        
        // Clean up AI suggestions for this user
        if (session) {
          await storage.cleanupSuggestionsForUser(session.userId);
        }
        
        await storage.deleteSession(sessionId);
      }
      res.clearCookie('sessionId');
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      console.log('Auth check - sessionId:', sessionId);
      
      if (!sessionId) {
        console.log('No session ID found');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = await storage.getSessionBySessionId(sessionId);
      if (!session) {
        console.log('No valid session found in database');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Check if session has expired
      if (session.expiresAt < new Date()) {
        console.log('Session expired');
        
        // Clean up AI suggestions for expired session
        await storage.cleanupSuggestionsForUser(session.userId);
        
        await storage.deleteSession(sessionId);
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        console.log('User not found in database');
        await storage.deleteSession(sessionId);
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
  app.post("/api/users", requireAuth, async (req, res) => {
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

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
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

  app.patch("/api/users/:id/password", requireAuth, async (req, res) => {
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
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
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
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.patch("/api/users/:id/role", requireAuth, async (req, res) => {
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
  app.post("/api/permits/:id/analyze", requireAuth, async (req, res) => {
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
        
        // Complete TRBS safety assessment with all 11 categories and 48 hazards
        trbsAssessment: formatCompleteTRBSForWebhook(permit),
        
        // Work execution tracking
        performerSignature: permit.performerSignature,
        
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

      // Prepare webhook payload for POST request
      const webhookPayload = {
        action: 'analyze_permit',
        permitData: permitAnalysisData
      };

      console.log('Sending permit for AI analysis:', {
        permitId: permit.permitId,
        internalId: permit.id,
        webhookUrl: webhookConfig.webhookUrl,
        dataSize: JSON.stringify(webhookPayload).length
      });

      console.log('Permit data being sent:', JSON.stringify(permitAnalysisData, null, 2));

      // Send POST request to webhook with data in body
      const response = await fetch(webhookConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(120000) // 2 minute timeout for AI analysis
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
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        permitId: req.params.id
      });
      res.status(500).json({ 
        message: "Failed to send permit for analysis",
        error: error.message 
      });
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
            type: "hazard_identification",
            priority: "high",
            fieldName: "identifiedHazards",
            originalValue: "",
            suggestedValue: "Chemische Dämpfe, Sauerstoffmangel, Explosionsgefahr, Sturz in Behälter, heiße Oberflächen, toxische Substanzen",
            reasoning: "Vollständige Gefahrenidentifikation für Tankarbeiten basierend auf TRBS 2152-2 und DGUV Regel 113-004"
          },
          {
            type: "protective_measures",
            priority: "high", 
            fieldName: "completedMeasures",
            originalValue: [],
            suggestedValue: ["atmospheric_monitoring", "ventilation", "ppe_chemical", "emergency_procedures", "confined_space_entry", "gas_detector"],
            reasoning: "Standardschutzmaßnahmen für Arbeiten in Behältern nach TRBS 2152 - Atmosphärenüberwachung, Belüftung und PSA sind zwingend erforderlich"
          },
          {
            type: "trbs_hazard_mapping",
            priority: "high",
            fieldName: "selectedHazards",
            originalValue: [],
            suggestedValue: ["5-0", "5-1", "4-0", "7-1"],
            reasoning: "Zuordnung zu TRBS-Gefährdungskategorien: Gefährdungen durch Gefahrstoffe (5-0, 5-1), Brand-/Explosionsgefährdungen (4-0), und besondere physikalische Einwirkungen (7-1)"
          },
          {
            type: "safety_notes_enhancement",
            priority: "medium",
            fieldName: "additionalComments",
            originalValue: "",
            suggestedValue: "Kontinuierliche Atmosphärenüberwachung während der gesamten Arbeitszeit. Rettungsmannschaft in Bereitschaft. Kommunikationsverbindung nach außen sicherstellen. Arbeitsbereich vor Betreten freimessen.",
            reasoning: "Spezifische Sicherheitsanweisungen für Behälterarbeiten zur Gewährleistung der Personensicherheit"
          },
          {
            type: "hazard_notes_structure",
            priority: "medium",
            fieldName: "hazardNotes",
            originalValue: "{}",
            suggestedValue: "{\"5-0\": \"Exposition gegenüber chemischen Dämpfen - kontinuierliche Überwachung erforderlich\", \"5-1\": \"Sauerstoffmangel durch Verdrängung - Atemschutz obligatorisch\", \"4-0\": \"Explosionsgefahr durch Gasansammlung - Ex-Schutz beachten\", \"7-1\": \"Absturzgefahr bei Behältereinstieg - Sicherungsmaßnahmen\"}",
            reasoning: "Strukturierte Dokumentation der Gefährdungsbeurteilung mit spezifischen Schutzmaßnahmen je Gefährdungskategorie"
          }
        ],
        recommendations: {
          immediate_actions: [
            "Sofortige Atmosphärenprüfung vor Betreten des Behälters durchführen",
            "Persönliche Schutzausrüstung (Atemschutz, Schutzanzug) anlegen",
            "Notfallausrüstung und Erste-Hilfe-Material bereitstellen"
          ],
          before_work_starts: [
            "Behälter ordnungsgemäß entleeren und reinigen",
            "Belüftungssystem installieren und Funktionsprüfung durchführen",
            "Kommunikationsverbindung nach außen etablieren",
            "Rettungsmannschaft in Bereitschaft versetzen"
          ],
          compliance_requirements: [
            "TRBS 2152-2: Vermeidung oder Schutz vor Gefährdungen in Behältern und engen Räumen",
            "TRGS 900: Arbeitsplatzgrenzwerte - kontinuierliche Überwachung erforderlich",
            "DGUV Regel 113-004: Behälter, Silos und enge Räume - Sicherheitskonzept beachten"
          ]
        }
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

  // Preview AI analysis for form data (Create Modal)
  app.post("/api/analyze/preview", requireAuth, async (req, res) => {
    try {
      console.log('Preview AI analysis request:', req.body);
      
      const {
        type,
        description,
        location,
        department,
        selectedHazards,
        hazardNotes,
        identifiedHazards,
        immediateActions,
        beforeWorkStarts,
        complianceNotes,
        overallRisk
      } = req.body;

      // Create mock analysis response based on form data
      const mockAnalysis = {
        suggestions: Math.floor(Math.random() * 8) + 3, // 3-10 suggestions
        riskLevel: overallRisk || 'medium',
        improvements: [
          'Gefährdungsbeurteilung vervollständigen',
          'Zusätzliche Sicherheitsmaßnahmen erforderlich',
          'Dokumentation nach TRBS-Standards ergänzen'
        ],
        message: `Analyse für ${type}-Genehmigung abgeschlossen`
      };

      res.json(mockAnalysis);
    } catch (error) {
      console.error("Error in preview analysis:", error);
      res.status(500).json({ message: "Failed to analyze form data" });
    }
  });

  // Receive AI suggestions from webhook - supports both formats
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
        error,
        improvedPermit // New: Complete permit object with AI improvements
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

      // Find permit by permitId (string)
      const permit = await storage.getPermitByPermitId(permitId);
      if (!permit) {
        console.error('Permit not found:', permitId);
        return res.status(404).json({ message: "Permit not found" });
      }

      const createdSuggestions = [];

      // NEW: Process complete improved permit object if provided
      if (improvedPermit) {
        console.log(`Processing complete improved permit for ${permitId}`);
        console.log('Original permit data sample:', {
          description: permit.description,
          emergencyContact: permit.emergencyContact,
          performerName: permit.performerName,
          selectedHazards: permit.selectedHazards
        });
        console.log('Improved permit selectedHazards:', improvedPermit.selectedHazards);
        console.log('Improved permit hazardNotes type:', typeof improvedPermit.hazardNotes);
        console.log('Improved permit hazardNotes value:', improvedPermit.hazardNotes);
        
        // PRIORITY: Check for hazardNotes first before processing other fields
        if (improvedPermit.hazardNotes && typeof improvedPermit.hazardNotes === 'object') {
          console.log('Processing hazardNotes as structured object:', improvedPermit.hazardNotes);
          
          const improvedNotesStr = JSON.stringify(improvedPermit.hazardNotes);
          const originalNotesStr = permit.hazardNotes || '{}';
          
          console.log(`HazardNotes comparison: Original="${originalNotesStr}" vs Improved="${improvedNotesStr}"`);
          
          if (originalNotesStr !== improvedNotesStr) {
            console.log(`Creating hazardNotes suggestion with specific notes for each hazard`);
            const suggestion = await storage.createAiSuggestion({
              permitId: permit.id,
              suggestionType: 'hazard_notes_update',
              fieldName: 'hazardNotes', // Direct field mapping
              originalValue: originalNotesStr,
              suggestedValue: improvedNotesStr,
              reasoning: 'Spezifische KI-generierte Notizen für identifizierte Gefährdungen',
              priority: 'high',
              status: 'pending'
            });
            createdSuggestions.push(suggestion);
          }
        } else {
          console.log('HazardNotes check failed: exists=', !!improvedPermit.hazardNotes, 'type=', typeof improvedPermit.hazardNotes);
        }

        // Compare original vs improved permit and create suggestions for differences
        // Backend field names to Frontend field names mapping
        const fieldMappings = {
          // Basic fields - corrected mappings
          type: 'type',
          location: 'location', 
          description: 'workDescription',  // KI: description → Frontend: workDescription
          department: 'department',
          requestorName: 'requestedBy',    // KI: requestorName → Frontend: requestedBy
          contactNumber: 'contactNumber',   // Keep as is - will be handled in form
          emergencyContact: 'emergencyContact',
          performerName: 'performerName',
          
          // Safety fields - KORRIGIERTE FRONTEND-BACKEND MAPPINGS
          identifiedHazards: 'identifiedHazards',
          additionalComments: 'additionalComments',
          immediateActions: 'immediateActions',
          beforeWorkStarts: 'preventiveMeasures',  // KORREKTUR: beforeWorkStarts → Frontend: preventiveMeasures
          complianceNotes: 'complianceNotes',
          overallRisk: 'overallRisk',
          
          // TRBS fields - special handling required
          selectedHazards: 'selectedHazards',
          hazardNotes: 'hazardNotes'
        };

        // Compare each field and create suggestions for differences
        for (const [backendFieldName, frontendFieldName] of Object.entries(fieldMappings)) {
          const originalValue = permit[backendFieldName as keyof typeof permit];
          const improvedValue = improvedPermit[backendFieldName];
          
          // Handle different data types
          let originalStr = '';
          let improvedStr = '';
          
          if (backendFieldName === 'selectedHazards') {
            // Handle selectedHazards with proper processing of complex objects
            console.log(`selectedHazards check: isArray=${Array.isArray(improvedValue)}, length=${improvedValue?.length}, firstItemType=${typeof improvedValue?.[0]}, hasHazardId=${!!improvedValue?.[0]?.hazardId}`);
            
            if (Array.isArray(improvedValue) && improvedValue.length > 0 && 
                typeof improvedValue[0] === 'object' && improvedValue[0].hazardId) {
              // New format: array of objects with hazardId, description, notes
              // SONDERFALL: Komplettaustausch - nur ausgewählte Hazards übernehmen
              const selectedIds = improvedValue.filter(h => h.isSelected).map(h => h.hazardId);
              const hazardNotesObj = {};
              improvedValue.forEach(h => {
                if (h.isSelected && h.notes) {
                  hazardNotesObj[h.hazardId] = h.notes;
                }
              });
              
              // Create separate suggestions for selectedHazards (IDs only) and hazardNotes
              originalStr = Array.isArray(originalValue) ? JSON.stringify(originalValue) : '[]';
              improvedStr = JSON.stringify(selectedIds);
              
              console.log(`Processing selectedHazards: Original IDs: ${originalStr}, Improved IDs: ${improvedStr}`);
              
              // Also create a suggestion for hazardNotes if there are notes
              if (Object.keys(hazardNotesObj).length > 0) {
                const originalNotes = permit.hazardNotes || '{}';
                const improvedNotes = JSON.stringify(hazardNotesObj);
                
                console.log(`Processing hazardNotes: Original: ${originalNotes}, Improved: ${improvedNotes}`);
                
                if (originalNotes !== improvedNotes) {
                  const notesSuggestion = await storage.createAiSuggestion({
                    permitId: permit.id,
                    suggestionType: 'hazard_replacement',  // Special type for complete replacement
                    fieldName: 'hazardNotes',
                    originalValue: originalNotes,
                    suggestedValue: improvedNotes,
                    reasoning: 'KI-Verbesserung für Gefährdungsnotizen aus detaillierter Analyse',
                    priority: 'medium',
                    status: 'pending'
                  });
                  createdSuggestions.push(notesSuggestion);
                  console.log(`Created hazardNotes suggestion with ${Object.keys(hazardNotesObj).length} notes`);
                }
              }
            } else {
              // Legacy format: simple array of IDs
              originalStr = Array.isArray(originalValue) ? JSON.stringify(originalValue) : '[]';
              improvedStr = Array.isArray(improvedValue) ? JSON.stringify(improvedValue) : '[]';
            }
          } else if (backendFieldName === 'hazardNotes') {
            // Handle hazardNotes as structured object with specific notes for each hazard
            if (typeof improvedValue === 'object' && improvedValue !== null) {
              console.log('Processing hazardNotes as structured object:', improvedValue);
              
              // Convert improved hazard notes to JSON string for comparison
              const improvedNotesStr = JSON.stringify(improvedValue);
              const originalNotesStr = permit.hazardNotes || '{}';
              
              console.log(`HazardNotes comparison: Original="${originalNotesStr}" vs Improved="${improvedNotesStr}"`);
              
              if (originalNotesStr !== improvedNotesStr) {
                console.log(`Creating hazardNotes suggestion with specific notes for each hazard`);
                const suggestion = await storage.createAiSuggestion({
                  permitId: permit.id,
                  suggestionType: 'hazard_notes_update',
                  fieldName: 'hazardNotes', // Direct field mapping
                  originalValue: originalNotesStr,
                  suggestedValue: improvedNotesStr,
                  reasoning: 'Spezifische KI-generierte Notizen für identifizierte Gefährdungen',
                  priority: 'high',
                  status: 'pending'
                });
                createdSuggestions.push(suggestion);
              }
              continue; // Skip standard processing
            }
          } else {
            originalStr = String(originalValue || '');
            improvedStr = String(improvedValue || '');
          }
          
          console.log(`Field ${backendFieldName}: "${originalStr}" vs "${improvedStr}" (different: ${originalStr !== improvedStr})`);
          
          // Create suggestion if values differ
          if (originalStr !== improvedStr && improvedStr.trim() !== '') {
            console.log(`Creating suggestion for ${backendFieldName}: ${originalStr} -> ${improvedStr}`);
            const suggestion = await storage.createAiSuggestion({
              permitId: permit.id,
              suggestionType: backendFieldName === 'selectedHazards' ? 'hazard_replacement' : 'ai_improvement',
              fieldName: frontendFieldName, // Use corrected frontend field name for proper mapping
              originalValue: originalStr,
              suggestedValue: improvedStr,
              reasoning: `KI-Verbesserung für ${frontendFieldName}`,
              priority: ['emergencyContact', 'selectedHazards', 'immediateActions'].includes(backendFieldName) ? 'high' : 'medium',
              status: 'pending'
            });
            createdSuggestions.push(suggestion);
          }
        }
        
        console.log(`Created ${createdSuggestions.length} field-based suggestions from improved permit`);
      }

      // LEGACY: Process individual suggestions array (backwards compatibility)
      if (suggestions && Array.isArray(suggestions)) {
        console.log(`Processing ${suggestions.length} individual AI suggestions for permit ${permitId}`);

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
      }

      // Log additional analysis data for monitoring
      if (riskAssessment) {
        console.log('Risk assessment for permit', permitId, ':', {
          overallRisk: riskAssessment.overallRisk,
          complianceScore: riskAssessment.complianceScore,
          riskFactors: riskAssessment.riskFactors?.length || 0
        });
      }

      // LEGACY: Create safety assessment suggestions from recommendations
      if (recommendations) {
        console.log('Creating safety assessment suggestions for permit', permitId);
        
        if (recommendations.immediate_actions) {
          const immediateActionsText = Array.isArray(recommendations.immediate_actions) 
            ? recommendations.immediate_actions.join('\n• ')
            : recommendations.immediate_actions;
          
          const suggestion = await storage.createAiSuggestion({
            permitId: permit.id,
            suggestionType: 'safety_assessment',
            fieldName: 'immediateActions',
            originalValue: permit.immediateActions || '',
            suggestedValue: '• ' + immediateActionsText,
            reasoning: 'AI-generierte Sofortmaßnahmen basierend auf Risikoanalyse',
            priority: 'high',
            status: 'pending'
          });
          createdSuggestions.push(suggestion);
        }

        if (recommendations.before_work_starts) {
          const beforeWorkText = Array.isArray(recommendations.before_work_starts)
            ? recommendations.before_work_starts.join('\n• ')
            : recommendations.before_work_starts;
          
          const suggestion = await storage.createAiSuggestion({
            permitId: permit.id,
            suggestionType: 'safety_assessment',
            fieldName: 'beforeWorkStarts',
            originalValue: permit.beforeWorkStarts || '',
            suggestedValue: '• ' + beforeWorkText,
            reasoning: 'AI-generierte Vorbereitungsmaßnahmen basierend auf Arbeitsanalyse',
            priority: 'high',
            status: 'pending'
          });
          createdSuggestions.push(suggestion);
        }

        if (recommendations.compliance_requirements || compliance_notes) {
          const complianceText = recommendations.compliance_requirements || compliance_notes;
          const complianceFormatted = Array.isArray(complianceText)
            ? complianceText.join('\n• ')
            : complianceText;
          
          const suggestion = await storage.createAiSuggestion({
            permitId: permit.id,
            suggestionType: 'safety_assessment',
            fieldName: 'complianceNotes',
            originalValue: permit.complianceNotes || '',
            suggestedValue: typeof complianceFormatted === 'string' ? complianceFormatted : '• ' + complianceFormatted,
            reasoning: 'AI-generierte Compliance-Hinweise basierend auf regulatorischen Anforderungen',
            priority: 'medium',
            status: 'pending'
          });
          createdSuggestions.push(suggestion);
        }
      }

      res.json({ 
        message: "AI suggestions received successfully",
        suggestionsCount: createdSuggestions.length,
        processingMethod: improvedPermit ? 'complete_permit_comparison' : 'individual_suggestions'
      });
    } catch (error) {
      console.error("Error receiving AI suggestions:", error);
      res.status(500).json({ message: "Failed to process AI suggestions" });
    }
  });

  // Get suggestions for a permit
  app.get("/api/permits/:id/suggestions", requireAuth, async (req, res) => {
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
  app.get("/api/suggestions/:id/apply", requireAuth, async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.id);
      console.log(`Applying suggestion ${suggestionId} via GET`);
      
      if (isNaN(suggestionId)) {
        console.error("Invalid suggestion ID:", req.params.id);
        const redirectUrl = req.query.redirect || '/';
        return res.redirect(`${redirectUrl}?error=invalid_suggestion_id`);
      }
      
      const success = await storage.applySuggestion(suggestionId);
      console.log(`Apply suggestion result:`, success);
      
      if (!success) {
        console.error(`Failed to apply suggestion ${suggestionId}`);
        const redirectUrl = req.query.redirect || '/';
        return res.redirect(`${redirectUrl}?error=suggestion_not_found`);
      }

      console.log(`Successfully applied suggestion ${suggestionId}`);
      const redirectUrl = req.query.redirect || '/';
      res.redirect(`${redirectUrl}?success=suggestion_applied`);
    } catch (error) {
      console.error("Error applying suggestion:", error);
      const redirectUrl = req.query.redirect || '/';
      res.redirect(`${redirectUrl}?error=application_failed`);
    }
  });

  app.post("/api/suggestions/:id/apply", requireAuth, async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.id);
      console.log(`Applying suggestion ${suggestionId}`);
      
      if (isNaN(suggestionId)) {
        console.error("Invalid suggestion ID:", req.params.id);
        return res.status(400).json({ message: "Invalid suggestion ID" });
      }
      
      const success = await storage.applySuggestion(suggestionId);
      console.log(`Apply suggestion result:`, success);
      
      if (!success) {
        console.error(`Failed to apply suggestion ${suggestionId}`);
        return res.status(404).json({ message: "Suggestion not found or could not be applied" });
      }

      console.log(`Successfully applied suggestion ${suggestionId}`);
      
      // Handle form submissions with redirect
      if (req.body.redirect) {
        return res.redirect(req.body.redirect + '?success=suggestion_applied');
      }
      
      res.json({ 
        message: "Suggestion applied successfully",
        success: true 
      });
    } catch (error) {
      console.error("Error applying suggestion:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Error details:", {
        message: errorMessage,
        stack: errorStack,
        suggestionId: req.params.id
      });
      res.status(500).json({ 
        message: "Failed to apply suggestion",
        error: errorMessage || "Unknown error"
      });
    }
  });

  // Bulk apply all suggestions for a permit (GET for navigation)
  app.get("/api/permits/:id/suggestions/apply-all", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      console.log(`Applying all suggestions for permit ${permitId} via GET`);
      
      if (isNaN(permitId)) {
        console.error("Invalid permit ID:", req.params.id);
        const redirectUrl = req.query.redirect || '/';
        return res.redirect(`${redirectUrl}?error=invalid_permit_id`);
      }
      
      const appliedCount = await storage.applyAllSuggestions(permitId);
      console.log(`Applied ${appliedCount} suggestions for permit ${permitId}`);
      
      const redirectUrl = req.query.redirect || '/';
      res.redirect(`${redirectUrl}?success=all_suggestions_applied&count=${appliedCount}`);
    } catch (error) {
      console.error("Error applying all suggestions:", error);
      const redirectUrl = req.query.redirect || '/';
      res.redirect(`${redirectUrl}?error=apply_all_failed`);
    }
  });

  // Bulk apply all suggestions for a permit (POST for API calls)
  app.post("/api/permits/:id/suggestions/apply-all", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      console.log(`Applying all suggestions for permit ${permitId}`);
      
      if (isNaN(permitId)) {
        console.error("Invalid permit ID:", req.params.id);
        return res.status(400).json({ message: "Invalid permit ID" });
      }
      
      const appliedCount = await storage.applyAllSuggestions(permitId);
      console.log(`Applied ${appliedCount} suggestions for permit ${permitId}`);
      
      res.json({ 
        message: `${appliedCount} Vorschläge wurden erfolgreich übernommen`,
        appliedCount,
        success: true
      });
    } catch (error) {
      console.error("Error applying all suggestions:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Error details:", {
        message: errorMessage,
        stack: errorStack,
        permitId: req.params.id
      });
      res.status(500).json({ 
        message: "Failed to apply suggestions",
        error: errorMessage || "Unknown error"
      });
    }
  });

  // Bulk reject all suggestions for a permit
  app.post("/api/permits/:id/suggestions/reject-all", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const rejectedCount = await storage.rejectAllSuggestions(permitId);
      
      res.json({ 
        message: `${rejectedCount} Vorschläge wurden abgelehnt`,
        rejectedCount 
      });
    } catch (error) {
      console.error("Error rejecting all suggestions:", error);
      res.status(500).json({ message: "Failed to reject suggestions" });
    }
  });

  // Bulk delete all suggestions for a permit
  app.delete("/api/permits/:id/suggestions", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const deletedCount = await storage.deleteAllSuggestions(permitId);
      
      res.json({ 
        message: `${deletedCount} Vorschläge wurden gelöscht`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error deleting all suggestions:", error);
      res.status(500).json({ message: "Failed to delete suggestions" });
    }
  });

  // Update suggestion status
  app.patch("/api/suggestions/:id/status", requireAuth, async (req, res) => {
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
  app.get("/api/webhook-configs", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getAllWebhookConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching webhook configs:", error);
      res.status(500).json({ message: "Failed to fetch webhook configurations" });
    }
  });

  app.post("/api/webhook-configs", requireAuth, async (req, res) => {
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

  app.patch("/api/webhook-configs/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/webhook-configs/:id", requireAuth, async (req, res) => {
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

  app.get("/api/work-locations/active", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getActiveWorkLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching active work locations:", error);
      res.status(500).json({ message: "Failed to fetch active work locations" });
    }
  });

  app.post("/api/work-locations", requireAuth, async (req, res) => {
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

  app.patch("/api/work-locations/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/work-locations/:id", requireAuth, async (req, res) => {
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
  app.get("/api/users/department-heads", requireAuth, async (req, res) => {
    try {
      const users = await storage.getDepartmentHeads();
      res.json(users);
    } catch (error) {
      console.error("Error fetching department heads:", error);
      res.status(500).json({ message: "Failed to fetch department heads" });
    }
  });

  app.get("/api/users/safety-officers", requireAuth, async (req, res) => {
    try {
      const users = await storage.getSafetyOfficers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching safety officers:", error);
      res.status(500).json({ message: "Failed to fetch safety officers" });
    }
  });

  app.get("/api/users/maintenance-approvers", requireAuth, async (req, res) => {
    try {
      const users = await storage.getMaintenanceApprovers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching maintenance approvers:", error);
      res.status(500).json({ message: "Failed to fetch maintenance approvers" });
    }
  });

  app.get("/api/users/by-role/:role", requireAuth, async (req, res) => {
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
  app.get("/api/permits/:id/attachments", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const attachments = await storage.getPermitAttachments(permitId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/permits/:id/attachments", requireAuth, upload.single('file'), async (req, res) => {
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

  app.get("/api/attachments/:id/download", requireAuth, async (req, res) => {
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

  app.delete("/api/attachments/:id", requireAuth, async (req, res) => {
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

  // System Settings routes
  app.get("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || { applicationTitle: "Arbeitserlaubnis", headerIcon: null });
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.patch("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      const settings = await storage.updateSystemSettings(updates);
      res.json(settings);
    } catch (error) {
      console.error("Error updating system settings:", error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });

  app.post("/api/system-settings/upload-icon", requireAuth, iconUpload.single('icon'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      // Convert to base64
      const base64Icon = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Update system settings with new icon
      const settings = await storage.updateSystemSettings({ headerIcon: base64Icon });
      
      res.json({ 
        message: "Icon uploaded successfully",
        headerIcon: base64Icon,
        settings 
      });
    } catch (error) {
      console.error("Error uploading icon:", error);
      res.status(500).json({ message: "Failed to upload icon" });
    }
  });

  // Map Background routes
  app.get("/api/map-backgrounds", requireAuth, async (req, res) => {
    try {
      const backgrounds = await storage.getAllMapBackgrounds();
      res.json(backgrounds);
    } catch (error) {
      log(`Error fetching map backgrounds: ${error}`);
      res.status(500).json({ message: "Failed to fetch map backgrounds" });
    }
  });

  app.get("/api/map-backgrounds/active", requireAuth, async (req, res) => {
    try {
      const backgrounds = await storage.getActiveMapBackgrounds();
      res.json(backgrounds);
    } catch (error) {
      log(`Error fetching active map backgrounds: ${error}`);
      res.status(500).json({ message: "Failed to fetch active map backgrounds" });
    }
  });

  app.post("/api/map-backgrounds", requireAuth, iconUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      // Convert to base64
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const backgroundData = {
        name: req.body.name || "Unnamed Map",
        description: req.body.description || "",
        imagePath: base64Image,
        isActive: req.body.isActive === 'true' || true
      };

      const background = await storage.createMapBackground(backgroundData);
      res.json(background);
    } catch (error) {
      log(`Error creating map background: ${error}`);
      res.status(500).json({ message: "Failed to create map background" });
    }
  });

  app.patch("/api/map-backgrounds/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const background = await storage.updateMapBackground(id, req.body);
      if (!background) {
        return res.status(404).json({ message: "Map background not found" });
      }
      res.json(background);
    } catch (error) {
      log(`Error updating map background: ${error}`);
      res.status(500).json({ message: "Failed to update map background" });
    }
  });

  app.delete("/api/map-backgrounds/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMapBackground(id);
      if (!success) {
        return res.status(404).json({ message: "Map background not found" });
      }
      res.json({ message: "Map background deleted successfully" });
    } catch (error) {
      log(`Error deleting map background: ${error}`);
      res.status(500).json({ message: "Failed to delete map background" });
    }
  });

  // Map operations routes

  app.patch("/api/work-locations/:id/position", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { x, y } = req.body;
      const location = await storage.updateWorkLocationPosition(id, x, y);
      if (!location) {
        return res.status(404).json({ message: "Work location not found" });
      }
      res.json(location);
    } catch (error) {
      log(`Error updating work location position: ${error}`);
      res.status(500).json({ message: "Failed to update work location position" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
