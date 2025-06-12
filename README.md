# Biggs - Digital Permit Management System

Ein umfassendes Arbeitserlaubnis-Management-System für die chemische Industrie mit AI-gestützter Sicherheitsanalyse und vollständiger TRBS-konformer Gefährdungsbeurteilung.

## 🚀 Hauptfunktionen

### Permit Management
- **6 Permit-Typen**: Heißarbeiten, enge Räume, elektrische Arbeiten, Arbeiten in der Höhe, Chemikalienarbeiten, allgemeine Erlaubnisscheine
- **Vollständiger Workflow**: Entwurf → Genehmigung → Aktiv → Abgeschlossen
- **Rollenbasierte Genehmigungen**: Abteilungsleiter, Sicherheitsbeauftragte, Technik-Genehmiger
- **Dokumentenanhänge**: Datei-Uploads mit Metadaten und Downloadfunktion
- **Druckansicht**: Professionelle Arbeitserlaubnis-Ausgabe

### TRBS-konforme Sicherheitsbewertung
- **Vollständige 11 TRBS-Kategorien** (Mechanische, Elektrische, Gefahrstoffe, Biologische, Brand/Explosion, Thermische, Physikalische, Arbeitsumgebung, Physische Belastung, Psychische Faktoren, Sonstige)
- **48 spezifische Gefährdungen** mit strukturierter Risikoanalyse
- **Detaillierte Gefährdungsnotizen** mit JSON-strukturierter Speicherung
- **Schutzmaßnahmen-Tracking** mit vordefiniertem Katalog
- **Compliance-Felder**: Sofortmaßnahmen, Vorbereitung, Compliance-Hinweise

### AI-gestützte Verbesserungsvorschläge
- **Webhook-Integration** für externe AI-Services mit vollständiger TRBS-Datenübertragung
- **Feldspezifische Suggestions** mit Begründung und Priorität
- **Manuelle Genehmigung** aller AI-Vorschläge
- **TRBS-Mapping** für automatische Gefährdungserkennung
- **Batch-Operationen**: Alle annehmen/ablehnen/löschen

### Benutzerverwaltung
- **5 Benutzerrollen**: Admin, Anforderer, Sicherheitsbeauftragte, Abteilungsleiter, Technik
- **Session-basierte Authentifizierung** mit sicherer Speicherung
- **Rollenbasierte Berechtigungen** für alle Funktionen

## 🛠 Technische Architektur

### Frontend
- **React.js + TypeScript** mit Wouter Router
- **Shadcn/ui** für UI-Komponenten
- **TanStack Query** für State Management
- **React Hook Form** mit Zod-Validierung
- **Tailwind CSS** für responsives Design

### Backend
- **Express.js** mit TypeScript
- **PostgreSQL** Datenbank mit Drizzle ORM
- **Session-Management** mit sicherer Speicherung
- **Multer** für Datei-Upload Handling

### AI Integration
- **Webhook-basiert** für flexible AI-Provider
- **Vollständige TRBS-Datenübertragung** aller 11 Kategorien
- **Strukturierte JSON-Responses** mit Error Handling

## 📋 Installation & Setup

### Automatisierte Installation (Empfohlen)

```bash
# Repository klonen
git clone <repository-url>
cd biggs-permit-system

# Vollständige Installation
chmod +x install.sh
./install.sh
```

Das Installationsskript führt automatisch aus:
- Prüfung und Installation von Node.js 18+ und PostgreSQL
- Installation aller npm-Abhängigkeiten
- Erstellung der Datenbank und Benutzer
- Generierung sicherer Passwörter und Session-Secrets
- Initialisierung des Datenbankschemas
- Erstellung der .env-Datei mit sicheren Standardwerten

### Manuelle Installation

```bash
# System-Abhängigkeiten (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib

# Datenbank erstellen
sudo -u postgres psql
```
```sql
CREATE DATABASE biggs_permits;
CREATE USER biggs_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE biggs_permits TO biggs_user;
ALTER USER biggs_user CREATEDB;
\q
```

