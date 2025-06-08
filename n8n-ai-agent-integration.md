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

## Detaillierte n8n Workflow Konfiguration

### Schritt 1: Webhook Trigger Node
**Node Type:** Webhook
**Settings:**
- HTTP Method: `GET`
- Path: `/webhook/safety` (oder Ihr gewählter Pfad)
- Response Mode: `Respond to Webhook`
- Response Code: `200`

### Schritt 2: Code Node - Daten Parser
**Node Type:** Code
**Name:** "Parse Permit Data"
```javascript
// Parse die eingehenden Permit-Daten
const permitData = JSON.parse($json.query.permitData);

// Ausgabe für Debugging (optional)
console.log('Received permit:', permitData.permitId);
console.log('Risk level:', permitData.riskLevel);
console.log('Selected hazards:', permitData.selectedHazards);

return {
  json: {
    permitData: permitData,
    action: $json.query.action
  }
};
```

### Schritt 3: OpenAI/Claude Node (AI Analysis)
**Node Type:** OpenAI/HTTP Request
**Settings für OpenAI Node:**
- Operation: `Message a model`
- Model: `gpt-4` oder `gpt-3.5-turbo`
- Messages:
  ```json
  {
    "role": "system",
    "content": "Du bist ein Experte für industrielle Sicherheit und TRBS-Standards. Analysiere Arbeitsgenehmigungen und gib spezifische Verbesserungsvorschläge."
  },
  {
    "role": "user", 
    "content": "Analysiere diese Arbeitsgenehmigung und gib Verbesserungsvorschläge:\n\nPermit ID: {{ $json.permitData.permitId }}\nTyp: {{ $json.permitData.type }}\nOrt: {{ $json.permitData.location }}\nBeschreibung: {{ $json.permitData.description }}\nRisikostufe: {{ $json.permitData.riskLevel }}\nGefährdungen: {{ $json.permitData.selectedHazards }}\nSchutzmaßnahmen: {{ $json.permitData.completedMeasures }}\n\nBitte gib strukturierte Vorschläge für Verbesserungen in den Bereichen:\n1. Sicherheitsmaßnahmen\n2. Personalanforderungen\n3. Risikobewertung\n4. Dokumentation\n\nFormat: Für jeden Vorschlag gib an:\n- Feld das geändert werden soll\n- Aktueller Wert\n- Vorgeschlagener Wert\n- Begründung\n- Priorität (low/medium/high)"
  }
  ```

### Schritt 4: Code Node - Antwort Formatierung
**Node Type:** Code
**Name:** "Format AI Response"
```javascript
// AI Antwort verarbeiten
const aiResponse = $json.message.content;
const permitData = $('Parse Permit Data').item(0).json.permitData;

// Hier implementieren Sie die Logik um die AI-Antwort zu parsen
// und in das erforderliche Format zu konvertieren

// Beispiel-Implementierung (anpassen je nach AI-Antwort Format):
const suggestions = [
  {
    type: "safety_improvement",
    priority: "high",
    fieldName: "riskLevel",
    originalValue: permitData.riskLevel,
    suggestedValue: "medium",
    reasoning: "Basierend auf der Analyse sollte das Risiko höher eingestuft werden."
  },
  {
    type: "personnel_requirement", 
    priority: "high",
    fieldName: "safetyOfficer",
    originalValue: permitData.safetyOfficer || "",
    suggestedValue: "Dr. Klaus Weber",
    reasoning: "Für diese Art von Arbeit ist ein qualifizierter Sicherheitsbeauftragter erforderlich."
  }
  // Weitere Vorschläge basierend auf AI-Analyse...
];

return {
  json: {
    permitId: permitData.permitId,
    analysisComplete: true,
    riskAssessment: {
      overallRisk: "medium", // Aus AI-Analyse extrahieren
      riskFactors: [
        "Unvollständige Risikobeurteilung",
        "Fehlende Schutzmaßnahmen"
      ],
      complianceScore: 75 // Berechnet basierend auf Analyse
    },
    suggestions: suggestions,
    recommendations: {
      immediate_actions: [
        "Sicherheitsbeauftragten zuweisen",
        "Risikobeurteilung aktualisieren"
      ],
      before_work_starts: [
        "Zusätzliche PSA bereitstellen",
        "Notfallverfahren überprüfen"
      ]
    },
    compliance_notes: {
      trbs_conformity: "Teilweise konform - siehe Verbesserungsvorschläge",
      missing_requirements: [
        "TRBS 2152: Zusätzliche Überwachung erforderlich"
      ]
    }
  }
};
```

