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
- `selectedHazards` (string[]): Array der TRBS-Gefährdungskategorien (Format: "categoryId-hazardIndex")
- `hazardNotes` (JSON string): Strukturierte Gefährdungsnotizen pro Kategorie
- `completedMeasures` (string[]): Array durchgeführter Schutzmaßnahmen
- `identifiedHazards` (string): Identifizierte Gefährdungen
- `additionalComments` (string): Zusätzliche Kommentare

### Detaillierte TRBS-Gefährdungsbeurteilung
- `trbsAssessment` (object): Vollständige TRBS-Analyse
  - `selectedHazards` (string[]): Ausgewählte Gefährdungskategorien
  - `hazardNotes` (object): Notizen-Objekt mit Schlüssel-Wert-Paaren
  - `completedMeasures` (string[]): Durchgeführte Schutzmaßnahmen
  - `hazardCategories` (array): Strukturierte Kategorie-Details
    - `categoryId` (number): TRBS-Kategorie-ID (1-10)
    - `categoryName` (string): Name der Gefährdungskategorie
    - `selectedHazards` (array): Details zu ausgewählten Gefährdungen
      - `id` (string): Gefährdungs-ID (z.B. "2-0")
      - `hazardDescription` (string): Beschreibung der Gefährdung
      - `protectiveMeasures` (string): Empfohlene Schutzmaßnahmen
      - `isSelected` (boolean): Ist ausgewählt
      - `notes` (string): Spezifische Notizen zu dieser Gefährdung
      - `category` (string): Kategorienname
    - `totalHazards` (number): Gesamtanzahl Gefährdungen in Kategorie
    - `selectedCount` (number): Anzahl ausgewählter Gefährdungen

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

## Beispiel: Vollständige TRBS-Webhook-Kommunikation

### Outbound Webhook (System → KI)
```json
{
  "permitId": "HT-2025-001",
  "type": "hot_work",
  "location": "Produktionshalle A",
  "description": "Schweißarbeiten an Rohrleitungen",
  "department": "Instandhaltung",
  "status": "pending",
  "requestorName": "Max Mustermann",
  "contactNumber": "+49 123 456789",
  "emergencyContact": "Werkschutz: +49 123 999",
  "startDate": "2025-06-11T08:00:00Z",
  "endDate": "2025-06-11T16:00:00Z",
  "selectedHazards": ["2-0", "7-2"],
  "hazardNotes": "{}",
  "completedMeasures": ["ppe_basic"],
  "identifiedHazards": "Schweißfunken, Hitze",
  "additionalComments": "Routinearbeiten",
  "immediateActions": "",
  "beforeWorkStarts": "",
  "complianceNotes": "",
  "overallRisk": "medium",
  "trbsAssessment": {
    "selectedHazards": ["2-0", "7-2"],
    "hazardNotes": {},
    "completedMeasures": ["ppe_basic"],
    "hazardCategories": [
      {
        "categoryId": 2,
        "categoryName": "Mechanische Gefährdungen",
        "selectedHazards": [
          {
            "id": "2-0",
            "hazardDescription": "kontrolliert bewegte ungeschützte Teile",
            "protectiveMeasures": "größtmögliche Einschränkung des Zugangs zur Gefahrenstelle",
            "isSelected": true,
            "notes": "",
            "category": "Mechanische Gefährdungen"
          }
        ],
        "totalHazards": 11,
        "selectedCount": 1
      },
      {
        "categoryId": 7,
        "categoryName": "Physikalische Einwirkungen",
        "selectedHazards": [
          {
            "id": "7-2",
            "hazardDescription": "optische Strahlung (UV, IR, Laser)",
            "protectiveMeasures": "Augenschutz, Hautschutz bei UV-Strahlung",
            "isSelected": true,
            "notes": "",
            "category": "Physikalische Einwirkungen"
          }
        ],
        "totalHazards": 8,
        "selectedCount": 1
      }
    ]
  }
}
```

