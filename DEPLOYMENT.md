# Biggs Permit Management System - Docker Deployment Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- Port 3000 available for the application

**Note:** The Docker Compose files use the modern format without version specification, which is the recommended approach for Docker Compose v2.0+.

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd biggs-permit-management
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Web interface: http://localhost:3000
   - Health check: http://localhost:3000/api/health

## Default Credentials

- **Username:** admin
- **Password:** password123

**Additional Users:**
- safety.officer / password123 (Safety Officer)
- hans.mueller / password123 (Supervisor)
- ops.manager / password123 (Operations Manager)
- employee / password123 (Employee)

## Configuration

### Environment Variables

The following environment variables are configured in `docker-compose.yml`:

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to `production`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Database connection details

### Database

- **Database:** PostgreSQL 15
- **Default credentials:** postgres/postgres
- **Port:** 5432 (internal), mapped to host port 5432
- **Volume:** `postgres_data` for data persistence

### File Storage

- **Uploads:** Mounted volume `./uploads` for file attachments
- **Permissions:** Ensure the uploads directory is writable

## Commands

### Start the application
```bash
docker-compose up -d
```

### Stop the application
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f app
```

### Update the application
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

### Reset database (⚠️ This will delete all data)
```bash
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

### Check container status
```bash
docker-compose ps
```

### Check application logs
```bash
docker-compose logs app
```

### Check database logs
```bash
docker-compose logs database
```

### Login Issues

If you cannot login with admin/password123, this may indicate the database setup needs manual intervention:

1. **Check if admin user exists:**
   ```bash
   docker exec -it biggs-permit-db psql -U postgres -d biggs_permit -c "SELECT username, full_name, role FROM users WHERE username = 'admin';"
   ```

2. **Check application logs for more details:**
   ```bash
   docker logs biggs-permit-app
   ```

3. **If the user doesn't exist, restart the containers (this will trigger re-seeding):**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. **Manual user creation (if automatic seeding fails):**
   ```bash
   docker exec -it biggs-permit-db psql -U postgres -d biggs_permit -c "
   INSERT INTO users (username, password, full_name, department, role) 
   VALUES ('admin', 'password123', 'System Administrator', 'IT', 'admin')
   ON CONFLICT (username) DO UPDATE SET password = 'password123', role = 'admin';
   "
   ```

**Note:** The system now uses bcrypt password hashing for security. Legacy plain-text passwords are automatically detected and handled during login.

### Rebuild after code changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Production Deployment

For production deployment, consider:

1. **Security:**
   - Change default database credentials
   - Use environment variables for secrets
   - Enable SSL/TLS termination

2. **Performance:**
   - Adjust memory limits in docker-compose.yml
   - Configure proper logging levels
   - Set up monitoring and health checks

3. **Backup:**
   - Regular database backups
   - Backup the uploads directory
   - Test restore procedures

## Custom Configuration

### Custom Database Configuration

Edit `docker-compose.yml` to customize database settings:

```yaml
database:
  environment:
    POSTGRES_DB: your_database_name
    POSTGRES_USER: your_username
    POSTGRES_PASSWORD: your_secure_password
```

### Custom Application Port

Change the port mapping in `docker-compose.yml`:

```yaml
app:
  ports:
    - "8080:5000"  # Access via localhost:8080
```

## Support

For issues and questions:
- Check the application logs for error messages
- Verify Docker and Docker Compose versions
- Ensure sufficient system resources are available