# n8n Webhook Setup für AI-Permit-Analyse

## Problem
Der Webhook `ai-permit-analysis` ist nicht registriert. n8n-Webhooks werden erst aktiv, wenn der Workflow mindestens einmal ausgeführt wurde.

## Schritt-für-Schritt Anleitung

### 1. n8n-Workflow importieren
- Öffnen Sie n8n (`https://sync.app.smaflex.com` oder Ihre n8n-Instanz)
- Importieren Sie den Workflow aus `n8n-ai-permit-workflow.json`

### 2. Webhook-Node konfigurieren
Der Webhook-Node sollte diese Einstellungen haben:
```
HTTP Method: POST
Path: webhook-test/ai-permit-analysis
Response Mode: Respond Immediately
Response Data: JSON
```

### 3. Database-Node konfigurieren
PostgreSQL-Verbindung mit diesen Daten:
```
Host: dpg-cshek4e8ii6s73b4s9m0-a.oregon-postgres.render.com
Port: 5432
Database: biggs_xzso
User: biggs_xzso_user
Password: [siehe Admin-Einstellungen für aktuelles Passwort]
```

### 4. Workflow aktivieren
**WICHTIG:** Klicken Sie auf "Execute workflow" um den Webhook zu registrieren!

### 5. Test durchführen
- Nach der Ausführung ist der Webhook aktiv
- Testen Sie die AI-Analyse in der Anwendung
- Der Webhook empfängt diese Daten:

```json
{
  "stagingId": 5,
  "batchId": "batch_1749586284688_yk1ueypc4",
  "permitData": {
    "permitId": "GN-2025-002",
    "type": "general_permit",
    "location": "Tankfarm Nord",
    "description": "Pumpe wechseln...",
    "identifiedHazards": "...",
    "additionalComments": "...",
    "selectedHazards": [...],
    "completedMeasures": [...]
  }
}
```

### 6. Workflow-Logik
Der n8n-Workflow sollte:
1. Webhook-Daten empfangen
2. AI-Analyse durchführen (OpenAI/ChatGPT Integration)
3. Verbesserungen in `permits_staging` Tabelle schreiben:
   ```sql
   UPDATE permits_staging 
   SET 
     identified_hazards = 'verbesserte Gefahren...',
     additional_comments = 'AI-Empfehlungen...',
     selected_hazards = ['neue', 'gefahren'],
     completed_measures = ['neue', 'maßnahmen'],
     changed_fields = ['identifiedHazards', 'additionalComments', 'selectedHazards', 'completedMeasures'],
     ai_processing_status = 'completed',
     ai_processing_completed = NOW()
   WHERE id = {{$json.stagingId}}
   ```

### 7. Fehlerbehebung
- **404 Not Found**: Workflow noch nicht ausgeführt → "Execute workflow" klicken
- **Connection Error**: Database-Verbindung prüfen
- **Timeout**: Workflow zu langsam → AI-Anfragen optimieren

## Alternative: Test-Analyse
Wenn der Webhook nicht funktioniert, nutzen Sie die grüne "Test-Analyse" Schaltfläche in der Anwendung für Demonstrationszwecke.