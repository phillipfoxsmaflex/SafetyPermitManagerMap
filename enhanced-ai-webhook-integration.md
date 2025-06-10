# Verbesserte AI-Webhook Integration für Permit Management

## Übersicht

Das erweiterte Webhook-Format ermöglicht es der KI, gezielte Verbesserungsvorschläge für spezifische Permitfelder zu machen. Dadurch können AI-Vorschläge direkt in die entsprechenden Datenbankfelder übernommen werden.

## Gesendete Permitdaten (POST an Ihr n8n System)

### Vollständige Permitdatenstruktur
```json
{
  "action": "analyze_permit",
  "permitData": {
    "permitId": "CS-2025-001",
    "internalId": 15,
    "type": "confined_space",
    "location": "Tank 1 - Produktionshalle",
    "description": "Reinigungsarbeiten im Inneren des Tanks",
    "department": "Wartung",
    "riskLevel": "high",
    "status": "pending",
    
    // Kontaktdaten
    "requestorName": "Max Mustermann",
    "contactNumber": "+49 123 456789",
    "emergencyContact": "+49 987 654321",
    "safetyOfficer": "",
    "departmentHead": "Team Lead",
    "maintenanceApprover": "",
    
    // Termine
    "startDate": "2024-12-15T08:00:00.000Z",
    "endDate": "2024-12-15T17:00:00.000Z",
    
    // KRITISCHE FELDER FÜR KI-ANALYSE:
    "identifiedHazards": "",                    // Text - Identifizierte Gefahren
    "additionalComments": "",                   // Text - Zusätzliche Sicherheitshinweise  
    "selectedHazards": [],                      // Array - TRBS Gefährdungskategorien
    "hazardNotes": "{}",                        // JSON String - Notizen zu Gefährdungen
    "completedMeasures": [],                    // Array - Durchgeführte Schutzmaßnahmen
    
    // Genehmigungsstatus
    "departmentHeadApproval": false,
    "maintenanceApproval": false,
    "safetyOfficerApproval": false,
    
    // Metadaten
    "analysisType": "permit_improvement",
    "timestamp": "2024-12-15T10:30:00.000Z"
  }
}
```

## Erwartete Antwort (POST zurück an /api/webhooks/suggestions)

### Fokus auf spezifische Permitfelder

Die KI sollte Vorschläge für folgende Felder machen:

1. **identifiedHazards** - Vollständige Gefahrenidentifikation
2. **completedMeasures** - Erforderliche Schutzmaßnahmen  
3. **selectedHazards** - TRBS-Gefährdungskategorien
4. **hazardNotes** - Strukturierte Gefährdungsnotizen
5. **additionalComments** - Spezifische Sicherheitsanweisungen

### Beispiel-Antwort für Behälterarbeiten:

