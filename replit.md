# Biggs Permit Management System

## Overview
A cutting-edge digital permit management system designed to streamline safety workflows in industrial environments through advanced AI technologies and intelligent risk management.

## Project Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with secure cookie management
- **File Storage**: Multer for permit attachments
- **AI Integration**: TRBS hazard analysis and safety recommendations

### Frontend (React/TypeScript)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state
- **UI Components**: Radix UI with Tailwind CSS
- **Forms**: React Hook Form with Zod validation

### Database Schema
- **Core Tables**: users, permits, notifications, ai_suggestions
- **Features**: work_locations, templates, webhook_config, system_settings
- **Attachments**: permit_attachments with file storage
- **Sessions**: Secure session management

## Key Features

### Core Functionality
- Multi-role permit workflow (requestor → department head → safety officer → maintenance)
- Real-time AI hazard analysis based on complete TRBS standards
- Dynamic work location management
- Comprehensive permit attachments with AI analysis
- Print-ready permit documentation

### Advanced Features
- Customizable system branding (title, header icon)
- Multilingual support (German interface)
- Webhook integration for external systems
- Status tracking and workflow visualization
- Notification system for approvals and updates

## Recent Changes
- **2025-01-17**: Einheitliches Filter-System für Karten- und Listenansicht implementiert ✅
  - Dashboard-Header-Filter entfernt (Suche, Von Datum, Bis Datum)
  - Gleiche 5-Spalten-Filter-Layout für beide Ansichten: Suche, Status, Typ, Von Datum, Bis Datum
  - Zentrale Status-Konfiguration in Dashboard-Filter integriert
  - Reset-Button für alle Filter in beiden Ansichten
  - Filter-Karte in Listenansicht mit einheitlichem Layout
  - Kartenfilter und Listenfilter verwenden identische Logik
- **2025-01-17**: Dashboard-Bereinigung und Kartenlegende-Optimierung ✅
  - "Heute abgelaufen" Kachel vom Dashboard entfernt
  - Dashboard-Layout von 4 auf 3 Spalten reduziert (Aktiv, Ausstehend, Abgeschlossen)
  - "Abgelaufen" Status aus Kartenlegende und Statistiken entfernt
  - Genehmigungsseite zeigt nun alle 3 Genehmigungsebenen (Abteilungsleiter, Instandhaltung, Sicherheitsfachkraft)
  - Sicherheitsfachkraft-Status wird immer angezeigt: "Genehmigt", "Ausstehend" oder "Nicht zugewiesen"
  - Status-Konfiguration in utils/status-config.ts bereinigt
- **2025-01-17**: Einheitliche Status-Konfiguration für alle Ansichten implementiert ✅
  - Zentrale Status-Konfiguration in utils/status-config.ts erstellt
  - Alle Status-Farben und -Bezeichnungen zwischen Karten- und Listenansicht synchronisiert
  - Kartenlegende und Statistiken-Sektion verwenden einheitliche Konfiguration
  - Status-Bezeichnungen vereinheitlicht: "Aktiv", "Ausstehend", "Genehmigt", "Abgeschlossen"
  - permit-status-badge.tsx und map-widget.tsx nutzen zentrale Konfiguration
  - **BESTÄTIGT**: Alle Status-Anzeigen zeigen konsistente Farben und Labels
- **2025-01-10**: Frontend-Umbenennung "Sicherheitsbeauftragter" → "Sicherheitsfachkraft" ✅
  - Alle GUI-Texte in Frontend von "Sicherheitsbeauftragter" zu "Sicherheitsfachkraft" geändert
  - Betroffen: user-management.tsx, approvals.tsx, edit-permit-modal-unified.tsx, print-utils.ts, permissions.ts
  - Backend-Datenstrukturen unverändert (safety_officer, safetyOfficer etc.)
  - Dropdown-Optionen, Labels, Anzeige-Texte und Kommentare aktualisiert
- **2025-01-10**: AI-Suggestions Bug vollständig behoben ✅
  - Problem identifiziert: selectedHazards wurde als leeres Objekt {} statt Array [] in PostgreSQL gespeichert
  - Backend-Validierung für selectedHazards-Arrays in storage.ts verstärkt
  - Frontend State-Synchronisation zwischen AI-Suggestions und Edit-Modal verbessert
  - Automatische Query-Invalidierung und Refresh-Mechanismus implementiert
  - TRBS-Tab zeigt jetzt korrekt die von AI vorgeschlagenen Checkboxen und Notizen an
  - **BESTÄTIGT**: System funktioniert perfekt - alle Hazards und Notizen werden korrekt synchronisiert
- **2025-01-08**: Complete Docker deployment solution implemented and finalized
  - Fixed database configuration for Docker vs Neon environments
  - Implemented bcrypt password hashing for security
  - Created robust startup sequence with retry mechanisms
  - Added comprehensive error handling and logging
  - Solved database schema initialization issues
  - Verified login functionality with admin/password123 credentials
  - Cleaned up repository structure and removed obsolete files
  - **FINAL FIX**: Corrected docker-compose.yml reference from deleted Dockerfile.simple to Dockerfile
  - **FINAL FIX**: Fixed Docker entrypoint script usage in production build
  - **FINAL FIX**: Streamlined Docker build process with proper tsx runtime support
  - **FINAL FIX**: Updated deployment documentation with --build flag for fresh builds
  - **FINAL FIX**: Resolved tsx execution issues in container with direct node_modules/.bin/tsx paths
  - **FINAL FIX**: Implemented hybrid startup logic (built dist/index.js or tsx fallback)
- **2025-01-07**: Added Docker containerization setup
  - Created complete Docker Compose configuration
  - Added PostgreSQL database with health checks
  - Implemented proper startup sequence with database seeding
  - Added comprehensive deployment documentation
- **2025-01-07**: Fixed work location management UI issues
  - Resolved input field focus loss when typing
  - Fixed cache invalidation for work location dropdowns
  - Ensured newly created locations appear in permit edit modal
- **2025-01-07**: Enhanced system branding customization
  - Added file upload handling for header icons
  - Updated navigation and login pages with dynamic branding
  - Fixed multer configuration for memory storage

## User Preferences
- **Interface Language**: German (Deutsch)
- **System Focus**: Industrial safety compliance
- **Deployment**: Docker containerization preferred
- **UI/UX**: Clean, professional interface suitable for industrial environments

## Deployment

### Docker Deployment (Recommended)
```bash
docker-compose up -d
```

### Development Setup
```bash
npm install
npm run dev
```

### Database Operations
```bash
npm run db:push  # Push schema changes
tsx server/seed.ts  # Seed initial data
```

## Technical Stack
- **Runtime**: Node.js 20
- **Database**: PostgreSQL 15
- **Frontend Build**: Vite
- **Package Manager**: npm
- **Containerization**: Docker & Docker Compose

## Security Features
- Secure session management
- Role-based access control
- File upload validation
- CORS configuration
- Input sanitization and validation