# Biggs - Digital Permit Management System

Ein umfassendes Arbeitserlaubnis-Management-System für die chemische Industrie mit AI-gestützter Sicherheitsanalyse und TRBS-konformer Gefährdungsbeurteilung.

## 🚀 Funktionen

### Permit Management
- **6 Permit-Typen**: Heißarbeiten, enge Räume, elektrische Arbeiten, Arbeiten in der Höhe, Chemikalienarbeiten, allgemeine Erlaubnisscheine
- **Vollständiger Workflow**: Entwurf → Genehmigung → Aktiv → Abgeschlossen
- **Rollenbasierte Genehmigungen**: Abteilungsleiter, Sicherheitsbeauftragte, Technik-Genehmiger
- **Dokumentenanhänge**: Datei-Uploads mit Metadaten und Downloadfunktion
- **Druckansicht**: Professionelle Arbeitserlaubnis-Ausgabe

### TRBS-konforme Sicherheitsbewertung
- **38 Gefährdungskategorien** nach TRBS 1112
- **Strukturierte Risikoanalyse** (Low/Medium/High/Critical)
- **Detaillierte Gefährdungsnotizen** mit strukturierter Speicherung
- **Schutzmaßnahmen-Tracking** mit vordefiniertem Katalog
- **Sicherheitsbewertungs-Felder**: Sofortmaßnahmen, Vorbereitung, Compliance

### AI-gestützte Verbesserungsvorschläge
- **Webhook-Integration** für externe AI-Services
- **Feldspezifische Suggestions** mit Begründung und Priorität
- **Manuelle Genehmigung** aller AI-Vorschläge
- **TRBS-Mapping** für automatische Gefährdungserkennung
- **Batch-Operationen**: Alle annehmen/ablehnen/löschen

### Benutzerverwaltung
- **5 Benutzerrollen**: Admin, Anforderer, Sicherheitsbeauftragte, Abteilungsleiter, Technik
- **Session-basierte Authentifizierung** mit sicherer Speicherung
- **Rollenbasierte Berechtigungen** für alle Funktionen
- **Benutzerauswahl** in Dropdown-Menüs

## 🛠 Technische Architektur

### Frontend
- **React.js + TypeScript**
- **Wouter** für Client-Side Routing
- **Shadcn/ui** für UI-Komponenten
- **TanStack Query** für State Management
- **React Hook Form** mit Zod-Validierung
- **Tailwind CSS** für Styling

### Backend
- **Express.js** mit TypeScript
- **PostgreSQL** Datenbank
- **Drizzle ORM** für Type-Safe Database Operations
- **Multer** für Datei-Upload Handling
- **Session-Management** mit sicherer Speicherung

### AI Integration
- **Webhook-basiert** für flexible AI-Provider
- **Strukturierte JSON-Responses**
- **TRBS-Kategorien-Mapping**
- **Error Handling** und Validierung

## 📋 Installation & Setup

### Voraussetzungen
- Node.js 18+
- PostgreSQL 14+

### Installation
```bash
# Repository klonen
git clone <repository-url>
cd biggs-permit-system

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# DATABASE_URL, SESSION_SECRET anpassen

# Datenbank migrieren
npm run db:push

# Development Server starten
npm run dev
```

### Umgebungsvariablen
```env
DATABASE_URL=postgresql://user:password@localhost:5432/biggs
SESSION_SECRET=your-secure-secret-key
WEBHOOK_URL=https://your-ai-service.com/webhook  # Optional
```

## 🔌 AI-Integration

### Webhook-Konfiguration
Das System sendet Permit-Daten zur Analyse an konfigurierte AI-Endpoints:

**Outbound (System → AI)**
```json
POST https://your-ai-service.com/analyze
{
  "action": "analyze_permit",
  "permitData": {
    "permitId": "HT-2025-001",
    "type": "hot_work",
    "selectedHazards": ["5-0", "4-0"],
    "hazardNotes": "{\"5-0\": \"Schweißrauch\"}",
    "completedMeasures": ["ppe_welding"],
    "identifiedHazards": "Schweißfunken, Hitze"
  }
}
```

**Inbound (AI → System)**
```json
POST https://your-domain.com/api/webhooks/suggestions
{
  "permitId": "HT-2025-001", 
  "analysisComplete": true,
  "suggestions": [
    {
      "type": "trbs_hazard_enhancement",
      "priority": "high",
      "fieldName": "selectedHazards",
      "originalValue": ["5-0"],
      "suggestedValue": ["5-0", "5-1", "2-0"],
      "reasoning": "Ergänzung um Hautkontakt und Brandgefahr"
    }
  ]
}
```

