# Social Hub

Post text, images and video to Facebook, Instagram, YouTube and X from one screen, for three companies
(Hariom Ashram, Vedika Wellness, UnkganIT), with scheduling and a basic analytics dashboard.

**Hosting (GitHub + Supabase only):**
- `app/`, `components/`, `lib/`: static Next.js site, deployed to GitHub Pages by `.github/workflows/pages.yml`
- `supabase/functions/api/`: backend Edge Function, deployed by `.github/workflows/deploy-backend.yml`
- `supabase/schema.sql`, `supabase/cron.sql`: database setup and schedules

**Setup:** follow [`docs/API-SETUP.md`](docs/API-SETUP.md).

Local development: `cp .env.example .env.local`, fill it in, `npm install`, `npm run dev`.
