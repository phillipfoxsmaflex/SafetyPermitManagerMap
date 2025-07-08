# Docker Setup - Bereinigt und Funktionsfähig

## Behobene Probleme:

### 1. Docker-Compose-Konfiguration
- **Problem**: `docker-compose.yml` verwies auf gelöschte `Dockerfile.simple`
- **Lösung**: Referenz auf `Dockerfile` korrigiert

### 2. Dockerfile-Konfiguration
- **Problem**: Inline-Startup-Script statt `docker-entrypoint.sh`
- **Lösung**: Korrekte Verwendung von `docker-entrypoint.sh`

### 3. Build-Prozess
- **Problem**: Komplexer Build-Prozess mit separaten Client-/Server-Builds
- **Lösung**: Vereinfachte Installation mit tsx für Runtime

## Aktuelle Konfiguration:

### docker-compose.yml
```yaml
app:
  build: 
    context: .
    dockerfile: Dockerfile  # ✅ Korrigiert
```

### Dockerfile
```dockerfile
# Vereinfachte Abhängigkeiten-Installation
RUN npm ci --only=production && npm install tsx

# Korrektes Entrypoint-Script
CMD ["./docker-entrypoint.sh"]  # ✅ Korrigiert
```

### docker-entrypoint.sh
- Robustes Startup-Script mit Retry-Mechanismus
- Automatische Datenbank-Schema-Erstellung
- Benutzer-Seeding und -Verifikation

## Deployment-Befehle:

```bash
# Kompletter Build und Start
docker-compose up -d --build

# Nur Start (bei vorhandenem Image)
docker-compose up -d

# Logs anzeigen
docker-compose logs -f app

# Cleanup
docker-compose down -v
```

## Verifikation:
- ✅ Docker-Compose-Datei korrigiert
- ✅ Dockerfile-Entrypoint behoben
- ✅ DEPLOYMENT.md mit --build Flag aktualisiert
- ✅ Alle obsoleten Dateien entfernt
- ✅ Authentifizierung mit admin/password123 bestätigt