# KI-gestützte Permit-Verbesserung mit Staging-System

## Übersicht

Das neue AI-Staging-System ermöglicht es der KI, Genehmigungen zu analysieren und Verbesserungen direkt in eine Staging-Datenbank zu schreiben. Benutzer können die Änderungen vor der Übernahme überprüfen und genehmigen.

## Architektur

### Datenbankstruktur

**permits_staging Tabelle:**
- Exakte Kopie der permits-Tabelle 
- Zusätzliche AI-Metadaten (aiProcessingStatus, batchId, changedFields)
- Approval-Status für Review-Workflow

**Erweiterte ai_suggestions Tabelle:**
- Link zu staging permits (stagingPermitId)
- Confidence-Werte der KI
- Batch-Gruppierung für zusammengehörige Änderungen

### Workflow

1. **Analyse starten:** User triggert KI-Analyse über `/api/permits/{id}/ai-analyze`
2. **Staging erstellen:** System kopiert Permit in permits_staging Tabelle
3. **KI-Verarbeitung:** n8n Workflow analysiert Permit und schreibt direkt in Staging-DB
4. **Review:** User überprüft Änderungen über Diff-Interface
5. **Anwendung:** Approved Änderungen werden in Original-Permit übernommen

## API-Endpunkte

### Neue Staging-Endpunkte

```typescript
POST /api/permits/{id}/ai-analyze
// Startet KI-Analyse und erstellt Staging-Permit

GET /api/permits/{id}/staging  
// Holt Staging-Permit für Review

GET /api/permits/{id}/diff
// Zeigt Unterschiede zwischen Original und Staging

POST /api/permits/{id}/apply-staging
// Übernimmt Staging-Änderungen in Original

DELETE /api/permits/{id}/staging
// Verwirft Staging-Änderungen
```

## n8n Workflow-Konfiguration

### Workflow-Import
1. Importieren Sie `n8n-ai-permit-workflow.json` in n8n
2. Konfigurieren Sie PostgreSQL-Verbindung mit Admin-Settings-Daten
3. Fügen Sie OpenAI API-Schlüssel hinzu
4. Aktivieren Sie den Webhook

### Datenbankverbindung
Die Verbindungsdaten finden Sie unter Admin-Einstellungen → Datenbankverbindung:
- Host, Port, Datenbank, Benutzer werden automatisch angezeigt
- Verwenden Sie diese Daten für die PostgreSQL-Node-Konfiguration in n8n

### KI-Prompt
Der Workflow verwendet einen strukturierten GPT-4 Prompt für:
- TRBS-konforme Gefahrenidentifikation
- Risikobewertung nach Standards
- Sicherheitsmaßnahmen-Empfehlungen
- Deutsche Texte mit Fachterminologie

## Frontend-Integration

### AiStagingManager Komponente
- Integriert in Permit-Details-Seite
- Status-Tracking (processing, completed, error)
- Diff-Viewer für Änderungsvergleich
- One-Click-Approval/Rejection

### UI-Features
- Real-time Status-Updates
- Farbkodierte Änderungen (rot=original, grün=verbessert)
- Batch-ID-Tracking für Nachverfolgung
- Confidence-Anzeige für KI-Bewertungen

## Sicherheit & Compliance

### Datenintegrität
- Staging-System verhindert direkte Änderungen an Produktivdaten
- Vollständige Audit-Logs aller KI-Änderungen
- Rollback-Fähigkeit über Staging-Verwerfung

### TRBS-Compliance
- KI verwendet TRBS-2152 Gefährdungskategorien
- Strukturierte Gefahrennotizen nach Standards
- Compliance-Hinweise in separatem Feld

## Migration & Deployment

### Bestehende Features
- Alte AI-Suggestions bleiben funktional
- Webhook-Konfiguration wird wiederverwendet
- Keine Breaking Changes für existierende API

### Neue Abhängigkeiten
- permits_staging Tabelle wird automatisch erstellt
- Erweiterte ai_suggestions Tabelle (abwärtskompatibel)
- n8n Workflow erfordert OpenAI API-Zugang

## Monitoring

### Logs & Debugging
- Staging-Status in permits_staging.aiProcessingStatus
- Webhook-Erfolg in webhook_config.lastTestStatus
- Fehler-Tracking über ai_suggestions.status

### Performance
- Direkte DB-Schreibung reduziert API-Latenz
- Batch-Verarbeitung für Multiple-Permit-Analyse
- Asynchrone Webhook-Verarbeitung

## Zukunftserweiterungen

### Geplante Features
- Voice-to-Text für Permit-Beschreibungen
- Bulk-AI-Analysis für Multiple Permits
- Custom AI-Prompts pro Permit-Typ
- Integration mit externen Safety-Datenbanken

### Skalierung
- Redis-Cache für Staging-Status
- Queue-System für High-Volume-Processing
- Multi-Language-Support für internationale Standards

## Troubleshooting

### Häufige Probleme
1. **KI-Analyse startet nicht:** Webhook-Konfiguration prüfen
2. **Staging-Permit fehlt:** Datenbankverbindung zu n8n prüfen
3. **Änderungen nicht sichtbar:** Browser-Cache leeren, Queries invalidieren
4. **OpenAI-Fehler:** API-Schlüssel und Rate-Limits prüfen

### Debug-Befehle
```sql
-- Staging-Status prüfen
SELECT * FROM permits_staging WHERE original_permit_id = {id};

-- KI-Suggestions anzeigen  
SELECT * FROM ai_suggestions WHERE staging_permit_id IS NOT NULL;

-- Webhook-Status prüfen
SELECT * FROM webhook_config WHERE is_active = true;
```