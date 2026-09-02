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
- `npm run media:derivatives` — thumbnails/previews genereren (zie hieronder)

## Media-compressie (thumbnails & previews)

Bij het uploaden van een **foto** worden er automatisch twee verkleinde WebP-versies
naast het origineel weggeschreven (`lib/storage/deriveImages.ts`):

| bestand | afmeting | waar gebruikt |
| --- | --- | --- |
| `<naam>_thumb.webp` | max 640px | grid-tegels (publieke galerij én admin) |
| `<naam>_preview.webp` | max 1920px | lightbox / schermvullend bekijken |
| `<naam>.<ext>` (origineel) | onaangeroerd | **alleen** bij een expliciete download |

Zo laadt een galerij met honderden foto's niet langer de originelen van 10+ MB.
De paden staan in `EventMedia.thumbPath` / `previewPath`; is een van beide `null`
(video's, niet-decodeerbare bestanden, oude rijen), dan valt alles terug op het
origineel. Rechten gelden voor alle drie de bestanden — een preview van een
verborgen sectie is dus net zo goed afgeschermd.

### Bestaande foto's bijwerken

Media die al geüpload was vóór deze feature heeft nog geen derivatives:

```bash
npm run media:derivatives
```

Draait alleen over media die er nog geen heeft — foto's zonder thumb/preview,
en video's zonder transcode of die op `PROCESSING` blijven hangen. Veilig om
opnieuw uit te voeren (een tweede run meldt simpelweg dat er niets te doen is).

### Video's (poster + transcoding)

Bij een **video**-upload gebeurt hetzelfde principe, maar met ffmpeg
(`lib/storage/deriveVideo.ts`):

| bestand | wat | waar gebruikt |
| --- | --- | --- |
| `<naam>_thumb.webp` / `_preview.webp` | poster-frame (1 sec in) | grid-tegel en `<video poster>` |
| `<naam>_web.mp4` | 1080p H.264 + AAC, `faststart` | afspelen in de lightbox |
| `<naam>.<ext>` (origineel) | onaangeroerd | alleen bij download |

De grid-tegel is nu een **stilstaand beeld met een play-knop**. Voorheen kreeg
elke video-tegel een `<video autoplay loop>` die het volledige origineel bleef
streamen; nu wordt er geen enkele byte video geladen tot iemand op play klikt.

ffmpeg wordt meegeleverd via het `ffmpeg-static`-pakket, dus je hoeft **niets te
installeren op de server**. Wil je toch een eigen build gebruiken, zet dan
`FFMPEG_PATH` in `.env`.

Transcoderen duurt lang (minuten voor een grote file), dus het gebeurt **in de
achtergrond ná de upload**. De rij staat zolang op `processingStatus =
PROCESSING` en de admin toont "Video wordt verwerkt...", tot hij `READY` is.
Herstart de server middenin een transcode, dan blijft een video op `PROCESSING`
staan — `npm run media:derivatives` pikt die vanzelf weer op.

Levert het transcoderen een *groter* bestand op dan het origineel (kan gebeuren
bij een korte, al efficiënt gecomprimeerde clip), dan wordt het weggegooid en
speelt de player gewoon het origineel af.

### Opnieuw genereren

Ben je niet tevreden over de kwaliteit, of heb je de afmetingen/kwaliteit in
`lib/storage/deriveImages.ts` aangepast? Genereer dan alles opnieuw:

```bash
npm run media:derivatives -- --force
```

De derivatives worden **altijd opnieuw uit het origineel opgebouwd** en
overschreven onder dezelfde bestandsnaam, dus het origineel blijft intact en er
blijven geen weesbestanden achter. Je mag de `_thumb.webp` / `_preview.webp`
bestanden dus gerust van schijf verwijderen en daarna `--force` draaien om ze te
herstellen — zonder `--force` worden die rijen overgeslagen, omdat de paden dan
nog in de databank staan.

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

**`SITE_URL` is verplicht in productie**, bv. `SITE_URL=https://35events.com`. De app
draait met `-H 0.0.0.0`, dus een verzoek kent zijn eigen publieke domein niet — zonder
deze variabele wijzen media-deellinks, e-maillinks en de sitemap naar
`http://localhost:3000` of `http://0.0.0.0:<poort>`. Ontbreekt hij, dan logt de app
bij het opstarten een waarschuwing.

### Geheugen tijdens de build

`next build` bepaalt zijn aantal workers via `os.cpus()`, en dat rapporteert in
een container de **cores van de host** in plaats van je eigen limiet. Op een
kleine container start hij daardoor tien of meer worker-processen en wordt de
build door de kernel afgeschoten — je ziet dan enkel `Killed`, gevolgd door
`Could not find a production build in the '.next' directory` omdat er niets
gebouwd is.

`next.config.ts` zet daarom `experimental.cpus` vast (standaard 2). Nog te krap?
Zet `NEXT_BUILD_CPUS=1` in de env. Meer geheugen beschikbaar en liever een
snellere build? Zet hem hoger.

Helpt ook op een krappe container: `NODE_OPTIONS=--max-old-space-size=1536`
(kies een waarde ónder je containerlimiet). V8 gaat dan zelf opruimen vóór de
kernel ingrijpt, in plaats van tegen de harde limiet aan te lopen.

### Start-commando

Het Pterodactyl-startveld verwacht één regel — plak deze exact zo, zonder
regeleindes:

```
if [[ -d .git ]] && [[ "${AUTO_UPDATE}" == "1" ]]; then git pull; fi && npm ci && npx prisma generate && npx prisma db push && npm run build && npx next start -p ${SERVER_PORT} -H 0.0.0.0
```

Twee dingen die daarin bewust anders zijn dan voorheen:

- **`&&` in plaats van `;`.** Met `;` start `next start` ook wanneer de build
  faalde, en dan krijg je de verwarrende "Could not find a production build" in
  plaats van de échte fout (bv. een OOM-kill).
- **`npm run media:derivatives` is eruit.** Eén grote video transcoderen duurt
  minuten, en zolang staat de site plat. Nieuwe uploads krijgen hun derivatives
  sowieso automatisch; draai dit script handmatig wanneer je oude media
  bijwerkt of een onderbroken transcode wil hervatten.

`npx prisma db push` blijft hier staan omdat de database daarmee is opgebouwd.
Wil je naar `prisma migrate deploy`, dan moet je de bestaande migraties eerst
baselinen met `prisma migrate resolve --applied <naam>` — anders probeert
`migrate deploy` alle migraties toe te passen op tabellen die al bestaan.
