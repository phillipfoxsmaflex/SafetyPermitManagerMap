# Webhook-Integration Referenz

## Endpunkt
`POST /api/webhooks/suggestions`

## Eingabe-Payload (an KI-Agent)

Das System sendet folgende Permit-Daten zur Analyse:

```json
{
  "permitId": "HT-2025-001",
  "internalId": 5,
  "type": "height_work",
  "location": "Produktionshalle A",
  "description": "Wartungsarbeiten an Beleuchtung in 8m Höhe",
  "department": "Maintenance",
  "riskLevel": "medium",
  "status": "pending",
  
  "requestorName": "Hans Mueller",
  "contactNumber": "123",
  "emergencyContact": "112",
  "performerName": "",
  
  "startDate": "2025-06-10T08:00:00.000Z",
  "endDate": "2025-06-10T16:00:00.000Z",
  
  "trbsAssessment": {
    "identifiedHazards": "Absturzgefahr, rutschige Oberflächen",
    "additionalComments": "Auffanggurt erforderlich",
    "immediateActions": "• Realistische Zeitplanung\n• Rettungsplan erstellen",
    "beforeWorkStarts": "• Windgeschwindigkeit messen\n• PSAgA-Funktionsprüfung",
    "complianceNotes": "TRBS 2121 Absturzsicherung beachten",
    "overallRisk": "",
    "completedMeasures": [],
    "selectedHazards": [
      {
        "hazardId": "2-0",
        "hazardDescription": "Absturz von Personen",
        "isSelected": true,
        "notes": "Absturzgefahr bei Höhenarbeit"
      }
    ]
  }
}
```

## Rückgabe-Format 1: Verbessertes Permit (Empfohlen)

```json
{
  "permitId": "HT-2025-001",
  "analysisComplete": true,
  "improvedPermit": {
    "type": "height_work",
    "location": "Produktionshalle A - Wartungsbereich",
    "description": "Wartungsarbeiten an Beleuchtung in 8m Höhe mit verbesserter Sicherheitsplanung",
    "department": "Maintenance",
    "requestorName": "Hans Mueller",
    "contactNumber": "123",
    "emergencyContact": "Werksfeuerwehr: +49-555-1234 (24h), Rettungsdienst: 112, Betriebsarzt: +49-555-5678",
    "performerName": "Max Mustermann (zertifizierte Höhenarbeiter gem. DGUV)",
    
    "identifiedHazards": "Absturzgefahr, Stromschlaggefahr, Gefahr durch herabfallende Gegenstände, rutschige Oberflächen",
    "additionalComments": "Arbeitsplatz vollständig abgesichert, PSA-Kontrolle durchgeführt, Rettungsplan erstellt",
    "immediateActions": "Arbeitsbereich absperren, Absturzsicherung installieren, Stromkreise freischalten, PSA anlegen",
    "beforeWorkStarts": "Sicherheitseinweisung durchführen, Rettungskonzept besprechen, Wetterbedingungen prüfen, Notfallausrüstung bereitstellen",
    "complianceNotes": "DGUV Regel 112-198 und 112-199 (Höhenarbeit) vollständig umgesetzt, BGR 500 beachtet",
    "overallRisk": "medium",
    
    "selectedHazards": ["2-0", "3-0", "6-2"],
    "hazardNotes": "{\"2-0\": \"Absturzgefahr bei Höhenarbeit\", \"3-0\": \"Stromschlag bei Beleuchtungsarbeiten\", \"6-2\": \"Herabfallende Werkzeuge\"}"
  },
  "riskAssessment": {
    "overallRisk": "medium",
    "riskFactors": ["Höhenarbeit", "Elektrische-Arbeiten", "Absturzrisiko"],
    "complianceScore": 90
  }
}
```

## Rückgabe-Format 2: Einzelne Vorschläge (Legacy)

```json
{
  "permitId": "HT-2025-001",
  "analysisComplete": true,
  "suggestions": [
    {
      "type": "improvement",
      "fieldName": "emergencyContact",
      "originalValue": "112",
      "suggestedValue": "Werksfeuerwehr: +49-555-1234 (24h), Rettungsdienst: 112",
      "reasoning": "Vollständige Notfallkontakte mit 24h-Verfügbarkeit erforderlich",
      "priority": "high"
    },
    {
      "type": "safety_assessment",
      "fieldName": "performerName",
      "originalValue": "",
      "suggestedValue": "Max Mustermann (zertifizierte Höhenarbeiter gem. DGUV)",
      "reasoning": "Qualifikationsnachweis für Höhenarbeit erforderlich",
      "priority": "high"
    }
  ],
  "recommendations": {
    "immediate_actions": [
      "Arbeitsbereich absperren",
      "Absturzsicherung installieren",
      "PSA anlegen"
    ],
    "before_work_starts": [
      "Sicherheitseinweisung durchführen",
      "Rettungskonzept besprechen",
      "Wetterbedingungen prüfen"
    ],
    "compliance_requirements": [
      "DGUV Regel 112-198 umsetzen",
      "BGR 500 beachten"
    ]
  }
}
```

## TRBS-Gefährdungskategorien

```
1-x: Mechanische Gefährdungen (Quetschung, Schnitt, Stoß)
2-x: Absturzgefährdungen (Höhenarbeit, ungesicherte Öffnungen)
3-x: Elektrische Gefährdungen (Stromschlag, Lichtbogen)
4-x: Gefahrstoffe (Chemikalien, Dämpfe, Gase)
5-x: Brand- und Explosionsgefährdungen (Ex-Zonen, brennbare Stoffe)
6-x: Thermische Gefährdungen (Hitze, Kälte, heiße Oberflächen)
7-x: Umgebungsbedingte Gefährdungen (Lärm, Vibration, Klima)
8-x: Physische Belastungen (schweres Heben, Zwangshaltungen)
```

## Systemverarbeitung

### Format 1 (improvedPermit)
- Automatischer Feldvergleich zwischen Original und Verbesserung
- Jeder Unterschied wird als separater Vorschlag erstellt
- Benutzer kann jeden Vorschlag einzeln annehmen/ablehnen
- Prioritäten: high (emergencyContact, selectedHazards, immediateActions), medium (rest)

### Format 2 (suggestions)
- Direkte Verarbeitung der einzelnen Vorschläge
- Kompatibilität mit bestehenden Implementierungen
- Manuelle Feldzuordnung erforderlich

## Praxisbeispiel

**Test-Webhook für HT-2025-001:**
```bash
curl -X POST http://localhost:5000/api/webhooks/suggestions \
  -H "Content-Type: application/json" \
  -d '{"permitId": "HT-2025-001", "analysisComplete": true, "improvedPermit": {...}}'
```

**Antwort:**
```json
{
  "message": "AI suggestions received successfully",
  "suggestionsCount": 15,
  "processingMethod": "complete_permit_comparison"
}
```

## Integration in n8n

1. **HTTP Request Node** auf Permit-Daten von `/api/permits/{id}/analyze`
2. **AI Analysis Node** (OpenAI/Claude) mit Prompt aus `ki-agent-prompt-genehmigungsverwaltung.md`
3. **HTTP Request Node** zurück an `/api/webhooks/suggestions`

Das System unterstützt beide Formate parallel und erkennt automatisch das verwendete Format.