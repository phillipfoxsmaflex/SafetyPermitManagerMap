# n8n AI Agent Integration für Permit Management System

## Webhook-Eingang (GET Request)

Das System sendet folgende Parameter an Ihren n8n Webhook:

### URL Parameter
- `action`: "analyze_permit"
- `permitData`: JSON-String mit allen Genehmigungsdaten

### Verarbeitung der Permit-Daten
```javascript
// In n8n JavaScript Code Node:
const permitData = JSON.parse($json.query.permitData);
```

### Permit-Datenstruktur
```json
{
  "permitId": "HW-2024-001",
  "internalId": 15,
  "type": "hot_work",
  "location": "Produktionshalle A, Anlage 3",
  "description": "Schweißarbeiten an Rohrleitungen",
  "department": "Maintenance",
  "riskLevel": "high",
  "status": "pending",
  
  "requestorName": "Max Mustermann",
  "contactNumber": "+49 123 456789",
  "emergencyContact": "+49 987 654321",
  "safetyOfficer": "Dr. Safety",
  "departmentHead": "Team Lead",
  "maintenanceApprover": "Maintenance Chief",
  "performerName": null,
  
  "startDate": "2024-12-15T08:00:00.000Z",
  "endDate": "2024-12-15T17:00:00.000Z",
  "workStartedAt": null,
  "workCompletedAt": null,
  
  "selectedHazards": ["1-0", "1-2", "3-1"],
  "hazardNotes": "{\"1-0\": \"Hohe Temperaturen erwartet\", \"3-1\": \"Chemische Dämpfe möglich\"}",
  "completedMeasures": ["fire_watch", "ventilation", "ppe"],
  "identifiedHazards": "Schweißfunken, Hitzeentwicklung",
  "additionalComments": "Besondere Vorsicht bei Schweißarbeiten",
  
  "departmentHeadApproval": false,
  "departmentHeadApprovalDate": null,
  "maintenanceApproval": false,
  "maintenanceApprovalDate": null,
  "safetyOfficerApproval": false,
  "safetyOfficerApprovalDate": null,
  
  "analysisType": "permit_improvement",
  "timestamp": "2024-12-15T10:30:00.000Z",
  "systemVersion": "1.0"
}
```

## Antwort-Format für n8n (POST Request zurück)

Senden Sie die Analyseergebnisse per POST Request an:
`https://your-permit-system.com/api/webhooks/suggestions`

### Antwort-Header
```
Content-Type: application/json
```

