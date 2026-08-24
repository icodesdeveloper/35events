# 35events

Website + webapp voor 35events: publieke site met events en media, een deelnemersportaal (registratie, eigen account of login-link), en een admin-gedeelte voor het beheren van events, media en registraties.

## Stack

Next.js (App Router, TypeScript, Tailwind v4) + MySQL/Prisma + Auth.js v5 (admin via Authentik OIDC, deelnemers via wachtwoord/magic link) + lokale disk-opslag voor media.

## Lokaal opzetten

1. **Database** — start een lokale MySQL via Docker:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
2. **Env** — kopieer `.env.example` naar `.env` en vul aan:
   - `AUTHENTIK_ISSUER` / `AUTHENTIK_CLIENT_ID` / `AUTHENTIK_CLIENT_SECRET` en `ADMIN_BOOTSTRAP_EMAIL` — nodig om op `/admin` in te loggen. Callback-URL in Authentik: `http://localhost:3000/api/auth/admin/callback/authentik`.
   - `SMTP_*` — optioneel voor lokale dev; zonder configuratie worden mails (login-links, registratiebevestigingen) naar de terminal gelogd in plaats van verstuurd.
3. **Installeren + migreren + seeden**:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```
4. **Dev server**:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run db:migrate` — Prisma migraties (dev)
- `npm run db:seed` — voorbeeldevents inladen
- `npm run db:studio` — Prisma Studio (databank inspecteren)
- `npm run lint`

## Structuur

- `app/(public)` — publieke site (home, events, media)
- `app/(participant)` — deelnemers-login/registratie/account
- `app/admin` — beheer (event-CRUD, media, registraties), beveiligd via `proxy.ts`
- `lib/auth/admin.ts` / `lib/auth/participant.ts` — twee losse Auth.js-instanties
- `lib/storage` — opslagabstractie (nu lokale disk, later evt. S3-compatible)

## Deployment (Pterodactyl)

Build command: `npm ci && npx prisma migrate deploy && npx prisma generate && npm run build`
Start command: `npm run start`

Zet `STORAGE_ROOT` op een submap van de persistente serverdata (bv. `/home/container/storage/uploads`). Volledige env-lijst staat in `.env.example`.
