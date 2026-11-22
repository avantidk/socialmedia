# Social Hub

Post text, images and video to Facebook, Instagram, YouTube and X from one screen, for three companies
(Hariom Ashram, Vedika Wellness, UnkganIT), with scheduling and a basic analytics dashboard.

Stack: Next.js (App Router) + Supabase (database + file storage).

**Setup:** read [`docs/API-SETUP.md`](docs/API-SETUP.md) (platform API keys, Supabase, deploy, cron).

Local development:

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

Note: OAuth connections (Facebook/Google/X) need a public HTTPS `SITE_URL`, so test them on the deployed site.