### Antwort-Body Struktur
```json
{
  "permitId": "HW-2024-001",
  "analysisComplete": true,
  "riskAssessment": {
    "overallRisk": "high",
    "riskFactors": [
      "Hot work in confined space",
      "Chemical exposure potential", 
      "High temperature operations"
    ],
    "complianceScore": 75
  },
  "suggestions": [
    {
      "type": "safety_improvement",
      "priority": "high",
      "fieldName": "completedMeasures",
      "originalValue": "fire_watch,ventilation,ppe",
      "suggestedValue": "fire_watch,ventilation,ppe,atmospheric_monitoring,emergency_procedures",
      "reasoning": "Für Schweißarbeiten in der Nähe chemischer Anlagen wird eine kontinuierliche Atmosphärenüberwachung empfohlen. Dies reduziert das Explosionsrisiko um 60%. Implementation: Installieren Sie einen Gasdetektor vor Arbeitsbeginn. Referenzen: TRBS 2152, BGR 500"
    },
    {
      "type": "procedure_optimization", 
      "priority": "medium",
      "fieldName": "startDate",
      "originalValue": "2024-12-15T08:00:00.000Z",
      "suggestedValue": "2024-12-15T09:00:00.000Z",
      "reasoning": "Beginnen Sie nach der morgendlichen Produktionsüberprüfung um Konflikte zu vermeiden. Dies reduziert Unterbrechungen um 40%. Implementation: Koordination mit Produktionsleitung. Referenz: Betriebsanweisung BA-001"
    },
    {
      "type": "documentation_improvement",
      "priority": "medium", 
      "fieldName": "identifiedHazards",
      "originalValue": "Schweißfunken, Hitzeentwicklung",
      "suggestedValue": "Schweißfunken, Hitzeentwicklung, UV-Strahlung, Metalloxide-Dämpfe, Brandgefahr",
      "reasoning": "Vollständige Auflistung aller Schweißgefahren für bessere Risikobeurteilung. Verbessert Risikobewusstsein um 30%. Implementation: Aktualisieren Sie die Gefährdungsbeurteilung. Referenz: TRBS 2152 Teil 1"
    },
    {
      "type": "safety_improvement",
      "priority": "high",
      "fieldName": "riskLevel", 
      "originalValue": "medium",
      "suggestedValue": "high",
      "reasoning": "Aufgrund der Kombination aus Heißarbeit und chemischer Umgebung sollte das Risiko als 'hoch' eingestuft werden. Dies erfordert zusätzliche Sicherheitsmaßnahmen und Genehmigungen."
    },
    {
      "type": "personnel_requirement",
      "priority": "high",
      "fieldName": "safetyOfficer",
      "originalValue": "",
      "suggestedValue": "Dr. Klaus Weber",
      "reasoning": "Für Heißarbeiten mit hohem Risiko ist die Anwesenheit eines qualifizierten Sicherheitsbeauftragten erforderlich. Dr. Weber ist für chemische Anlagen zertifiziert."
    }
  ],
  "recommendations": {
    "immediate_actions": [
      "Gasdetektor installieren",
      "Feuerwache organisieren",
      "Notfallplan erstellen"
    ],
    "before_work_starts": [
      "Atmosphärentest durchführen", 
      "Brandschutzausrüstung bereitstellen",
      "Kommunikationssystem testen"
    ]
  },
  "compliance_notes": {
    "trbs_conformity": "Teilweise konform - siehe Verbesserungsvorschläge",
    "missing_requirements": [
      "TRBS 2152: Atmosphärenüberwachung",
      "DGUV V3: Zusätzliche PSA"
    ]
  }
}
```

## Wichtige Hinweise

### Prioritätsstufen
- `critical`: Sofortige Maßnahme erforderlich
- `high`: Vor Arbeitsbeginn umsetzen  
- `medium`: Zur Optimierung empfohlen
- `low`: Langfristige Verbesserung

### Field Names (für direkte Feldaktualisierung)
- `riskLevel`: Risikostufe ("low", "medium", "high", "critical")
- `completedMeasures`: Abgeschlossene Schutzmaßnahmen (Array)
- `identifiedHazards`: Identifizierte Gefahren (Text)
- `additionalComments`: Zusätzliche Kommentare (Text)
- `startDate`, `endDate`: Arbeitszeiträume (ISO 8601 Format)
- `safetyOfficer`: Sicherheitsbeauftragter (Name)
- `departmentHead`: Abteilungsleiter (Name)
- `maintenanceApprover`: Instandhaltungsverantwortlicher (Name)
- `performerName`: Ausführender (Name)
- `location`: Arbeitsort (Text)
- `description`: Arbeitsbeschreibung (Text)

### Suggestion Types für GUI-Integration
- `safety_improvement`: Sicherheitsverbesserung (rot markiert)
- `procedure_optimization`: Verfahrensoptimierung (gelb markiert)
- `documentation_improvement`: Dokumentationsverbesserung (blau markiert)
- `personnel_requirement`: Personalanforderung (orange markiert)
- `compliance_requirement`: Compliance-Anforderung (lila markiert)

### Verarbeitung in der GUI
Jede Suggestion wird einzeln in der AI-Suggestions Komponente angezeigt mit:
- Akzeptieren/Ablehnen Buttons
- Vorschau der Änderung (Original → Vorgeschlagen)
- Begründung und Priorität
- Direkte Anwendung auf das entsprechende Feld bei Akzeptierung

### Beispiel n8n Workflow Structure
```javascript
// 1. Webhook Trigger (GET)
// 2. JavaScript Code Node - Parse Data:
const permitData = JSON.parse($json.query.permitData);

// 3. AI Analysis (z.B. OpenAI Node)
// 4. JavaScript Code Node - Format Response:
return {
  permitId: permitData.permitId,
  analysisComplete: true,
  suggestions: [
    // Formatierte Vorschläge wie oben gezeigt
  ]
};

// 5. HTTP Request Node - POST Response zurück
```