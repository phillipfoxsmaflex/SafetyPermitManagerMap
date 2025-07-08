import { db } from "./db";
import { users, permits, systemSettings, workLocations, templates } from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("Seeding database...");
    
    // Create default users with hashed passwords
    const defaultUsers = [
      {
        username: "admin",
        password: await bcrypt.hash("password123", 10),
        fullName: "System Administrator",
        department: "IT",
        role: "admin"
      },
      {
        username: "hans.mueller",
        password: await bcrypt.hash("password123", 10),
        fullName: "Hans Mueller",
        department: "Operations",
        role: "supervisor"
      },
      {
        username: "safety.officer",
        password: await bcrypt.hash("password123", 10),
        fullName: "Dr. Sarah Weber",
        department: "Safety",
        role: "safety_officer"
      },
      {
        username: "ops.manager",
        password: await bcrypt.hash("password123", 10),
        fullName: "Michael Schmidt",
        department: "Operations",
        role: "operations_manager"
      },
      {
        username: "employee",
        password: await bcrypt.hash("password123", 10),
        fullName: "Thomas Bauer",
        department: "Maintenance",
        role: "employee"
      },
      {
        username: "supervisor",
        password: await bcrypt.hash("password123", 10),
        fullName: "Maria Schneider",
        department: "Production",
        role: "supervisor"
      }
    ];

    // Insert users
    for (const userData of defaultUsers) {
      await db.insert(users).values(userData).onConflictDoNothing();
    }
    
    // Create default system settings
    await db.insert(systemSettings).values({
      applicationTitle: "Arbeitserlaubnis",
      headerIcon: null
    }).onConflictDoNothing();
    
    // Create default work locations
    const defaultWorkLocations = [
      { name: "Produktionshalle A", description: "Hauptproduktionsbereich", isActive: true },
      { name: "Produktionshalle B", description: "Sekundäre Produktionsstätte", isActive: true },
      { name: "Lagerhalle", description: "Hauptlagerbereich", isActive: true },
      { name: "Chemikalienlager", description: "Gefahrstofflagerung", isActive: true },
      { name: "Außenbereich", description: "Externe Arbeitsplätze", isActive: true }
    ];
    
    for (const location of defaultWorkLocations) {
      await db.insert(workLocations).values(location).onConflictDoNothing();
    }

    // Create sample permits
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const samplePermits = [
      {
        permitId: "CS-2024-001",
        type: "confined_space",
        location: "Tank A-104",
        description: "Inspektion und Reinigung des Lagertanks für Chemikalien",
        requestorName: "Thomas Bauer",
        department: "Maintenance",
        contactNumber: "+49 30 12345678",
        emergencyContact: "+49 30 87654321",
        startDate: now,
        endDate: tomorrow,
        status: "pending",
        riskLevel: "high",
        safetyOfficer: "Dr. Sarah Weber",
        identifiedHazards: "Giftige Dämpfe, Sauerstoffmangel, enge Raumverhältnisse",
        additionalComments: "Vollständige Atmosphärenprüfung erforderlich vor Zutritt",
        atmosphereTest: true,
        ventilation: true,
        ppe: true,
        emergencyProcedures: true,
        fireWatch: false,
        isolationLockout: true,
        oxygenLevel: "20.9%",
        lelLevel: "0%",
        h2sLevel: "0 ppm",
        supervisorApproval: false,
        safetyOfficerApproval: false,
        operationsManagerApproval: false,
        createdAt: now,
        updatedAt: now
      },
      {
        permitId: "HW-2024-002",
        type: "hot_work",
        location: "Produktionshalle B",
        description: "Schweißarbeiten an der Rohrleitungsinstallation",
        requestorName: "Hans Mueller",
        department: "Operations",
        contactNumber: "+49 30 11223344",
        emergencyContact: "+49 30 44332211",
        startDate: tomorrow,
        endDate: nextWeek,
        status: "approved",
        riskLevel: "medium",
        safetyOfficer: "Dr. Sarah Weber",
        identifiedHazards: "Brandgefahr, heiße Oberflächen, Schweißrauch",
        additionalComments: "Feuerwache während der gesamten Arbeitszeit erforderlich",
        atmosphereTest: false,
        ventilation: true,
        ppe: true,
        emergencyProcedures: true,
        fireWatch: true,
        isolationLockout: true,
        supervisorApproval: true,
        safetyOfficerApproval: true,
        operationsManagerApproval: true,
        supervisorApprovalDate: now,
        safetyOfficerApprovalDate: now,
        operationsManagerApprovalDate: now,
        createdAt: now,
        updatedAt: now
      }
    ];

    // Insert sample permits
    for (const permitData of samplePermits) {
      await db.insert(permits).values(permitData).onConflictDoNothing();
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();