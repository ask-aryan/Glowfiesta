# GlowFiesta Production Docker Deployment Guide (Oracle Linux)

This guide walks you through deploying **GlowFiesta** on **Oracle Linux** with **Docker**, **MySQL 8.0**, and **Nginx Reverse Proxy** using your wildcard SSL certificate for `*.e-connectsolutions.com`.

- **Application Domain:** `https://glowfiesta2026.e-connectsolutions.com`
- **Database:** MySQL 8.0 (Containerized)
- **Web Server / SSL Termination:** Nginx (Containerized with HTTP/2 and auto-redirect to HTTPS)

---

## 1. Prerequisites on Oracle Linux

### 1.1 Install Docker & Docker Compose
If Docker is not already installed on your Oracle Linux instance:

```bash
# Update dnf
sudo dnf update -y

# Enable docker-ce repo
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine and Compose plugin
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin openssl git

# Enable and start Docker service
sudo systemctl enable --now docker

# Optional: Allow current user to run docker commands without sudo
sudo usermod -aG docker $USER
newgrp docker
```

### 1.2 Open Firewall Ports in Oracle Linux
Oracle Linux comes with `firewalld` enabled by default:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 2. Extract SSL Certificates from PFX

You mentioned you have the **`.pfx`** and **`private.key`** files. Nginx requires a **PEM-encoded Certificate (`.crt`)** and **Private Key (`.key`)**.

### Convert `.pfx` to `.crt` (Certificate Chain)
Run this command on your machine or on the Oracle Linux server where openssl is installed:

```bash
# Extract the certificate and intermediate CA chain from PFX:
openssl pkcs12 -in e-connectsolutions.pfx -clcerts -nokeys -out e-connectsolutions.crt

# If your PFX contains CA certificates (bundle), extract all certs into one chain:
openssl pkcs12 -in e-connectsolutions.pfx -nokeys -out e-connectsolutions.crt
```

### Ensure Private Key is in unencrypted RSA/EC format
If your existing `private.key` is password-protected or you want to extract it freshly from the PFX:

```bash
openssl pkcs12 -in e-connectsolutions.pfx -nocerts -nodes -out e-connectsolutions.key
```

Verify you have these two files:
1. `e-connectsolutions.crt`
2. `e-connectsolutions.key`

---

## 3. Clone Repository & Setup Structure

```bash
# Clone the repository
git clone https://github.com/ask-aryan/Glowfiesta.git
cd Glowfiesta/treasure-hunt

# Create the certs directory
mkdir -p certs

# Copy your certificates into the certs folder:
cp /path/to/e-connectsolutions.crt ./certs/e-connectsolutions.crt
cp /path/to/e-connectsolutions.key ./certs/e-connectsolutions.key

# Ensure secure permissions for the SSL key
chmod 600 ./certs/e-connectsolutions.key
chmod 644 ./certs/e-connectsolutions.crt
```

---

## 4. Configure Environment Variables

Copy the provided docker environment template:

```bash
cp .env.docker.example .env
```

Review or customize your passwords in `.env`:
```bash
nano .env
```
Key settings:
- `MYSQL_ROOT_PASSWORD` : Secure root password for MySQL.
- `MYSQL_PASSWORD` : Password for `glowuser`.
- `SESSION_PASSWORD` : Secret string with at least 32 characters.
- `NEXT_PUBLIC_APP_URL` : `https://glowfiesta2026.e-connectsolutions.com`

---

## 5. Switch Prisma to MySQL & Build Containers

Before starting the containers, switch the active schema to MySQL:

```bash
node scripts/switch-db.mjs mysql
```

Now build the Docker images and start the stack in detached mode:

```bash
docker compose up -d --build
```

### Verify Container Status
Check that all 3 containers are up and healthy:

```bash
docker compose ps
```
You should see:
- `glowfiesta-mysql` (Up, healthy)
- `glowfiesta-app` (Up)
- `glowfiesta-nginx` (Up, ports 80 & 443 active)

---

## 6. Initialize the MySQL Database Schema & Seed Data

Once the MySQL container is healthy, run Prisma db push inside the running app container to create tables:

```bash
# Push the Prisma schema into MySQL
docker compose exec app npx prisma db push

# (Optional) Seed the initial admin / default event if needed:
docker compose exec app npm run db:seed
```

---

## 7. Useful Management Commands

### View Live Logs:
```bash
# All services:
docker compose logs -f

# App only:
docker compose logs -f app

# Nginx only:
docker compose logs -f nginx
```

### Restart Stack:
```bash
docker compose restart
```

### Stop Stack:
```bash
docker compose down
```

### Database Backup & Restore:
```bash
# Backup MySQL database:
docker compose exec mysql mysqldump -u root -pRootPass2026! treasure_hunt > backup_$(date +%F).sql

# Restore:
docker compose exec -T mysql mysql -u root -pRootPass2026! treasure_hunt < backup.sql
```

### Update / Redeploy New Code:
Whenever you pull new commits from Git:
```bash
git pull origin main
node scripts/switch-db.mjs mysql
docker compose up -d --build
docker compose exec app npx prisma db push
```

---

## 8. Verification

1. Open your browser and navigate to:
   ```
   https://glowfiesta2026.e-connectsolutions.com
   ```
2. Verify:
   - Green SSL padlock is showing for `*.e-connectsolutions.com`.
   - Visiting `http://glowfiesta2026.e-connectsolutions.com` automatically redirects to `https://`.
   - Login to `/login` with username `admin` and password from `.env`.
