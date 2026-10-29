# Treasure Hunt — Flow & Pending Changes

## Current Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: MySQL 8 via Prisma 5 ORM
- **Auth**: iron-session (encrypted HTTP-only cookies)
- **UI**: Pure inline styles + globals.css (no Bootstrap)
- **Fonts**: Inter (admin), Fredoka (player), JetBrains Mono (passwords)
- **QR generation**: `qrcode` npm (client-side PNG) + `pdfkit` (server-side PDF)
- **QR scanning**: `html5-qrcode` (browser camera)
- **Design**: Saffron `#FF6B35`, Navy `#0b1220`, Gold `#FFC857`

---

## Roles

| Role | Login | Access |
|------|-------|--------|
| ORGANIZER | `/login` → `/organizer` | Admin panel — manage events, teams, clues, QR, progress |
| TEAM | `/login` → `/player` | Player app — see clue, scan QR, view progress |

---

## Correct Game Flow (How It Should Work)

```
ORGANIZER sets up event
    ↓
Adds N teams (each gets unique username + password)
    ↓
Adds clues — 1 clue per team per stage (Team A Stage 1 clue ≠ Team B Stage 1 clue)
    ↓
Generates QR codes — 1 QR per team per stage + 1 shared Common Final QR
    ↓
Prints QR PDF → places printed QRs at physical locations
    ↓
Event goes LIVE
    ↓
Teams log in on their phones
    ↓
Player app shows Stage 1 clue (team-specific)
    ↓
Team reads clue → goes to that location → takes team SELFIE → scans QR
    ↓
App shows a NUMBER (e.g. "7") → team goes to reception desk and says the number
    ↓
Organizer at reception types the number into Live Progress page → clicks Verify
    ↓
Stage marked complete → player app automatically shows Stage 2 clue
    ↓
Loop repeats for all stages
    ↓
After all stages done → team scans the Common Final QR (shared, same for everyone)
    ↓
Team is COMPLETED → trophy screen shown
    ↓
Organizer sees leaderboard ordered by completion time
```

---

## Database Models (Current)

| Model | Purpose |
|-------|---------|
| `User` | Login accounts — organizers and team users |
| `Event` | The hunt event (name, status, stagesPerTeam) |
| `Team` | A team in an event (teamName, plainPassword, status) |
| `Clue` | A clue for a stage — **currently NOT team-specific (BUG)** |
| `QrCode` | One QR per team per stage + 1 common final. Stores tokenHash |
| `TeamStageProgress` | Tracks each team's status at each stage |
| `ScanHistory` | Log of every QR scan attempt (success + failures) |
| `Selfie` | Team selfie photo (base64 JPEG) taken before each QR scan |
| `AuditLog` | Organizer actions log |

---

## What Is Working ✅

