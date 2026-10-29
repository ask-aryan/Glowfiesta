# GlowFiesta Treasure Hunt Platform

Mobile-friendly office Treasure Hunt management app.  
Built with Next.js 14, TypeScript, Prisma, MySQL, Bootstrap 5.

## Prerequisites

- Node.js 20 LTS
- pnpm (`npm i -g pnpm`)
- MySQL 8 (office server)

## Local Development

### 1. Clone / copy project

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/treasure_hunt"
SESSION_SECRET="replace-with-32-char-random-secret!!"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Install dependencies
```bash
pnpm install
```

### 4. Create MySQL database
```sql
CREATE DATABASE treasure_hunt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Run migrations
```bash
pnpm prisma migrate dev --name init
```

### 6. Create organizer account
```bash
pnpm prisma db seed
```
Default credentials: `admin` / `admin123`  
**Change the password after first login (currently manual via DB).**

### 7. Start development server
```bash
pnpm dev
```
Open http://localhost:3000

---

## Running Tests
```bash
pnpm test
```

## Production Build
```bash
pnpm build
pnpm start
```

---

## Office Server Deployment

### Requirements
- Node.js 20 + pnpm on the server
- MySQL 8 accessible from the server
- HTTPS (required for phone camera access)

### Steps
```bash
# 1. Copy project to server
# 2. Set production .env (DATABASE_URL, SESSION_SECRET, NEXT_PUBLIC_APP_URL with https://)
# 3. Install & migrate
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed          # only on first deploy

# 4. Build
pnpm build

# 5. Start (use pm2 or systemd to keep running)
pnpm start                   # listens on port 3000
```

### nginx reverse proxy (HTTPS)
```nginx
server {
    listen 443 ssl;
    server_name office-host;
    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Game Setup Workflow

1. Log in as organizer → **Create Event**
2. Go to event → **Add Teams** (set username + password for each team)
3. Go to **Clues** → add one clue per stage (set result number), add one common final clue
4. Go to **QR Codes** → **Generate QR Codes** → **Download PDF**
5. Print the PDF, place QR cards at physical locations
6. Go to event → **Start** the event
7. Hand each team their first physical clue card
8. Monitor **Progress** dashboard — verify teams and release next clues

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Camera not working | Must use HTTPS; check browser camera permission |
| MySQL connection refused | Check DATABASE_URL; verify MySQL is running |
| Session not persisting | SESSION_SECRET must be ≥ 32 chars |
| QR scan says invalid | Token may have been regenerated; reprint QR PDF |
| Phone can't reach app | Check office firewall allows port 443/3000 |

---

## Secret Rotation
1. Generate a new `SESSION_SECRET`
2. Update `.env`
3. Restart the app — all active sessions will be invalidated (users re-login)

## Database Backup
```bash
mysqldump -u USER -p treasure_hunt > backup_$(date +%Y%m%d).sql
# Restore:
mysql -u USER -p treasure_hunt < backup_YYYYMMDD.sql
```

## Default Assumptions
- 5 teams, 5 stages, 1 common final QR = 26 QR codes total
- Winner = earliest server-side `completedAt` timestamp
- Receptionist must verify each stage before next clue is released
- QR displays a number (not the next riddle)
