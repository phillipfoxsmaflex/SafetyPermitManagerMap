import { db } from "./db";
import { users, permits, workLocations, notifications } from "@shared/schema";

async function seedFresh() {
  try {
    console.log("Seeding database with fresh test data...");
    
    // Create comprehensive user base
    const testUsers = [
      {
        username: "admin",
        password: "password123",
        fullName: "System Administrator",
        department: "IT",
        role: "admin"
      },
      {
        username: "safety.weber",
        password: "password123",
        fullName: "Dr. Sarah Weber",
        department: "Arbeitssicherheit",
        role: "safety_officer"
      },
      {
        username: "ops.schmidt",
        password: "password123",
        fullName: "Michael Schmidt",
        department: "Operations",
        role: "operations_manager"
      },
      {
        username: "maint.mueller",
        password: "password123",
        fullName: "Hans Mueller",
        department: "Instandhaltung",
        role: "maintenance_supervisor"
      },
      {
        username: "prod.schneider",
        password: "password123",
        fullName: "Maria Schneider",
        department: "Produktion",
        role: "supervisor"
      },
      {
        username: "tech.bauer",
        password: "password123",
        fullName: "Thomas Bauer",
        department: "Technik",
        role: "technician"
      },
      {
        username: "engineer.wagner",
        password: "password123",
        fullName: "Anna Wagner",
        department: "Engineering",
        role: "engineer"
      },
      {
        username: "qa.fischer",
        password: "password123",
        fullName: "Robert Fischer",
        department: "Qualitätssicherung",
        role: "qa_specialist"
      }
    ];

    const insertedUsers = await db.insert(users).values(testUsers).returning();
    console.log(`Created ${insertedUsers.length} users`);

    // Create work locations
    const locations = [
      {
        name: "Produktionshalle A",
        description: "Hauptproduktionshalle für chemische Verfahren",
        building: "Gebäude 1",
        area: "Zone A1-A3",
        isActive: true
      },
      {
        name: "Produktionshalle B",
        description: "Sekundärproduktion und Verpackung",
        building: "Gebäude 2",
        area: "Zone B1-B2",
        isActive: true
      },
      {
        name: "Tankfarm Nord",
        description: "Rohstofflagerung und Zwischentanks",
        building: "Außenbereich",
        area: "Nord-Sektor",
        isActive: true
      },
      {
        name: "Werkstatt",
        description: "Mechanische Werkstatt und Reparaturen",
        building: "Gebäude 3",
        area: "Erdgeschoss",
        isActive: true
      },
      {
        name: "Labor",
        description: "Analytisches Labor und QK",
        building: "Gebäude 4",
        area: "1. OG",
        isActive: true
      }
    ];

    const insertedLocations = await db.insert(workLocations).values(locations).returning();
    console.log(`Created ${insertedLocations.length} work locations`);

    // Create sample permits with realistic data
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const samplePermits = [
      {
        permitId: "HW-2025-001",
        type: "hot_work",
        location: "Produktionshalle A - Reaktor 3",
        description: "Schweißarbeiten an der Rohrleitungsinstallation für Reaktor 3. Austausch defekter Flanschverbindungen.",
        requestorName: "Thomas Bauer",
        department: "Instandhaltung",
        contactNumber: "+49 30 123-4567",
        emergencyContact: "+49 30 123-9999",
        startDate: today,
        endDate: tomorrow,
        status: "pending",
        riskLevel: "high",
        safetyOfficer: "Dr. Sarah Weber",
        departmentHead: "Michael Schmidt",
        maintenanceApprover: "Hans Mueller",
        identifiedHazards: "Brandgefahr durch Schweißarbeiten, heiße Oberflächen, Schweißrauch",
        additionalComments: "Feuerwache während der gesamten Arbeitszeit erforderlich. Arbeitsbereich freizumachen.",
        selectedHazards: ["2-0", "3-1", "6-2"],
        hazardNotes: '{"2-0":"Schweißfunken können Brand verursachen","3-1":"Giftige Dämpfe durch erhitzte Rohrleitungsreste","6-2":"Verbrennungsgefahr an heißen Metalloberflächen"}',
        completedMeasures: []
      },
      {
        permitId: "CS-2025-001",
        type: "confined_space",
        location: "Tankfarm Nord - Tank 7",
        description: "Inspektion und Reinigung des Lagertanks 7. Überprüfung der Innenwände auf Korrosion.",
        requestorName: "Maria Schneider",
        department: "Produktion",
        contactNumber: "+49 30 123-5678",
        emergencyContact: "+49 30 123-9999",
        startDate: tomorrow,
        endDate: nextWeek,
        status: "approved",
        riskLevel: "high",
        safetyOfficer: "Dr. Sarah Weber",
        departmentHead: "Michael Schmidt",
        maintenanceApprover: "Hans Mueller",
        identifiedHazards: "Sauerstoffmangel, giftige Gase, Absturzgefahr",
        additionalComments: "Atemschutzgeräte erforderlich. Kontinuierliche Gasmessung. Rettungsteam in Bereitschaft.",
        selectedHazards: ["3-0", "3-1", "1-4"],
        hazardNotes: '{"3-0":"Sauerstoffgehalt vor Einstieg messen","3-1":"Restgase aus vorheriger Lagerung","1-4":"Rutschgefahr auf feuchten Tankböden"}',
        completedMeasures: ["3-0", "3-1"],
        departmentHeadApproval: true,
        departmentHeadApprovalDate: new Date(),
        maintenanceApproval: true,
        maintenanceApprovalDate: new Date(),
        safetyOfficerApproval: true,
        safetyOfficerApprovalDate: new Date()
      },
      {
        permitId: "EL-2025-001",
        type: "electrical",
        location: "Werkstatt - Hauptverteilung",
        description: "Wartung der Hauptverteilung und Austausch von Sicherungen in Schaltschrank 3.",
        requestorName: "Anna Wagner",
        department: "Engineering",
        contactNumber: "+49 30 123-6789",
        emergencyContact: "+49 30 123-9999",
        startDate: today,
        endDate: today,
        status: "active",
        riskLevel: "medium",
        safetyOfficer: "Dr. Sarah Weber",
        departmentHead: "Michael Schmidt",
        maintenanceApprover: "Hans Mueller",
        identifiedHazards: "Stromschlag, Lichtbogenbildung, elektrische Felder",
        additionalComments: "Freischaltung erforderlich. Spannungsfreiheit prüfen. Isolierte Werkzeuge verwenden.",
        selectedHazards: ["2-0", "2-1"],
        hazardNotes: '{"2-0":"400V Spannung - lebensgefährlich","2-1":"Kurzschlussgefahr bei Arbeiten"}',
        completedMeasures: ["2-0"],
        departmentHeadApproval: true,
        departmentHeadApprovalDate: new Date(),
        maintenanceApproval: true,
        maintenanceApprovalDate: new Date(),
        safetyOfficerApproval: true,
        safetyOfficerApprovalDate: new Date()
      },
      {
        permitId: "CH-2025-001",
        type: "chemical",
        location: "Labor - Abzug 5",
        description: "Analytische Untersuchungen mit konzentrierten Säuren. Aufschluss von Materialproben.",
        requestorName: "Robert Fischer",
        department: "Qualitätssicherung",
        contactNumber: "+49 30 123-7890",
        emergencyContact: "+49 30 123-9999",
        startDate: tomorrow,
        endDate: nextWeek,
        status: "draft",
        riskLevel: "medium",
        safetyOfficer: "",
        departmentHead: "",
        maintenanceApprover: "",
        identifiedHazards: "Verätzungen, giftige Dämpfe, chemische Reaktionen",
        additionalComments: "Abzug mit ausreichender Absaugleistung prüfen. Augenduschen bereithalten.",
        selectedHazards: ["3-0", "3-1", "3-2"],
        hazardNotes: '{"3-0":"Hautkontakt mit Säuren vermeiden","3-1":"Dämpfe nicht einatmen","3-2":"Spritzgefahr beim Pipettieren"}',
        completedMeasures: []
      },
      {
        permitId: "HT-2025-001",
        type: "height",
        location: "Produktionshalle B - Dach",
        description: "Reparatur der Dachentwässerung und Überprüfung der Dachbefestigungen.",
        requestorName: "Hans Mueller",
        department: "Instandhaltung",
        contactNumber: "+49 30 123-4567",
        emergencyContact: "+49 30 123-9999",
        startDate: nextWeek,
        endDate: nextWeek,
        status: "pending",
        riskLevel: "high",
        safetyOfficer: "Dr. Sarah Weber",
        departmentHead: "Michael Schmidt",
        maintenanceApprover: "Hans Mueller",
        identifiedHazards: "Absturzgefahr, rutschige Oberflächen, Witterungseinflüsse",
        additionalComments: "Auffanggurt und Sicherungsseil erforderlich. Nur bei trockener Witterung arbeiten.",
        selectedHazards: ["1-4", "7-1"],
        hazardNotes: '{"1-4":"15m Absturzhöhe - lebensgefährlich","7-1":"Rutschgefahr bei feuchtem Dach"}',
        completedMeasures: []
      }
    ];

    const insertedPermits = await db.insert(permits).values(samplePermits).returning();
    console.log(`Created ${insertedPermits.length} permits`);

    // Create sample notifications
    const sampleNotifications = [
      {
        userId: insertedUsers.find(u => u.username === "safety.weber")?.id || 1,
        title: "Neue Genehmigung zur Prüfung",
        message: "Heißarbeiten HW-2025-001 benötigt Ihre Sicherheitsfreigabe",
        type: "approval_request",
        isRead: false
      },
      {
        userId: insertedUsers.find(u => u.username === "ops.schmidt")?.id || 1,
        title: "Genehmigung genehmigt",
        message: "Engräume CS-2025-001 wurde vollständig genehmigt",
        type: "approval_granted",
        isRead: false
      }
    ];

    await db.insert(notifications).values(sampleNotifications);
    console.log("Created sample notifications");

    console.log("Database seeded successfully with fresh test data!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seedFresh().catch(console.error);