### Inbound Webhook (KI → System) - Erweiterte TRBS-Analyse
```json
{
  "permitId": "HT-2025-001",
  "analysisComplete": true,
  "suggestions": [
    {
      "fieldName": "selectedHazards",
      "originalValue": ["2-0", "7-2"],
      "suggestedValue": ["1-0", "2-0", "2-1", "5-2", "7-0", "7-2"],
      "reasoning": "Vollständige TRBS-Kategorien für Schweißarbeiten: 1-0 (Mechanische Gefährdungen durch bewegte Teile), 2-1 (Explosion durch Gas-Luft-Gemische), 5-2 (Inhalation von Metallrauch), 7-0 (Lärm durch Schleifarbeiten)",
      "priority": "high",
      "type": "trbs_completion"
    },
    {
      "fieldName": "hazardNotes",
      "originalValue": "{}",
      "suggestedValue": "{\"1-0\": \"Rotierende Schleifscheiben absichern, Schutzverkleidungen prüfen\", \"2-0\": \"Schweißfunken können brennbare Materialien entzünden - Arbeitsbereich von brennbaren Stoffen freihalten\", \"2-1\": \"Gas-Luft-Gemische in geschlossenen Räumen vermeiden, ausreichende Belüftung sicherstellen\", \"5-2\": \"Metallrauch und Schweißgase durch lokale Absaugung entfernen\", \"7-0\": \"Gehörschutz bei Schleif- und Trennarbeiten obligatorisch\", \"7-2\": \"UV-Schutzbrille und Schweißhelm mit entsprechender Schutzstufe verwenden\"}",
      "reasoning": "Detaillierte Sicherheitsnotizen für jede TRBS-Kategorie mit spezifischen Schutzmaßnahmen nach DGUV Vorschriften",
      "priority": "critical",
      "type": "safety_documentation"
    },
    {
      "fieldName": "completedMeasures",
      "originalValue": ["ppe_basic"],
      "suggestedValue": ["ppe_welding_complete", "fire_watch_mandatory", "ventilation_local", "area_clearance_5m", "emergency_equipment_ready", "hearing_protection", "respiratory_protection"],
      "reasoning": "Vollständige Schutzmaßnahmen entsprechend TRBS 2101 für alle identifizierten Gefährdungen",
      "priority": "critical",
      "type": "protective_measures"
    },
    {
      "fieldName": "immediateActions",
      "originalValue": "",
      "suggestedValue": "1. Arbeitsbereich 5m Radius absperren und kennzeichnen\n2. Feuerlöscher und Löschdecke bereitstellen\n3. Schweißschutzwände aufstellen\n4. Lokale Absaugung installieren und testen\n5. Brandwache einteilen\n6. Notfallkommunikation sicherstellen",
      "reasoning": "Systematische Sofortmaßnahmen nach DGUV Regel 100-500 für Heißarbeiten",
      "priority": "critical",
      "type": "immediate_safety"
    },
    {
      "fieldName": "beforeWorkStarts",
      "originalValue": "",
      "suggestedValue": "1. PSA-Kontrolle: Schweißhelm, Schutzkleidung, Sicherheitsschuhe\n2. Funktionsprüfung Absauganlage\n3. Freimessung der Atemluft\n4. Prüfung elektrischer Schweißgeräte\n5. Brandwache-Briefing\n6. Kommunikationsmittel testen",
      "reasoning": "Checkliste vor Arbeitsbeginn zur Sicherstellung aller Schutzmaßnahmen",
      "priority": "high",
      "type": "pre_work_checklist"
    },
    {
      "fieldName": "overallRisk",
      "originalValue": "medium",
      "suggestedValue": "high",
      "reasoning": "Schweißarbeiten mit multiplen TRBS-Gefährdungen erfordern Einstufung als hohes Risiko",
      "priority": "medium",
      "type": "risk_assessment"
    }
  ]
}
```

## Test-Szenarien

### TRBS-Vollständigkeitstest
```bash
curl -X POST http://localhost:5000/api/webhooks/suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "permitId": "TEST-2025-001",
    "analysisComplete": true,
    "suggestions": [
      {
        "fieldName": "selectedHazards",
        "suggestedValue": ["1-0", "2-0", "3-0", "4-0", "5-0", "6-0", "7-0", "8-0", "9-0"],
        "reasoning": "Vollständige TRBS-Kategorienabdeckung für umfassende Gefährdungsbeurteilung"
      },
      {
        "fieldName": "hazardNotes",
        "suggestedValue": "{\"1-0\": \"Allgemeine Sicherheitshinweise\", \"2-0\": \"Mechanische Schutzmaßnahmen\", \"3-0\": \"Absturzsicherung\", \"4-0\": \"Elektrische Sicherheit\", \"5-0\": \"Medienschutz\", \"6-0\": \"Brandschutz\", \"7-0\": \"Physikalischer Schutz\", \"8-0\": \"Ergonomische Maßnahmen\", \"9-0\": \"Arbeitsorganisation\"}"
      }
    ]
  }'
```

Das System unterstützt jetzt vollständige TRBS-Gefährdungsbeurteilungen mit detaillierten Kategorie-Informationen und spezifischen Notizen für optimale KI-Analyse.