### Schritt 5: HTTP Request Node - Antwort senden
**Node Type:** HTTP Request
**Name:** "Send Response to Permit System"
**Settings:**
- Method: `POST`
- URL: `{{ $json.webhookEndpoint || "https://your-permit-system.com/api/webhooks/suggestions" }}`
- Send Body: `true`
- Body Content Type: `JSON`
- Body: `{{ $json }}`
- Headers:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

## Erweiterte AI-Analyse Implementierung

### Intelligente Parsing-Logik für AI-Antworten
```javascript
// Erweiterte Implementierung für Schritt 4
function parseAiAnalysis(aiText, permitData) {
  const suggestions = [];
  
  // Regex Patterns für verschiedene Vorschlagstypen
  const patterns = {
    riskLevel: /Risiko.*?sollte.*?(low|medium|high|critical)/gi,
    safetyOfficer: /Sicherheitsbeauftragter.*?([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    completedMeasures: /Schutzmaßnahmen.*?([\w\s,]+)/gi
  };
  
  // Risk Level Analyse
  const riskMatch = patterns.riskLevel.exec(aiText);
  if (riskMatch && riskMatch[1] !== permitData.riskLevel) {
    suggestions.push({
      type: "safety_improvement",
      priority: "high", 
      fieldName: "riskLevel",
      originalValue: permitData.riskLevel,
      suggestedValue: riskMatch[1],
      reasoning: "AI-Analyse empfiehlt Anpassung der Risikostufe basierend auf Arbeitsart und Umgebung."
    });
  }
  
  // Safety Officer Analyse
  const officerMatch = patterns.safetyOfficer.exec(aiText);
  if (officerMatch && !permitData.safetyOfficer) {
    suggestions.push({
      type: "personnel_requirement",
      priority: "high",
      fieldName: "safetyOfficer", 
      originalValue: permitData.safetyOfficer || "",
      suggestedValue: officerMatch[1],
      reasoning: "Qualifizierter Sicherheitsbeauftragter für diese Arbeitsart erforderlich."
    });
  }
  
  return suggestions;
}

// Verwendung im Code Node:
const aiResponse = $json.message.content;
const permitData = $('Parse Permit Data').item(0).json.permitData;
const suggestions = parseAiAnalysis(aiResponse, permitData);

return {
  json: {
    permitId: permitData.permitId,
    analysisComplete: true,
    suggestions: suggestions
    // ... weitere Felder
  }
};
```

## Fehlerbehandlung und Debugging

### Error Handling im Workflow
```javascript
// In jedem Code Node Error Handling hinzufügen:
try {
  // Hauptlogik hier
  const result = processPermitData($json);
  
  return {
    json: result
  };
} catch (error) {
  console.error('Error processing permit:', error);
  
  return {
    json: {
      permitId: $json.permitData?.permitId || "unknown",
      analysisComplete: false,
      error: {
        code: "PROCESSING_ERROR",
        message: error.message,
        details: "Fehler bei der Verarbeitung der Permit-Daten"
      }
    }
  };
}
```

### Debugging-Tipps
1. **Console Logs:** Nutzen Sie `console.log()` in Code Nodes für Debugging
2. **Test Workflow:** Testen Sie mit dem "Test Workflow" Button
3. **Webhook Testing:** Nutzen Sie den Test-Button im Permit System
4. **Error Monitoring:** Aktivieren Sie Error Workflows für Fehlermeldungen

## Deployment Checklist

- [ ] Webhook Trigger korrekt konfiguriert (GET Method)
- [ ] AI Service API Key konfiguriert
- [ ] Code Nodes getestet und funktionsfähig
- [ ] HTTP Request Node URL korrekt gesetzt
- [ ] Workflow aktiviert (grüner Schalter)
- [ ] Test mit echten Permit-Daten durchgeführt
- [ ] Error Handling implementiert
- [ ] Logging für Monitoring aktiviert