# AI Agent Field Mapping Guide für TRBS Gefährdungsbeurteilung

## Erweiterte Prompt-Anweisungen für AI-Agenten

### Eingabedatenformat verstehen

#### 1. `selected_hazards` Feld
```json
{
  "selected_hazards": ["0-1", "5-0", "5-1", "4-0"]
}
```

**Interpretation:**
- Array von TRBS-Gefährdungskategorie-IDs
- Format: "Hauptkategorie-Unterkategorie" (z.B. "5-0" = Gefahrstoffe - Inhalation)
- Leeres Array = keine Gefährdungen identifiziert
- Null/undefined = Feld noch nicht ausgefüllt

**TRBS Kategorien-Mapping:**
```
0-0: Mechanische Gefährdungen - Ungeschützt bewegliche Maschinenteile
0-1: Mechanische Gefährdungen - Teile mit gefährlichen Oberflächen
1-0: Sturz, Absturz - Von Arbeitsplätzen/Verkehrswegen
2-0: Brand-/Explosionsgefährdungen - Brennbare Flüssigkeiten
3-0: Explosionsgefährdungen - Explosive Stoffe/Gemische
4-0: Elektrische Gefährdungen - Elektrischer Schlag
5-0: Gefahrstoffe - Einatmen von Gasen/Dämpfen
5-1: Gefahrstoffe - Hautkontakt/Resorption
5-2: Gefahrstoffe - Verschlucken
5-3: Gefahrstoffe - Augenkontakt
6-0: Biologische Gefährdungen - Infektionen
7-0: Physikalische Einwirkungen - Lärm
7-1: Physikalische Einwirkungen - Vibrationen
7-2: Physikalische Einwirkungen - Optische Strahlung
8-0: Arbeitsumgebungsbedingungen - Klima
9-0: Physische Belastungen - Heben/Tragen
```

#### 2. `hazard_notes` Feld
```json
{
  "hazard_notes": "{\"5-0\": \"Exposition gegenüber chemischen Dämpfen\", \"4-0\": \"Stromschlaggefahr bei feuchten Bedingungen\"}"
}
```

**Interpretation:**
- JSON-String mit Gefährdungs-ID als Schlüssel
- Werte enthalten spezifische Notizen zu jeder Gefährdung
- Leeres Objekt "{}" = keine Notizen vorhanden
- Null/undefined = Feld noch nicht ausgefüllt

### Ausgabeformat für Verbesserungsvorschläge

#### Empfohlene Suggestion-Struktur

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
      "suggestedValue": ["5-0", "5-1", "4-0", "7-2"],
      "reasoning": "Ergänzung basierend auf Arbeitsanalyse: Hautkontakt (5-1), elektrische Gefährdung (4-0), und optische Strahlung (7-2) wurden identifiziert"
    },
    {
      "type": "hazard_documentation",
      "priority": "medium",
      "fieldName": "hazardNotes",
      "originalValue": "{\"5-0\": \"Bestehende Notiz\"}",
      "suggestedValue": "{\"5-0\": \"Exposition gegenüber Lösungsmitteldämpfen - kontinuierliche Überwachung erforderlich\", \"5-1\": \"Direkter Hautkontakt mit Chemikalien - Schutzhandschuhe obligatorisch\", \"4-0\": \"Elektrische Gefährdung durch feuchte Arbeitsumgebung\", \"7-2\": \"UV-Strahlung bei Schweißarbeiten\"}",
      "reasoning": "Detaillierte Dokumentation der identifizierten Gefährdungen mit spezifischen Schutzmaßnahmen"
    }
  ],
  "recommendations": {
    "immediate_actions": [
      "Persönliche Schutzausrüstung für identifizierte Gefährdungen bereitstellen",
      "Arbeitsbereich auf zusätzliche Gefährdungen prüfen"
    ],
    "before_work_starts": [
      "TRBS-konforme Gefährdungsbeurteilung vollständig dokumentieren",
      "Mitarbeiter über identifizierte Risiken unterweisen"
    ],
    "compliance_requirements": [
      "TRBS 1111: Gefährdungsbeurteilung - vollständige Dokumentation erforderlich",
      "DGUV Vorschrift 1: Unterweisung der Beschäftigten durchführen"
    ]
  }
}
```

### Spezielle Behandlung der Sicherheitsbewertungsfelder

#### Safety Assessment Suggestions
```json
{
  "type": "safety_assessment",
  "priority": "high",
  "fieldName": "immediateActions",
  "originalValue": "",
  "suggestedValue": "• Sofortige Evakuierung bei Gasalarm\n• Atemschutz griffbereit halten\n• Notfallausrüstung prüfen",
  "reasoning": "AI-generierte Sofortmaßnahmen basierend auf TRBS-Gefährdungsanalyse"
}
```

### Wichtige Regeln für AI-Agenten

#### 1. Datenvalidierung
- Prüfe immer, ob `selected_hazards` ein Array ist
- Validiere JSON-Format in `hazard_notes`
- Ignoriere ungültige oder beschädigte Eingabedaten

#### 2. Gefährdungslogik
- Ergänze fehlende Gefährdungskategorien basierend auf Arbeitstyp
- Erstelle kohärente Verbindungen zwischen Gefährdungen
- Berücksichtige Arbeitsumgebung und -methoden

#### 3. Ausgabequalität
- Verwende präzise TRBS-Terminologie
- Gib konkrete, umsetzbare Empfehlungen
- Strukturiere JSON-Objekte korrekt für `hazardNotes`

#### 4. Feldspezifische Behandlung
```javascript
// Beispiel für korrektes selectedHazards-Update
"originalValue": ["5-0"]           // Aktueller Zustand
"suggestedValue": ["5-0", "5-1", "4-0"]  // Ergänzte Gefährdungen

// Beispiel für hazardNotes-Ergänzung  
"originalValue": "{\"5-0\": \"Dämpfe\"}"
"suggestedValue": "{\"5-0\": \"Exposition gegenüber Lösungsmitteldämpfen - kontinuierliche Überwachung\", \"5-1\": \"Hautkontakt vermeiden - Schutzhandschuhe tragen\", \"4-0\": \"Elektrische Sicherheit bei feuchten Bedingungen beachten\"}"
```

### Fehlerbehandlung

#### Ungültige Eingabedaten
```json
{
  "permitId": "HT-2025-001",
  "analysisComplete": false,
  "error": "Ungültige Gefährdungsdaten - selected_hazards ist kein Array",
  "suggestions": []
}
```

#### Empfohlene Validierungslogik
1. Überprüfe `selected_hazards` Array-Format
2. Validiere JSON-Syntax in `hazard_notes`
3. Prüfe TRBS-Kategorie-IDs auf Gültigkeit
4. Erstelle nur Vorschläge für validierte Daten

Diese Anweisungen ermöglichen es AI-Agenten, die komplexen TRBS-Gefährdungsstrukturen korrekt zu interpretieren und qualitativ hochwertige Verbesserungsvorschläge zu generieren.