```bash
# Projekt setup
npm install
cp .env.example .env
# .env bearbeiten mit Ihren Einstellungen

# Datenbank initialisieren
npm run db:push

# Beispieldaten laden (optional)
npx tsx server/seed.ts

# Development Server starten
npm run dev
```

### Wichtige Umgebungsvariablen
```env
DATABASE_URL=postgresql://biggs_user:password@localhost:5432/biggs_permits
SESSION_SECRET=your-64-character-secure-secret
NODE_ENV=development
WEBHOOK_URL=https://your-ai-service.com/webhook  # Optional
MAX_FILE_SIZE=10485760
```

## 🔌 AI-Integration

### TRBS-Webhook-System
Das System sendet vollständige TRBS-Gefährdungsdaten zur AI-Analyse:

**Outbound (System → AI)**
```json
POST https://your-ai-service.com/analyze
{
  "action": "analyze_permit",
  "permitData": {
    "permitId": "HT-2025-001",
    "type": "hot_work",
    "trbsAssessment": {
      "selectedHazards": ["1-0", "2-0", "5-0"],
      "hazardNotes": {
        "1-0": "Quetschgefahr durch hydraulische Presse",
        "2-0": "Lichtbogenschweißen erforderlich",
        "5-0": "Tankinhalt explosionsfähig"
      },
      "completedMeasures": ["ppe_welding", "fire_watch"],
      "hazardCategories": [
        {
          "categoryId": 1,
          "categoryName": "Mechanische Gefährdungen",
          "selectedHazards": [...],
          "totalHazards": 4,
          "selectedCount": 1
        }
      ]
    }
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
      "suggestedValue": ["5-0", "5-1", "2-0", "7-2"],
      "reasoning": "Schweißarbeiten erfordern zusätzliche Kategorien: Hautkontakt (5-1), Brandgefahr (2-0), UV-Strahlung (7-2)"
    }
  ]
}
```

### Vollständige TRBS-Kategorien
Das System implementiert alle 11 TRBS-Standardkategorien:

1. **Mechanische Gefährdungen** (4 Unterkategorien)
2. **Elektrische Gefährdungen** (4 Unterkategorien)
3. **Gefahrstoffe** (4 Unterkategorien)
4. **Biologische Arbeitsstoffe** (3 Unterkategorien)
5. **Brand- und Explosionsgefährdungen** (3 Unterkategorien)
6. **Thermische Gefährdungen** (3 Unterkategorien)
7. **Spezielle physikalische Einwirkungen** (8 Unterkategorien)
8. **Arbeitsumgebungsbedingungen** (6 Unterkategorien)
9. **Physische Belastung/Arbeitsschwere** (5 Unterkategorien)
10. **Psychische Faktoren** (4 Unterkategorien)
11. **Sonstige Gefährdungen** (4 Unterkategorien)

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
- `POST /api/permits/:id/apply-all-suggestions` - Alle Suggestions anwenden
- `PATCH /api/suggestions/:id/apply` - Einzelne Suggestion anwenden
- `DELETE /api/suggestions/:id` - Suggestion löschen

### Benutzer & Rollen
- `GET /api/users/department-heads` - Abteilungsleiter
- `GET /api/users/safety-officers` - Sicherheitsbeauftragte  
- `GET /api/users/maintenance-approvers` - Technik-Genehmiger
- `GET /api/work-locations/active` - Aktive Arbeitsorte

### Anhänge
- `GET /api/permits/:id/attachments` - Permit-Anhänge
- `POST /api/permits/:id/attachments` - Datei hochladen
- `DELETE /api/attachments/:id` - Anhang löschen

## 🎯 Benutzerrollen

### Administrator
- Vollzugriff auf alle Funktionen
- Benutzerverwaltung und System-Konfiguration
- Permit-Löschung und Datenbank-Verwaltung

### Anforderer  
- Permits erstellen und bearbeiten
- Eigene Permits verwalten
- AI-Suggestions verwenden