```json
{
  "permitId": "CS-2025-001",
  "analysisComplete": true,
  "suggestions": [
    {
      "type": "hazard_identification",
      "priority": "high",
      "fieldName": "identifiedHazards",
      "originalValue": "",
      "suggestedValue": "Sauerstoffmangel, toxische Dämpfe, Explosionsgefahr, Absturzgefahr beim Einstieg, Erstickungsgefahr, heiße Oberflächen, mechanische Verletzungen",
      "reasoning": "Vollständige Gefahrenidentifikation für Behälterarbeiten nach TRBS 2152-2 und DGUV Regel 113-004"
    },
    {
      "type": "protective_measures",
      "priority": "high",
      "fieldName": "completedMeasures", 
      "originalValue": [],
      "suggestedValue": [
        "atmospheric_monitoring",
        "ventilation_system", 
        "ppe_chemical_protection",
        "emergency_rescue_equipment",
        "confined_space_entry_permit",
        "gas_detector_continuous",
        "safety_attendant_outside"
      ],
      "reasoning": "Zwingend erforderliche Schutzmaßnahmen für Behälterarbeiten nach TRBS 2152"
    },
    {
      "type": "trbs_hazard_mapping",
      "priority": "high", 
      "fieldName": "selectedHazards",
      "originalValue": [],
      "suggestedValue": ["5-0", "5-1", "4-0", "7-1", "8-1"],
      "reasoning": "TRBS-Kategorien: Gefahrstoffe (5-0,5-1), Brand/Explosion (4-0), mech. Gefährdungen (7-1), besondere Arbeitsumgebung (8-1)"
    },
    {
      "type": "hazard_notes_structure",
      "priority": "medium",
      "fieldName": "hazardNotes",
      "originalValue": "{}",
      "suggestedValue": "{\"5-0\": \"Exposition gegenüber chemischen Dämpfen - kontinuierliche Überwachung\", \"5-1\": \"Sauerstoffmangel durch Verdrängung - Atemschutz obligatorisch\", \"4-0\": \"Explosionsgefahr durch Gasansammlung - Ex-Schutz beachten\", \"7-1\": \"Absturzgefahr beim Behältereinstieg - Sicherungsmaßnahmen\", \"8-1\": \"Enge Raumverhältnisse - Notfallrettung vorbereiten\"}",
      "reasoning": "Strukturierte Dokumentation mit spezifischen Schutzmaßnahmen je Gefährdungskategorie"
    },
    {
      "type": "safety_instructions",
      "priority": "medium",
      "fieldName": "additionalComments",
      "originalValue": "",
      "suggestedValue": "Kontinuierliche Atmosphärenüberwachung während der gesamten Arbeitszeit. Sicherheitsposten außerhalb des Behälters. Kommunikationsverbindung nach außen. Arbeitsbereich vor Betreten freimessen. Rettungsausrüstung griffbereit.",
      "reasoning": "Detaillierte Sicherheitsanweisungen für Behälterarbeiten zur Gewährleistung der Personensicherheit"
    }
  ],
  "riskAssessment": {
    "overallRisk": "high",
    "riskFactors": [
      "Sauerstoffmangel in geschlossenem Raum",
      "Mögliche toxische Dämpfe", 
      "Begrenzte Fluchtmöglichkeiten",
      "Erschwerte Rettungsbedingungen"
    ],
    "complianceScore": 40,
    "recommendations": [
      "Umfassende Atmosphärenüberwachung implementieren",
      "Qualifizierte Rettungsmannschaft in Bereitschaft",
      "Detaillierte Notfallpläne erstellen"
    ]
  }
}
```

## Vorteile des verbesserten Systems

1. **Gezielte Feldverbesserungen**: KI kann spezifische Permitfelder direkt verbessern
2. **Strukturierte TRBS-Integration**: Automatische Zuordnung zu Gefährdungskategorien  
3. **Konsistente Datenqualität**: Vorschläge werden validiert und direkt übernommen
4. **Bessere Compliance**: Systematische Abdeckung aller Sicherheitsaspekte
5. **Effiziente Workflows**: Keine manuelle Übertragung von Vorschlägen nötig

## Feldspezifische Vorschlagstypen

- **hazard_identification**: Für `identifiedHazards` Feld
- **protective_measures**: Für `completedMeasures` Array
- **trbs_hazard_mapping**: Für `selectedHazards` Array  
- **hazard_notes_structure**: Für `hazardNotes` JSON
- **safety_instructions**: Für `additionalComments` Feld

## Implementation in n8n

```javascript
// Parse eingehende Permitdaten
const permitData = $('HTTP Request').first().json.permitData;

// AI-Analyse basierend auf aktuellen Permitfeldern
const analysisPrompt = `
Analysiere dieses Permit und mache Verbesserungsvorschläge für:

1. identifiedHazards: "${permitData.identifiedHazards}"
2. completedMeasures: ${JSON.stringify(permitData.completedMeasures)}
3. selectedHazards: ${JSON.stringify(permitData.selectedHazards)} 
4. hazardNotes: ${permitData.hazardNotes}
5. additionalComments: "${permitData.additionalComments}"

Arbeitstyp: ${permitData.type}
Standort: ${permitData.location}
Beschreibung: ${permitData.description}
`;

// Strukturierte Antwort für spezifische Felder
return {
  permitId: permitData.permitId,
  analysisComplete: true,
  suggestions: suggestions
};
```

Dieses verbesserte Format ermöglicht es der KI, präzise und direkt anwendbare Verbesserungsvorschläge zu machen, die automatisch in die entsprechenden Permitfelder übernommen werden können.