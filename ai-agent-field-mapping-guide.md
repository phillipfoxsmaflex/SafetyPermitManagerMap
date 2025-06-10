# AI Integration Guide - Biggs Permit Management System

## Webhook Integration für AI-Services

### System-zu-AI Kommunikation (Outbound)

Das System sendet Permit-Daten zur Analyse an konfigurierte AI-Endpoints:

**URL**: Konfigurierbare Webhook-URL  
**Method**: POST  
**Content-Type**: application/json

#### Beispiel Request
```json
{
  "action": "analyze_permit",
  "permitData": {
    "permitId": "HT-2025-001",
    "internalId": 10,
    "type": "hot_work",
    "location": "Produktionshalle A",
    "description": "Schweißarbeiten an Rohrleitungen",
    "riskLevel": "high",
    "status": "pending",
    
    "selectedHazards": ["5-0", "4-0"],
    "hazardNotes": "{\"5-0\": \"Schweißrauch\", \"4-0\": \"Funkenschlag\"}",
    "completedMeasures": ["ppe_welding", "ventilation"],
    "identifiedHazards": "Schweißfunken, Hitzeentwicklung",
    
    "immediateActions": "",
    "beforeWorkStarts": "",
    "complianceNotes": "",
    
    "timestamp": "2025-06-10T15:30:00.000Z"
  }
}
```

### AI-zu-System Kommunikation (Inbound)

AI-Services senden Verbesserungsvorschläge zurück an das System:

**URL**: `https://your-domain.com/api/webhooks/suggestions`  
**Method**: POST  
**Content-Type**: application/json

#### Erwartete Response
```json
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
      "reasoning": "Schweißarbeiten erfordern zusätzliche Gefährdungskategorien: Hautkontakt durch Metallspritzer (5-1), Brandgefahr (2-0), UV-Strahlung (7-2)"
    },
    {
      "type": "hazard_documentation",
      "priority": "medium",
      "fieldName": "hazardNotes",
      "originalValue": "{\"5-0\": \"Schweißrauch\"}",
      "suggestedValue": "{\"5-0\": \"Schweißrauch mit Metalloxiden - kontinuierliche Absaugung\", \"5-1\": \"Metallspritzer - vollständige Schutzkleidung\", \"2-0\": \"Brandgefahr - Brandwache erforderlich\", \"7-2\": \"UV-Strahlung - Augenschutz obligatorisch\"}",
      "reasoning": "Detaillierte Dokumentation aller schweißspezifischen Gefährdungen"
    },
    {
      "type": "safety_assessment",
      "priority": "high", 
      "fieldName": "immediateActions",
      "originalValue": "",
      "suggestedValue": "• Arbeitsbereich von brennbaren Materialien räumen\n• Feuerlöscher bereitstellen\n• Brandwache organisieren",
      "reasoning": "Sofortmaßnahmen für Schweißarbeiten nach DGUV Regel 100-500"
    }
  ]
}
```

## TRBS-Gefährdungskategorien (Vollständig)

Das System implementiert alle 38 TRBS-Kategorien nach TRBS 1112:

### Kategorie 0: Mechanische Gefährdungen
- `0-0`: Ungeschützt bewegliche Maschinenteile
- `0-1`: Teile mit gefährlichen Oberflächen
- `0-2`: Bewegliche Transportmittel, Arbeitsmittel
- `0-3`: Unkontrolliert bewegliche Teile

### Kategorie 1: Sturz, Absturz
- `1-0`: Absturz von Arbeitsplätzen/Verkehrswegen
- `1-1`: Absturz in Behälter, Gruben
- `1-2`: Sturz auf gleicher Ebene
- `1-3`: Sturz über vorstehende Teile

### Kategorie 2: Brand-/Explosionsgefährdungen
- `2-0`: Brennbare Flüssigkeiten
- `2-1`: Brennbare Gase
- `2-2`: Brennbare Stäube
- `2-3`: Selbstentzündliche Stoffe

### Kategorie 3: Explosionsgefährdungen
- `3-0`: Explosive Stoffe/Gemische
- `3-1`: Pyrotechnische Stoffe
- `3-2`: Instabile explosive Stoffe
- `3-3`: Explosive Gegenstände