### TRBS-Gefährdungskategorien
Das System implementiert alle 38 Kategorien nach TRBS 1112:
- **0-x**: Mechanische Gefährdungen (4 Unterkategorien)
- **1-x**: Sturz/Absturz (4 Unterkategorien) 
- **2-x**: Brand/Explosion (4 Unterkategorien)
- **3-x**: Explosionsgefährdungen (4 Unterkategorien)
- **4-x**: Elektrische Gefährdungen (3 Unterkategorien)
- **5-x**: Gefahrstoffe (4 Unterkategorien)
- **6-x**: Biologische Gefährdungen (2 Unterkategorien)
- **7-x**: Physikalische Einwirkungen (4 Unterkategorien)
- **8-x**: Arbeitsumgebung (3 Unterkategorien)
- **9-x**: Physische Belastungen (3 Unterkategorien)

## 📝 API-Endpunkte

### Permits
- `GET /api/permits` - Alle Permits abrufen
- `GET /api/permits/:id` - Einzelnes Permit abrufen
- `POST /api/permits` - Neues Permit erstellen
- `PATCH /api/permits/:id` - Permit aktualisieren
- `DELETE /api/permits/:id` - Permit löschen

### AI-Suggestions
- `GET /api/permits/:id/suggestions` - Alle Suggestions eines Permits
- `POST /api/webhooks/suggestions` - AI-Suggestions empfangen
- `PATCH /api/suggestions/:id/apply` - Suggestion anwenden
- `DELETE /api/suggestions/:id` - Suggestion löschen

### Benutzer & Rollen
- `GET /api/users/department-heads` - Abteilungsleiter
- `GET /api/users/safety-officers` - Sicherheitsbeauftragte  
- `GET /api/users/maintenance-approvers` - Technik-Genehmiger

### Anhänge
- `GET /api/permits/:id/attachments` - Permit-Anhänge
- `POST /api/permits/:id/attachments` - Datei hochladen
- `DELETE /api/attachments/:id` - Anhang löschen

## 🎯 Benutzerrollen

### Administrator
- Vollzugriff auf alle Funktionen
- Benutzerverwaltung
- System-Konfiguration
- Permit-Löschung

### Anforderer  
- Permits erstellen und bearbeiten
- Eigene Permits verwalten
- AI-Suggestions verwenden

### Sicherheitsbeauftragte
- Permits genehmigen/ablehnen
- Sicherheitsbewertungen durchführen
- TRBS-konforme Prüfungen

### Abteilungsleiter
- Departmental Permits genehmigen
- Team-Permit-Übersicht
- Ressourcen-Genehmigungen

### Technik
- Technische Genehmigungen
- Wartungs-Permits
- Equipment-Freigaben

## 🔒 Sicherheit

### Authentifizierung
- Session-basiertes Login
- Sichere Cookie-Speicherung
- Automatische Session-Bereinigung

### Autorisierung
- Rollenbasierte Zugriffskontrolle
- Permit-Level Berechtigungen
- API-Endpoint Schutz

### Datenvalidierung
- Zod-Schema Validierung
- SQL-Injection Schutz
- File-Upload Beschränkungen

## 🚀 Deployment

### Produktionsbereitschaft
Das System ist vollständig getestet und produktionsbereit:
- Automatische Datenbankmigrationen
- Error Handling und Logging
- Session-Management
- File-Upload Sicherheit

### Umgebungskonfiguration
```bash
# Produktionsumgebung
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=secure-random-string
```

## 📊 Monitoring & Logs

### Console Logging
- Permit-Operationen
- AI-Webhook Calls
- Authentication Events
- Error Tracking

### Database Monitoring
- Session-Cleanup
- Permit-Statistics
- User-Activity Tracking

## 🤝 Contributing

### Code-Stil
- TypeScript für Type Safety
- ESLint/Prettier Konfiguration
- Conventional Commits

### Testing
- Unit Tests für Business Logic
- Integration Tests für API
- E2E Tests für kritische Workflows

### Pull Requests
1. Feature Branch erstellen
2. Tests hinzufügen/aktualisieren
3. Code Review anfordern
4. Dokumentation aktualisieren

## 📄 Lizenz

Proprietäre Software für industrielle Arbeitserlaubnis-Verwaltung.

## 📞 Support

Für technischen Support und Fragen zur Implementierung kontaktieren Sie das Entwicklungsteam.