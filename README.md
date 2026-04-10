# Ménage Petit Nemo

Tiny web app to schedule the Saturday cleaning of the **Petit Nemo** daycare by
parents on duty. Bilingual (French / English), no user accounts, runs on
Cloudflare Workers + D1.

## What it does

- Admin creates the list of families and generates the Saturdays of the season.
- Each Saturday has two cleaning slots.
- Parents open the site (gated by a shared password), pick an empty slot, and
  assign it to their family.
- A tally shows how many cleanings each family has done out of its quota
  (typically 4 per year).
- Quota is enforced server-side; a unique constraint prevents two parents from
  grabbing the same slot at the same time.

## Stack

- **Cloudflare Workers** — API + static asset hosting, single deploy
- **Cloudflare D1** — SQLite-backed persistence
- **Vanilla HTML/CSS/JS** — no build step, no framework
- **HMAC-signed cookies** — two capability tokens (`mnp_family`, `mnp_admin`)

No Node runtime dependency other than `wrangler` for dev/deploy.

## Authentication model

Two shared passwords, set as Worker secrets:

| Secret | Purpose |
| --- | --- |
| `FAMILY_PASSWORD` | Required to view/edit the schedule. Handed out at the daycare reception. Anti-bot gate. |
| `ADMIN_PASSWORD` | Required to access `/admin.html` (manage families, Saturdays, reset). |
| `COOKIE_SECRET` | Random 32+ character string used to HMAC the auth cookies. |

No per-parent accounts. Releases of a slot are a soft-trust operation (any
authenticated family can release any slot, with a confirmation prompt).

## Local development

You need Node 18+ and a Cloudflare account (the free tier is fine).

```bash
npm install
```

### 1. Create a local D1 database and apply migrations

```bash
npm run db:migrate:local
```

This creates a local SQLite file under `.wrangler/` and runs
`migrations/0001_init.sql` against it.

### 2. Provide local secrets

Create a `.dev.vars` file in the repo root (it's gitignored):

```ini
FAMILY_PASSWORD=nemo2026
ADMIN_PASSWORD=change-me
COOKIE_SECRET=pick-a-long-random-string-at-least-32-chars
```

### 3. Run the dev server

```bash
npm run dev
```

Wrangler prints a local URL (typically `http://127.0.0.1:8787`). Open it, log
in with `FAMILY_PASSWORD`, and you should see an empty schedule. Visit
`/admin.html`, log in with `ADMIN_PASSWORD`, then:

1. Add a few families in the **Familles / Families** tab.
2. In the **Samedis / Saturdays** tab, generate Saturdays for a date range
   (e.g. `2026-09-01` → `2027-06-30`).
3. Go back to `/` and test claiming / releasing slots.

### Smoke-test checklist

- [ ] Wrong family password is rejected
- [ ] Correct family password lets you see the schedule
- [ ] After login, a "who are you?" dialog picks the current family
- [ ] Current family is shown in the header with a **Change** button
- [ ] `/tally.html` shows the per-family counter and totals
- [ ] Admin panel is blocked without the admin password
- [ ] Adding a family appears on the main page
- [ ] Generating Saturdays creates rows (skip dates are honored)
- [ ] Claiming an empty slot only asks for confirmation (no picker)
- [ ] Claiming a taken slot returns "slot taken"
- [ ] Same family claiming both slots of the same Saturday is blocked
- [ ] A family that has reached its quota can STILL claim more slots
      (quota is informational — an info banner appears above the schedule)
- [ ] Releasing a slot frees it
- [ ] On an owned future slot, an explicit "📅 Add to calendar" button
      sits below the family name and downloads an .ics with:
      the Saturday cleaning 09:00–12:00 and a Friday key-pickup 16:00–18:00
- [ ] × release button only appears on the current family's own slots
- [ ] Server rejects a release for another family (admin cookie bypasses)
- [ ] Past Saturdays show no claim/release buttons for regular families,
      and the server rejects their edits
- [ ] Logged in as admin, past Saturdays show claim/release buttons, and
      claiming an empty past slot opens a family picker
- [ ] Generating a Saturday with today's date in the past (back-test) renders as locked
- [ ] Language toggle swaps FR ↔ EN everywhere
- [ ] Marking a Saturday **closed** removes its slots from the count
- [ ] Reset (danger zone) clears all assignments

## Deploying to Cloudflare

### 1. Install wrangler and log in

```bash
npm install
npx wrangler login
```

### 2. Create the D1 database

```bash
npm run db:create
```

Copy the `database_id` it prints and paste it into `wrangler.toml`, replacing
`REPLACE_WITH_D1_DATABASE_ID`.

### 3. Apply migrations to the remote database

```bash
npm run db:migrate
```

### 4. Set secrets

```bash
npx wrangler secret put FAMILY_PASSWORD
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put COOKIE_SECRET
```

Use a long random string for `COOKIE_SECRET` (e.g.
`openssl rand -base64 48`).

### 5. Deploy

```bash
npm run deploy
```

Wrangler prints the Worker URL. Share it (plus the family password) with
parents.

## Data model

See `migrations/0001_init.sql` for the canonical schema.

```
families    (id, name, quota, active)
saturdays   (id, date UNIQUE, note, closed)
assignments (id, saturday_id, family_id, slot, created_at,
             UNIQUE(saturday_id, slot))
config      (key, value)
```

The `UNIQUE(saturday_id, slot)` constraint is how we keep two parents from
double-booking the same slot during a race — the second `INSERT` fails and the
UI reloads the state.

## Project layout

```
.
├── migrations/
│   └── 0001_init.sql
├── public/              # static assets served by the Worker
│   ├── index.html
│   ├── tally.html
│   ├── admin.html
│   ├── app.js
│   ├── tally.js
│   ├── admin.js
│   ├── i18n.js
│   └── styles.css
├── src/
│   ├── worker.js        # Worker entry, routing
│   ├── auth.js          # cookie signing, password checks, throttle
│   └── db.js            # D1 query helpers
├── wrangler.toml
├── package.json
└── README.md
```

## Roadmap / v2

- **iCal calendar subscription** — per-family `.ics` URLs so each parent can
  subscribe in Google/Apple Calendar and get reminders. Planned shape:
  `GET /api/calendar/:token.ics` (token stored on the family row; admin
  generates and copies it). A VALARM entry gives a 24h reminder.
- Per-family "I'm <Family>" mode that scopes release buttons and pre-selects
  in the claim modal.
- Audit log for claim/release events.
- Email reminders the week before (Cron Trigger + Resend/Mailchannels).
- Swap request flow (family A proposes to swap with family B).

## License

Private — for internal use by the Petit Nemo daycare community.
