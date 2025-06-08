# n8n AI Agent Integration für Permit Management System

## Webhook-Eingang (GET Request)

Das System sendet folgende Parameter an Ihren n8n Webhook:

### URL Parameter
- `action`: "analyze_permit"
- `permitData`: Base64-kodierte JSON-Daten des Permits

### Dekodierung der Permit-Daten
```javascript
// In n8n JavaScript Code Node:
const permitDataBase64 = $json.query.permitData;
const permitData = JSON.parse(Buffer.from(permitDataBase64, 'base64').toString('utf8'));
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
      "id": "suggestion_1",
      "type": "safety_improvement",
      "category": "protective_measures",
      "priority": "high",
      "fieldName": "completedMeasures",
      "originalValue": "fire_watch,ventilation,ppe",
      "suggestedValue": "fire_watch,ventilation,ppe,atmospheric_monitoring,emergency_procedures",
      "title": "Zusätzliche Schutzmaßnahmen erforderlich",
      "reasoning": "Für Schweißarbeiten in der Nähe chemischer Anlagen wird eine kontinuierliche Atmosphärenüberwachung empfohlen.",
      "impact": "Reduziert Explosionsrisiko um 60%",
      "implementation": "Installieren Sie einen Gasdetektor vor Arbeitsbeginn",
      "references": ["TRBS 2152", "BGR 500"]
    },
    {
      "id": "suggestion_2",
      "type": "procedure_optimization", 
      "category": "timing",
      "priority": "medium",
      "fieldName": "startDate",
      "originalValue": "2024-12-15T08:00:00.000Z",
      "suggestedValue": "2024-12-15T09:00:00.000Z",
      "title": "Arbeitszeit anpassen",
      "reasoning": "Beginnen Sie nach der morgendlichen Produktionsüberprüfung um Konflikte zu vermeiden.",
      "impact": "Reduziert Unterbrechungen um 40%",
      "implementation": "Koordination mit Produktionsleitung",
      "references": ["Betriebsanweisung BA-001"]
    }
  ],
  "recommendations": {
    "immediate_actions": [
      "Gasdetektor installieren",
      "Feuerwache organisieren" 
    ],
    "before_work_starts": [
      "Atmosphärentest durchführen",
      "Brandschutzausrüstung bereitstellen"
    ]
  },
  "compliance_notes": {
    "trbs_conformity": "Teilweise konform - siehe Verbesserungsvorschläge",
    "missing_requirements": [
      "TRBS 2152: Atmosphärenüberwachung"
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
- `riskLevel`: Risikostufe
- `completedMeasures`: Abgeschlossene Schutzmaßnahmen
- `identifiedHazards`: Identifizierte Gefahren
- `additionalComments`: Zusätzliche Kommentare
- `startDate`, `endDate`: Arbeitszeiträume