### Sicherheitsbeauftragte
- Permits genehmigen/ablehnen
- TRBS-konforme Sicherheitsbewertungen
- Gefährdungsbeurteilungen durchführen

### Abteilungsleiter
- Departmental Permits genehmigen
- Team-Permit-Übersicht
- Ressourcen-Genehmigungen

### Technik
- Technische Genehmigungen
- Wartungs-Permits und Equipment-Freigaben

## 🚀 Produktions-Deployment

### Umgebungskonfiguration
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/biggs_prod
SESSION_SECRET=your-very-secure-64-character-secret
SECURE_COOKIES=true
COOKIE_DOMAIN=.yourdomain.com
```

### PM2 Prozess-Management
```bash
npm install -g pm2

# PM2 Konfiguration
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'biggs-permits',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Starten
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

### Nginx Konfiguration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

### SSL mit Certbot
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 📊 Datenbank-Management

### Backup & Restore
```bash
# Backup erstellen
pg_dump -h localhost -U biggs_user -d biggs_permits > backup_$(date +%Y%m%d_%H%M%S).sql

# Automatisches tägliches Backup
echo "0 2 * * * pg_dump -h localhost -U biggs_user -d biggs_permits > /backup/biggs_$(date +\%Y\%m\%d).sql" | crontab -

# Restore
psql -h localhost -U biggs_user -d biggs_permits < backup_file.sql
```

### Schema-Updates
```bash
# Migration generieren
npm run db:generate

# Migration anwenden
npm run db:push
```

## 🔒 Sicherheits-Checkliste

### Pre-Production
- [ ] Starke Datenbank-Passwörter (20+ Zeichen)
- [ ] Sicheres Session-Secret (64+ Zeichen)
- [ ] HTTPS mit gültigen Zertifikaten
- [ ] Sichere Cookies aktiviert
- [ ] Datenbank-Firewall konfiguriert
- [ ] Regelmäßige Backups geplant
- [ ] Log-Monitoring aktiviert
- [ ] File-Upload-Limits konfiguriert

### Post-Deployment
- [ ] Standard Admin-Passwort geändert
- [ ] Test-Benutzerkonten entfernt
- [ ] Security-Header konfiguriert
- [ ] Datenbank-Zugriff geprüft
- [ ] Backup-Restore getestet
- [ ] Monitoring-Alerts konfiguriert
- [ ] SSL-Zertifikat Auto-Renewal getestet

## 🔧 Troubleshooting

### Häufige Probleme
1. **Datenbankverbindung fehlgeschlagen**
   - DATABASE_URL Format prüfen
   - PostgreSQL-Status: `sudo systemctl status postgresql`
   - Verbindung testen: `psql $DATABASE_URL`

2. **Session-Fehler**
   - SESSION_SECRET gesetzt prüfen
   - Cookie-Domain-Konfiguration prüfen
   - Browser-Cookies löschen

3. **File-Upload-Fehler**
   - uploads/ Verzeichnis-Berechtigungen prüfen
   - MAX_FILE_SIZE Einstellung prüfen
   - Festplattenspeicher prüfen

4. **Build-Fehler**
   - `rm -rf node_modules && npm install`
   - Node.js Version: `node --version`
   - Dependencies aktualisieren: `npm update`

### Log-Überwachung
```bash
# PM2 Logs
pm2 logs biggs-permits

# System-Logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Systemressourcen
htop
```

### Health Check
```bash
# Service-Check
curl -f http://localhost:5000/api/auth/user || echo "Service down"

# Monitoring-Cron
echo "*/5 * * * * curl -f http://localhost:5000/api/auth/user || echo 'Biggs service down' | mail admin@yourdomain.com" | crontab -
```

## 📄 Lizenz

Proprietäre Software für industrielle Arbeitserlaubnis-Verwaltung.

## 📞 Support

Für technischen Support und Implementierungsfragen kontaktieren Sie das Entwicklungsteam.