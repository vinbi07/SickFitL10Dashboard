# SickFit L10 Dashboard

Production-focused Next.js App Router implementation for SickFit weekly L10 meetings.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Supabase (Postgres + Realtime)
- Framer Motion
- Team password auth using signed HTTP-only session cookies

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment values:

```bash
cp .env.example .env.local
```

Required vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TEAM_PASSWORD`
- `SESSION_SECRET`

3. Add local header font files:

- `public/fonts/Gilroy-Bold.woff2`
- `public/fonts/Gilroy-Bold.woff`

4. Run Supabase migrations in order:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_seed_data.sql`
- `supabase/migrations/003_agenda_items.sql`

5. Start development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Current Features Implemented

- Password gate at `/login` validating against `TEAM_PASSWORD`
- Route protection via Next.js `proxy.ts` using signed session cookie
- Hybrid dashboard with:
	- Scorecard inline actual editing and red alert styling when `actual < goal`
	- IDS issues priority/status controls and threaded comments
	- Rocks owner/status tracking
	- To-Dos completion toggles
- Presentation mode slider with 7 L10 agenda segments
- Persistent header timer that resets to segment defaults
- Supabase realtime subscriptions for live cross-session sync
