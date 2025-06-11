# Vollständiges Webhook-Feldmapping für KI-Analyse

## Outbound Webhook (System → KI)

Das System sendet alle Permit-Felder zur KI-Analyse:

### Grunddaten
- `permitId` (string): Eindeutige Permit-ID
- `type` (string): Permit-Typ (hot_work, confined_space, electrical, height_work)
- `location` (string): Arbeitsort
- `description` (string): Arbeitsbeschreibung
- `department` (string): Abteilung
- `status` (string): Aktueller Status

### Personal & Kontakt
- `requestorName` (string): Name des Antragstellers
- `contactNumber` (string): Telefonnummer
- `emergencyContact` (string): Notfallkontakt
- `performerName` (string): Name des Ausführenden

### Termine
- `startDate` (ISO string): Geplanter Starttermin
- `endDate` (ISO string): Geplanter Endtermin
- `workStartedAt` (ISO string): Tatsächlicher Arbeitsbeginn
- `workCompletedAt` (ISO string): Tatsächlicher Arbeitsabschluss

### Sicherheitsbewertung
- `selectedHazards` (string[]): Array der TRBS-Gefährdungskategorien
- `hazardNotes` (JSON string): Strukturierte Gefährdungsnotizen
- `completedMeasures` (string[]): Array durchgeführter Schutzmaßnahmen
- `identifiedHazards` (string): Identifizierte Gefährdungen
- `additionalComments` (string): Zusätzliche Kommentare

### Compliance & Sicherheit
- `immediateActions` (string): Sofortmaßnahmen
- `beforeWorkStarts` (string): Maßnahmen vor Arbeitsbeginn
- `complianceNotes` (string): Compliance-Hinweise
- `overallRisk` (string): Gesamtrisikobewertung

### Genehmigungen
- `departmentHeadApproval` (boolean): Abteilungsleiter-Genehmigung
- `safetyOfficerApproval` (boolean): Sicherheitsbeauftragte-Genehmigung
- `maintenanceApproval` (boolean): Instandhaltungs-Genehmigung
- `departmentHeadId` (number): ID des Abteilungsleiters
- `safetyOfficerId` (number): ID des Sicherheitsbeauftragten
- `maintenanceApproverId` (number): ID des Instandhaltungs-Genehmigers

## Inbound Webhook (KI → System)

Die KI sendet Verbesserungsvorschläge zurück:

### Response Format
```json
{
  "permitId": "HT-2025-001",
  "analysisComplete": true,
  "suggestions": [
    {
      "fieldName": "identifiedHazards",
      "originalValue": "Schweißfunken, Hitze",
      "suggestedValue": "Schweißfunken, Hitzeentwicklung, UV-Strahlung, Metallrauch, Brandgefahr durch Funkenflug",
      "reasoning": "Vollständige Gefährdungsidentifikation nach TRBS 2101 fehlt. UV-Strahlung und Metallrauch sind wesentliche Gefährdungen beim Schweißen.",
      "priority": "high",
      "type": "safety_enhancement"
    },
    {
      "fieldName": "selectedHazards",
      "originalValue": ["2-0", "7-2"],
      "suggestedValue": ["2-0", "2-1", "5-2", "7-0", "7-2"],
      "reasoning": "TRBS-Kategorien 2-1 (Explosion), 5-2 (Inhalation), 7-0 (Lärm) fehlen für Schweißarbeiten.",
      "priority": "high",
      "type": "trbs_completion"
    },
    {
      "fieldName": "immediateActions",
      "originalValue": "",
      "suggestedValue": "Arbeitsbereich absperren, Feuerlöscher bereitstellen, Schweißschutz aufstellen, Belüftung sicherstellen",
      "reasoning": "Sofortmaßnahmen für Heißarbeiten nach DGUV Regel 100-500 erforderlich.",
      "priority": "critical",
      "type": "immediate_safety"
    },
    {
      "fieldName": "completedMeasures",
      "originalValue": ["ppe_basic"],
      "suggestedValue": ["ppe_welding", "fire_watch", "ventilation", "area_clearance", "emergency_equipment"],
      "reasoning": "Spezifische PSA für Schweißarbeiten und Brandwache erforderlich.",
      "priority": "high",
      "type": "protective_measures"
    }
  ]
}
```

## Feldmapping-Logik

### Text-Felder
- Direkte String-Zuweisung
- Validierung auf maximale Länge
- Sanitization von HTML/Script-Tags

### Array-Felder (selectedHazards, completedMeasures)
- JSON-Array oder komma-separierte Strings
- Automatische Konvertierung
- Duplikat-Entfernung

### JSON-Felder (hazardNotes)
- Validierung der JSON-Struktur
- Fallback zu strukturiertem Objekt
- Automatische Formatierung

### Boolean-Felder
- Konvertierung von Strings ("true"/"false")
- Numerische Werte (0/1)
- Default: false

### ID-Felder
- Validierung als Integer
- Null-Werte für ungültige IDs
- Referenzprüfung in Datenbank

### Datum-Felder
- ISO-String-Parsing
- Validierung auf gültiges Datum
- Zeitzone-Handling

## Anwendungslogik beim Akzeptieren

1. **Feldvalidierung**: Überprüfung der Feldnamen gegen Schema
2. **Wert-Sanitization**: Typgerechte Konvertierung und Validierung
3. **TRBS-Mapping**: Automatische Zuordnung zu Gefährdungskategorien
4. **Konsistenzprüfung**: Abgleich mit bestehenden Daten
5. **Datenbankupdate**: Atomare Transaktion mit Rollback-Möglichkeit
6. **Audit-Log**: Protokollierung aller Änderungen

## Fehlerbehandlung

### Ungültige Feldnamen
- Warnung im Log
- Vorschlag wird übersprungen
- Keine Datenbankänderung

### Ungültige Werte
- Versuch der automatischen Korrektur
- Fallback zu ursprünglichem Wert
- Detaillierte Fehlerprotokollierung

### Datenbank-Fehler
- Vollständiger Rollback
- Fehlerbenachrichtigung
- Retry-Mechanismus

## Test-Szenarien

### Vollständige Feldabdeckung
```bash
curl -X POST /api/webhooks/suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "permitId": "TEST-2025-001",
    "analysisComplete": true,
    "suggestions": [
      {
        "fieldName": "description",
        "suggestedValue": "Erweiterte Arbeitsbeschreibung mit Sicherheitsdetails"
      },
      {
        "fieldName": "selectedHazards",
        "suggestedValue": ["1-0", "2-0", "5-2"]
      },
      {
        "fieldName": "immediateActions",
        "suggestedValue": "Arbeitsbereich sichern und PSA anlegen"
      }
    ]
  }'
```

Das System ist vollständig für umfassende KI-Integration optimiert.