### Organizer Panel (`/organizer`)
- [x] Create event (name, description, teams count, stages, common final QR toggle)
- [x] Edit event name/description (DRAFT only)
- [x] Delete event (cascade deletes everything)
- [x] Event status stepper: DRAFT → READY → LIVE → PAUSED → COMPLETED
- [x] Add team (auto-creates User account + initialises stage progress rows)
- [x] Edit team name / reset password
- [x] Delete team (cascades user, progress, QR codes, scan history)
- [x] Add clue (stage number, clue text, result number, common final toggle)
- [x] Edit clue text / result number / stage number
- [x] Delete clue
- [x] Generate QR codes — 1 per team per stage + 1 common final
- [x] Regenerate QR codes (delete + recreate)
- [x] Download QR codes as PDF (printable)
- [x] Display QR grid in browser (team filter tabs, individual PNG download)
- [x] Live Progress dashboard (auto-refreshes every 5s with countdown bar)
- [x] Reception verify-and-release (type team's number → verify → unblocks team)
- [x] Team Selfies gallery (grouped by team, with stage + time)

### Player App (`/player`)
- [x] Login → session cookie → redirect to `/player`
- [x] Shows team name, event name, current stage
- [x] Stage progress stepper (NOT_STARTED / active / done)
- [x] Shows clue text for current stage (when event is LIVE)
- [x] SCAN QR button (disabled when event not LIVE or PAUSED)
- [x] Selfie screen before scanning (mandatory — camera denial blocks scan)
- [x] Selfie uploaded to DB before QR scanner opens
- [x] QR scanner (back camera, animated bracket UI)
- [x] Success screen: shows the number to report at reception
- [x] Fail screen: witty Hinglish error messages (no team/stage hints leaked)
- [x] Final/win screen: trophy + burst animation
- [x] Error cases handled: wrong team QR, wrong sequence, duplicate scan, final too early

### Security
- [x] Session-based auth (iron-session, HTTP-only cookie)
- [x] All organizer routes check `role === ORGANIZER`
- [x] All player routes check `role === TEAM` and use `session.teamId` (never client-supplied)
- [x] Wrong-team QR rejected server-side
- [x] Sequence enforcement (can't skip stages)
- [x] Error messages reveal zero info about stage numbers, team names, or final QR

---

## What Is Broken / Pending ❌

### BUG 1 — Clues are not team-specific (CRITICAL)
**Problem:** The `Clue` model has no `teamId`. All clues are shared across teams.  
**Effect:** Player dashboard shows the same clues to every team. A team with 3 generic clues for Stage 1 sees all 3 instead of their own unique clue.  
**Correct behaviour:** Each team should have exactly 1 unique clue per stage. Team A's Stage 1 clue leads to a different location than Team B's Stage 1 clue.

**Changes needed:**
1. Add `teamId Int? @map("team_id")` to `Clue` model in `schema.prisma`
2. Add `Team` relation to `Clue` and `clues Clue[]` to `Team`
3. Run `prisma migrate dev`
4. **Rewrite organizer clues page** as a grid (Teams as columns × Stages as rows)
   - Each cell = 1 clue input for that team + stage
   - Inline save per cell (no separate add form)
   - Common final row at the bottom (single shared clue, no teamId)
5. Update `POST /api/organizer/events/[eventId]/clues` to accept `teamId`
6. Update `PATCH/DELETE /api/organizer/events/[eventId]/clues/[clueId]` (no change needed)
7. **Update player page** — `getCluesForStage` must filter by `teamId`
8. **Show clue progressively** — Stage 1 clue shown immediately on LIVE. Stage N clue shown only after Stage N-1 is `NEXT_CLUE_RELEASED` (i.e., reception has verified it)
9. Delete existing non-team-specific clues from DB after migration

---

### BUG 2 — Player sees all stage clues at once (linked to BUG 1)
**Problem:** Currently shows all clues for the current stage number regardless of which team.  
**Fix:** After BUG 1 fix, player sees exactly 1 clue (their team's clue for the current stage), and only after the previous stage is verified.

---

### BUG 3 — Stage 1 clue visible before event is LIVE
**Problem:** If event goes from DRAFT → READY, the player can see the Stage 1 clue.  
**Fix:** Only fetch + show clue when `event.status === 'LIVE'` (already partially done — just verify).

---

### MISSING — Clue reveal timing on player dashboard
**Current:** Player sees current stage clue based on `currentStageProgress` (first non-completed stage).  
**Correct:** 
- Stage 1 clue: visible as soon as event is LIVE
- Stage N clue (N > 1): visible only after Stage N-1 is `NEXT_CLUE_RELEASED`
- While `AWAITING_RECEPTION_VERIFICATION`: show "Go to reception desk — show number X"

---

### MISSING — NEXT_PUBLIC_APP_URL for phones (Go-Live blocker)
**Problem:** QR codes encode `http://localhost:3000/scan/...` — won't work on phones.  
**Fix:**
1. Run `ipconfig` to get office server's local IP (e.g. `192.168.1.105`)
2. Update `.env`: `NEXT_PUBLIC_APP_URL=http://192.168.1.105:3000`
3. Restart server
4. Regenerate QR codes (old ones still encode localhost)
5. Reprint PDF

---

## Clues Page — Target Design

```
                 ┌──────────────┬──────────────┬──────────────┐
                 │   TEAM A     │   TEAM B     │   TEAM C     │
┌────────────────┼──────────────┼──────────────┼──────────────┤
│ Stage 1        │ [clue text]  │ [clue text]  │ [clue text]  │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ Stage 2        │ [clue text]  │ [clue text]  │ [clue text]  │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ Stage 3        │ [clue text]  │ [clue text]  │ [clue text]  │
├────────────────┴──────────────┴──────────────┴──────────────┤
│ Common Final (shared for all teams)           [clue text]   │
└─────────────────────────────────────────────────────────────┘
```

Each cell: click to edit inline → auto-save on blur or Enter.

---

## Player Dashboard — Target State Machine

| Stage Status | What Player Sees |
|---|---|
| Event not LIVE | "Waiting for the hunt to start…" |
| Stage 1, NOT_STARTED, event LIVE | Stage 1 clue (team-specific) |
| Any stage, AWAITING_RECEPTION_VERIFICATION | "Go to reception — show number **X**" |
| Stage N-1 NEXT_CLUE_RELEASED, Stage N NOT_STARTED | Stage N clue (team-specific) |
| All stages done, not yet scanned final QR | "Find the final QR and scan it!" |
| COMPLETED | Trophy screen |

---

## File Map

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login          — POST login, sets session cookie
│   │   ├── auth/logout         — POST logout
│   │   ├── organizer/events/
│   │   │   ├── route.ts        — GET list, POST create event
│   │   │   └── [eventId]/
│   │   │       ├── route.ts    — GET, PATCH (edit), DELETE (cascade)
│   │   │       ├── status/     — PATCH event status
│   │   │       ├── teams/
│   │   │       │   ├── route.ts         — GET list, POST create team
│   │   │       │   └── [teamId]/
│   │   │       │       ├── route.ts     — PATCH edit, DELETE
│   │   │       │       └── verify-release/ — POST verify stage
│   │   │       ├── clues/
│   │   │       │   ├── route.ts         — GET list, POST create clue
│   │   │       │   └── [clueId]/route.ts — PATCH edit, DELETE
│   │   │       ├── generate-qr/    — POST generate (force=true to regen)
│   │   │       ├── qr-pdf/         — GET download PDF
│   │   │       ├── progress/       — GET live progress for all teams
│   │   │       ├── selfies/        — GET all selfies for event
│   │   │       └── leaderboard/    — GET leaderboard
│   │   └── player/
│   │       ├── scan/           — POST process QR scan
│   │       └── selfie/         — POST save selfie to DB
│   ├── organizer/
│   │   ├── layout.tsx          — Sidebar nav (client component)
│   │   ├── page.tsx            — Events list
│   │   ├── CreateEventForm.tsx — Slide-over create form
│   │   ├── EventRowActions.tsx — Edit/delete per event row
│   │   └── events/[eventId]/
│   │       ├── page.tsx               — Event detail + status stepper
│   │       ├── EventStatusActions.tsx  — Status change buttons
│   │       ├── teams/
│   │       │   ├── page.tsx           — Teams table
│   │       │   ├── AddTeamForm.tsx
│   │       │   ├── PasswordCell.tsx   — Show/hide password
│   │       │   └── TeamRowActions.tsx — Edit/delete per team
│   │       ├── clues/
│   │       │   ├── page.tsx           — ⚠️ NEEDS REDESIGN (grid)
│   │       │   ├── AddClueForm.tsx    — ⚠️ NEEDS UPDATE (teamId)
│   │       │   └── ClueRowActions.tsx — Edit/delete per clue
│   │       ├── qr/
│   │       │   ├── page.tsx    — QR display page
│   │       │   ├── QrGrid.tsx  — Client component, team filter tabs
│   │       │   └── QrActions.tsx — Generate / Regenerate / Download PDF
│   │       ├── progress/page.tsx   — Live progress dashboard
│   │       └── selfies/page.tsx    — Team selfies gallery
│   ├── player/
│   │   ├── page.tsx           — ⚠️ NEEDS FIX (clue filter by teamId + timing)
│   │   ├── PlayerLogout.tsx
│   │   └── scan/page.tsx      — Selfie → QR scan → result screens
│   ├── scan/[token]/page.tsx  — Direct URL scan (from printed QR)
│   └── login/page.tsx         — Login page (diya animation)
├── lib/
│   ├── auth.ts       — iron-session config, requireOrganizer, requireTeam
│   ├── db.ts         — Prisma client singleton
│   ├── qr.ts         — generateToken(), hashToken(), buildScanUrl()
│   ├── audit.ts      — writeAudit()
│   └── validation/   — Zod schemas
prisma/
├── schema.prisma     — ⚠️ NEEDS teamId added to Clue model
└── migrations/       — 3 migrations applied
```

---

## Pending Work — Priority Order

| # | Task | Effort | Blocker? |
|---|------|--------|----------|
| 1 | Add `teamId` to `Clue` schema + migration | Small | Yes — blocks all clue fixes |
| 2 | Rewrite clues page as team × stage grid | Medium | Yes — organizer can't enter correct data |
| 3 | Fix player page clue display (team-specific + timed reveal) | Small | Yes — players see wrong clues |
| 4 | Fix NEXT_PUBLIC_APP_URL → office server IP | Tiny | Yes — QR codes won't work on phones |
| 5 | Regenerate QR codes after URL fix | Tiny | Yes — old QRs encode localhost |
| 6 | Test full flow end-to-end on real phone | — | Final check |
