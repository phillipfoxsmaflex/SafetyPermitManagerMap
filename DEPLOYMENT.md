# Biggs Deployment Guide

## Quick Installation

### Automated Setup (Recommended)
```bash
# Make installation script executable and run
chmod +x install.sh
./install.sh
```

The installation script will:
- Check and install system dependencies (Node.js 18+, PostgreSQL)
- Install npm dependencies
- Create database and user
- Generate secure passwords and session secrets
- Initialize database schema
- Create uploads directory
- Generate .env file with secure defaults

### Manual Installation

#### 1. System Requirements
```bash
# Install Node.js 18+ (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# macOS with Homebrew
brew install node postgresql@14
brew services start postgresql@14
```

#### 2. Database Setup
```bash
# Create database and user
sudo -u postgres psql
```
```sql
CREATE DATABASE biggs_permits;
CREATE USER biggs_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE biggs_permits TO biggs_user;
ALTER USER biggs_user CREATEDB;
\q
```

#### 3. Project Setup
```bash
# Clone and install dependencies
git clone <repository-url>
cd biggs-permit-system
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npm run db:push

# Seed with sample data (optional)
npx tsx server/seed.ts
```

## Production Deployment

### Environment Configuration
Update `.env` for production:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/biggs_prod
SESSION_SECRET=your-very-secure-64-character-secret
SECURE_COOKIES=true
COOKIE_DOMAIN=.yourdomain.com
```

### Build and Start
```bash
# Install production dependencies only
npm install --production

# Build application
npm run build

# Start production server
npm start
```

### Process Management (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'biggs-permits',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle file uploads
    client_max_body_size 10M;
}
```

### SSL with Certbot
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Management

### Backup
```bash
# Create backup
pg_dump -h localhost -U biggs_user -d biggs_permits > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup
echo "0 2 * * * pg_dump -h localhost -U biggs_user -d biggs_permits > /backup/biggs_$(date +\%Y\%m\%d).sql" | crontab -
```

### Restore
```bash
# Restore from backup
psql -h localhost -U biggs_user -d biggs_permits < backup_file.sql
```

### Schema Updates
```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:push
```

## Monitoring & Maintenance

### Health Check
```bash
# Simple health check
curl -f http://localhost:5000/api/auth/user || echo "Service down"

# Add to cron for monitoring
echo "*/5 * * * * curl -f http://localhost:5000/api/auth/user || echo 'Biggs service down' | mail admin@yourdomain.com" | crontab -
```

### Log Management
```bash
# PM2 logs
pm2 logs biggs-permits

# System logs with rsyslog
echo "local0.*    /var/log/biggs.log" >> /etc/rsyslog.conf
systemctl restart rsyslog
```

### Performance Monitoring
```bash
# Install monitoring tools
npm install -g clinic htop

# Monitor with PM2
pm2 install pm2-server-monit
```

## Docker Deployment (Alternative)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://biggs_user:password@db:5432/biggs_permits
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=biggs_permits
      - POSTGRES_USER=biggs_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

```bash
# Deploy with Docker
docker-compose up -d
```

## Security Checklist

### Pre-Production
- [ ] Strong database passwords (20+ characters)
- [ ] Secure session secret (64+ characters)
- [ ] HTTPS enabled with valid certificates
- [ ] Secure cookies enabled
- [ ] Database firewall configured
- [ ] Regular backups scheduled
- [ ] Log monitoring enabled
- [ ] File upload limits configured
- [ ] Rate limiting implemented (if needed)

### Post-Deployment
- [ ] Default admin password changed
- [ ] Test user accounts removed
- [ ] Security headers configured
- [ ] Database access audited
- [ ] Backup restore tested
- [ ] Monitoring alerts configured
- [ ] SSL certificate auto-renewal tested

## Troubleshooting

### Common Issues
1. **Database connection failed**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Test connection: `psql $DATABASE_URL`

2. **Session errors**
   - Verify SESSION_SECRET is set
   - Check cookie domain configuration
   - Clear browser cookies

3. **File upload errors**
   - Check uploads directory permissions
   - Verify MAX_FILE_SIZE setting
   - Check disk space

4. **Build failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version: `node --version`
   - Update dependencies: `npm update`

### Support
- Check application logs: `pm2 logs biggs-permits`
- Database logs: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`
- System resources: `htop` or `top`