### Kategorie 4: Elektrische Gefährdungen  
- `4-0`: Elektrischer Schlag
- `4-1`: Elektrostatische Aufladung
- `4-2`: Lichtbögen

### Kategorie 5: Gefahrstoffe
- `5-0`: Einatmen von Gasen, Dämpfen, Nebeln, Stäuben
- `5-1`: Hautkontakt/Resorption
- `5-2`: Verschlucken
- `5-3`: Physikalisch-chemische Gefährdungen

### Kategorie 6: Biologische Gefährdungen
- `6-0`: Infektionen durch pathogene Mikroorganismen
- `6-1`: Sensibilisierende/toxische Wirkungen

### Kategorie 7: Physikalische Einwirkungen  
- `7-0`: Lärm
- `7-1`: Vibrationen
- `7-2`: Optische Strahlung
- `7-3`: Ionisierende Strahlung

### Kategorie 8: Arbeitsumgebungsbedingungen
- `8-0`: Klima
- `8-1`: Beleuchtung, Sicherheitsbeleuchtung  
- `8-2`: Ersticken, Ertrinken

### Kategorie 9: Physische Belastungen
- `9-0`: Schwere körperliche Arbeit
- `9-1`: Einseitige körperliche Belastung
- `9-2`: Kombination ungünstiger körperlicher Bedingungen

## Suggestion Types & Prioritäten

### Suggestion Types
- `trbs_hazard_enhancement`: TRBS-Gefährdungserweiterung
- `hazard_documentation`: Gefährdungsdokumentation  
- `protective_measures`: Schutzmaßnahmen
- `safety_assessment`: Sicherheitsbewertung
- `compliance_requirement`: Compliance-Anforderung
- `procedure_optimization`: Verfahrensoptimierung

### Priority Levels
- `critical`: Sofortige Maßnahme erforderlich
- `high`: Vor Arbeitsbeginn umsetzen
- `medium`: Zur Optimierung empfohlen  
- `low`: Langfristige Verbesserung

## Feldspezifische Integration

### Permit-Grunddaten
- `type`: Permit-Typ (hot_work, confined_space, electrical, height, chemical, general_permit)
- `location`: Arbeitsort
- `description`: Arbeitsbeschreibung
- `riskLevel`: Risikostufe (low, medium, high, critical)

### TRBS-Gefährdungsfelder  
- `selectedHazards`: Array von TRBS-Kategorie-IDs
- `hazardNotes`: JSON-String mit Notizen je Kategorie
- `identifiedHazards`: Freitext-Gefahrenidentifikation
- `completedMeasures`: Array abgeschlossener Schutzmaßnahmen

### Sicherheitsbewertungsfelder
- `immediateActions`: Sofortmaßnahmen
- `beforeWorkStarts`: Maßnahmen vor Arbeitsbeginn
- `complianceNotes`: Compliance-Hinweise

## Error Handling

### Fehlerhafte AI-Response
```json
{
  "permitId": "HT-2025-001",
  "analysisComplete": false,
  "error": "Unvollständige Gefährdungsdaten",
  "suggestions": []
}
```

### Validierungsregeln
1. `permitId` muss mit Request übereinstimmen
2. `suggestions` Array darf nicht leer sein bei `analysisComplete: true`
3. `fieldName` muss existierendes Permit-Feld referenzieren
4. `priority` muss gültigen Wert haben
5. JSON in `suggestedValue` muss valid sein

## Implementation Beispiele

### n8n Workflow
```javascript
// Webhook Trigger empfängt Permit-Daten
const permitData = $json.body.permitData;

// AI-Analyse (OpenAI/Claude Node)
const analysis = await analyzePermit(permitData);

// Response formatieren
return {
  permitId: permitData.permitId,
  analysisComplete: true,
  suggestions: analysis.suggestions
};
```

### Python/Flask Endpoint
```python
@app.route('/ai-analyze', methods=['POST'])
def analyze_permit():
    permit_data = request.json['permitData']
    
    suggestions = ai_service.analyze(permit_data)
    
    return {
        'permitId': permit_data['permitId'],
        'analysisComplete': True,
        'suggestions': suggestions
    }
```

Das System ist vollständig webhook-kompatibel und unterstützt flexible AI-Integration über HTTP-basierte Services.