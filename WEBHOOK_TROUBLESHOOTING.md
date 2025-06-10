# Webhook-Fehler beheben (404 Not Found)

## Problem
Die KI-Analyse schlägt mit einem 404-Fehler fehl, weil die konfigurierte Webhook-URL nicht erreichbar ist:
```
Webhook request failed: 404 Not Found
URL: https://sync.app.smaflex.com/webhook-test/ai-permit-analysis
```

## Lösungsschritte

### 1. n8n-Workflow prüfen
- Öffnen Sie Ihre n8n-Instanz
- Stellen Sie sicher, dass der Workflow aktiv ist
- Prüfen Sie die Webhook-URL im Workflow

### 2. Webhook-URL konfigurieren
- Gehen Sie zu Admin-Einstellungen → Webhook-Konfiguration
- Testen Sie die aktuelle URL mit dem "Test"-Button
- Bei Fehlern: Neue korrekte URL eingeben

### 3. n8n Webhook-Node konfigurieren
Im n8n-Workflow sollte der Webhook-Node folgende Einstellungen haben:
- **HTTP Method**: POST
- **Path**: `/webhook/ai-permit-analysis` (oder gewünschter Pfad)
- **Response Mode**: Respond Immediately
- **Response Data**: JSON

### 4. Firewall/Netzwerk prüfen
- Stellen Sie sicher, dass die n8n-Instanz öffentlich erreichbar ist
- Prüfen Sie Firewall-Einstellungen
- Testen Sie die URL in einem Browser oder mit curl

### 5. Alternative: Lokale Entwicklung
Für Tests können Sie eine lokale n8n-Instanz verwenden:
```bash
npx n8n
# Dann lokale URL verwenden: http://localhost:5678/webhook/ai-permit-analysis
```

## Erwartete Webhook-Payload
Die Anwendung sendet folgende Daten an den Webhook:
```json
{
  "stagingId": 4,
  "batchId": "batch_1749586284688_yk1ueypc4",
  "permitData": {
    "permitId": "GN-2025-002",
    "type": "general_permit",
    "location": "Tankfarm Nord",
    "description": "Pumpe wechseln...",
    "identifiedHazards": "...",
    "safetyMeasures": "..."
  }
}
```

## n8n-Antwort
Der n8n-Workflow sollte die Verbesserungen direkt in die Datenbank schreiben:
- Tabelle: `permits_staging`
- Feld: `ai_processing_status` auf "completed" setzen
- Verbesserte Werte in entsprechende Felder schreiben