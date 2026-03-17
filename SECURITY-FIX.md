# Security Fix - Malware Incident

## Incident Summary
- **Date:** 2026-03-12
- **Malware:** Cryptominer in `/tmp/mysql` and `/tmp/init`
- **Attack Vector:** Exposed PostgreSQL port 5432 to internet
- **Status:** ✅ Malware removed, container restarted

## Root Cause
PostgreSQL, Redis, Kafka ports exposed to `0.0.0.0` (public internet) with weak credentials.

## Immediate Actions Taken
1. ✅ Killed malware processes (PID 837474, 3063562, 836972, 837429)
2. ✅ Removed malware files from container
3. ✅ Restarted tpb-postgres container

## Required Security Fixes

### 1. Bind Ports to Localhost Only
Edit `infra/docker-compose.yml`:

```yaml
services:
  postgres:
    ports:
      - "127.0.0.1:5432:5432"  # ← Add 127.0.0.1
  
  redis:
    ports:
      - "127.0.0.1:6379:6379"  # ← Add 127.0.0.1
  
  kafka:
    ports:
      - "127.0.0.1:9092:9092"  # ← Add 127.0.0.1
  
  elasticsearch:
    ports:
      - "127.0.0.1:9200:9200"  # ← Add 127.0.0.1
  
  kibana:
    ports:
      - "127.0.0.1:5601:5601"  # ← Add 127.0.0.1
```

### 2. Change Default Passwords
Edit `.env`:

```bash
POSTGRES_PASSWORD=<strong-random-password>
SUPERSET_SECRET_KEY=<strong-random-key>
```

### 3. Enable Firewall
```bash
# Allow only SSH
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. PostgreSQL Security
Add to `infra/scripts/init-db.sh`:

```sql
-- Disable dangerous extensions
ALTER SYSTEM SET shared_preload_libraries = '';
-- Restrict COPY PROGRAM
ALTER SYSTEM SET allow_system_table_mods = off;
```

### 5. Scan for Backdoors
```bash
# Install ClamAV
sudo apt install clamav clamav-daemon
sudo freshclam
sudo clamscan -r /var/lib/docker/volumes/
```

## Verification
```bash
# Check ports are localhost only
sudo netstat -tulpn | grep -E "5432|6379|9092"
# Should show 127.0.0.1, NOT 0.0.0.0

# Check no malware processes
ps aux | grep -E "/tmp/mysql|/tmp/init"
```

## Prevention
- Never expose database ports to 0.0.0.0
- Use strong passwords (20+ chars, random)
- Enable firewall
- Regular security audits
- Monitor logs for suspicious activity
