# Step-by-step: getting API access for Social Hub

You need **one app per platform** (not one per company). The same Meta app, Google project and X app
are reused for Hariom Ashram, Vedika Wellness and UnkganIT. Each company's own account is connected
later from the **Accounts** page, by logging in to that company's profile.

Platform dashboards change their menus often. If a button has moved, search for the name in quotes.

Do the steps in this order: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7**.

**How it is hosted (GitHub + Supabase only, no Vercel):**
- The pages you see are a static site on **GitHub Pages**: `https://avantidk.github.io/socialmedia/`
- The server part (secrets, posting, OAuth, stats) is a **Supabase Edge Function** named `api`.
- GitHub Actions deploys both automatically every time `main` changes.

In this guide **PROJECT_REF** is the first part of your Supabase URL: for `https://abcd1234.supabase.co` it is `abcd1234`.
Your OAuth redirect addresses on every platform will use the Supabase URL, not the GitHub Pages one.

---

## 0. GitHub setup

1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (GitHub Pages on a **private** repo needs a paid GitHub plan, Pro or higher. The published site is public even if the repo is private.)
2. Keep the repo's branch named `main`.

## 1. Supabase (free)

1. supabase.com → New project. Save the database password.
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, press **Run**.
   It creates the tables, the three companies, the `media` storage bucket and the access rules.
3. **Authentication → Users → Add user → Create new user**: enter your email and a strong password,
   tick **Auto Confirm User**. Create one user for each person who needs access.
4. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
   (Important: every logged-in user can use the dashboard, so only you should be able to create users.)
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key (you need them in step 5).
6. **Account (top right) → Access Tokens → Generate new token**: copy it (you need it in step 5 as `SUPABASE_ACCESS_TOKEN`).
7. Free-plan limit: **50 MB per uploaded file**, 1 GB total storage.
8. Edge Function limits: free functions have a time limit per request, so very large videos may fail on YouTube/X.
   If one fails you'll see the reason on the Posts page.

## 2. Facebook + Instagram (Meta)

**What each company needs first**
- A **Facebook Page** (posting goes to the Page, not a personal profile).
- An **Instagram Professional account** (Business or Creator), linked to that Page:
  Instagram app → Settings → Account type → Switch to professional; then
  Facebook Page → Settings → Linked accounts → Instagram → connect.
- The person who will click "Connect" must be an **admin of the Page**.

**Create the app (once)**
1. Go to **developers.facebook.com** → log in → **Create App**.
2. Use case: choose **Other** → app type **Business** → give it a name (e.g. "Social Hub") → Create.
3. Left menu **App settings → Basic**: copy **App ID** → `META_APP_ID` and **App secret** → `META_APP_SECRET`.
4. **Add product → Facebook Login** (shown as "Facebook Login" or "Facebook Login for Business") → Set up.
   Under its **Settings**, in **Valid OAuth Redirect URIs** add exactly:
   `https://PROJECT_REF.supabase.co/functions/v1/api/callback/meta`
   and save. Make sure "Client OAuth login" and "Web OAuth login" are on.
5. **App roles → Roles**: add the Facebook profile of every person who will connect a company
   (Hariom Ashram, Vedika Wellness, UnkganIT admins) as **Administrator**, **Developer** or **Tester**.
   They must open the invite (Notifications on Facebook) and accept it.
6. Keep the app in **Development mode** (the toggle at the top). In this mode the app works for everyone with a
   role on the app, for Pages they manage, **without app review**. This is exactly your case (only your 3 companies).
   You never need to "Publish" the app.

**Notes**
- If a Page belongs to a **Business portfolio**, the person connecting needs full control of it there,
  and in the permission dialog must tick the Page(s) **and** the Instagram account.
- Permissions the site asks for: `pages_show_list, pages_read_engagement, pages_manage_posts, pages_read_user_content,
  instagram_basic, instagram_content_publish, instagram_manage_insights, business_management`.
  In Development mode you can use all of them on your own accounts without review.
- Instagram can't take text-only posts, and videos are published as **Reels**.
- Facebook Page tokens obtained this way do not expire; you connect once.

## 3. YouTube (Google)

1. Go to **console.cloud.google.com** → create a **New Project** (e.g. "Social Hub").
2. **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.
3. **APIs & Services → OAuth consent screen** (may be called "Google Auth Platform"):
   - User type: **External** → fill app name, your support email, developer email.
   - **Scopes** → add `.../auth/youtube.upload` and `.../auth/youtube.readonly`.
   - **Test users** → add the Google account of each company's YouTube channel owner.
4. **IMPORTANT, otherwise logins break after 7 days:** while the app is in **Testing**, Google expires the login
   after 7 days. On the consent screen click **Publish app** (status "In production").
   You will see a "Google hasn't verified this app" warning when connecting: click **Advanced → Go to Social Hub (unsafe)**.
   That's fine because it's your own app, limited to 100 users.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
   Under **Authorized redirect URIs** add exactly: `https://PROJECT_REF.supabase.co/functions/v1/api/callback/youtube`
   Copy **Client ID** → `GOOGLE_CLIENT_ID` and **Client secret** → `GOOGLE_CLIENT_SECRET`.
6. **Two YouTube limits to know:**
   - **Daily quota:** default 10,000 units/day and one upload costs 1,600 → about **6 uploads per day, shared by all 3 companies**.
   - **Private uploads until audited:** videos uploaded through a new, unaudited API project are forced to **private**.
     To make them public, submit Google's **"YouTube API Services – Audit and Quota Extension Form"**
     (search that name; it's free and also lets you request more quota). Until it's approved you can post, but each video
     must be changed to Public manually in YouTube Studio.
7. If a company's channel is a **Brand Account**, pick that channel in Google's account chooser when connecting.

## 4. X (Twitter), free plan

1. Go to **developer.x.com** → sign in with any X account → sign up for the **Free** plan and accept the terms.
2. In the Developer Portal create a **Project** and an **App** inside it.
3. Open the app → **User authentication settings → Set up**:
   - App permissions: **Read and write**
   - Type of App: **Web App, Automated App or Bot** (confidential client)
   - Callback URI / Redirect URL: `https://PROJECT_REF.supabase.co/functions/v1/api/callback/x`
   - Website URL: `https://avantidk.github.io/socialmedia`
   → Save.
4. **Keys and tokens** tab → under **OAuth 2.0 Client ID and Client Secret** copy them to `X_CLIENT_ID` and `X_CLIENT_SECRET`.
   (Not the "API Key & Secret" or "Bearer token"; those are a different thing.)
5. Each company's X account is connected by pressing **Connect X** while logged in to that company's X account.
   One app can authorise all three X accounts.

**Free plan limits (verify on developer.x.com, X changes them often):**
- Posting only, with a small monthly allowance of posts shared across all 3 companies.
- **No analytics**: the free plan can't read likes/comments, so the X columns in the dashboard show "n/a".
- Image/video upload may be restricted on the free tier. If X rejects media, the post fails with a clear message on
  the Posts page and text-only posts still work.

## 5. Put the secrets in GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add each one:

| Secret name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key from step 1 |
| `SUPABASE_ACCESS_TOKEN` | access token from step 1 |
| `ENCRYPTION_KEY` | a long random string (`openssl rand -hex 32`) |
| `CRON_SECRET` | another long random string |
| `META_APP_ID`, `META_APP_SECRET` | step 2 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | step 3 |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | step 4 |

Never change `ENCRYPTION_KEY` later, or already-connected accounts will need reconnecting.
You can add the platform secrets later as you get them; leave them out until then.

Then go to **Actions** tab and run **Deploy site (GitHub Pages)** and **Deploy backend (Supabase Edge Function)**
(or just push any change to `main`). After a minute the site is live at
`https://avantidk.github.io/socialmedia/`. Re-run **Deploy backend** after adding or changing any secret.

## 6. Turn on scheduled posting + automatic stats (free)

1. Open `supabase/cron.sql`, replace `YOUR_PROJECT_REF` and `YOUR_CRON_SECRET` (same value as the `CRON_SECRET` secret),
   and run it in the Supabase SQL Editor.
2. Supabase now calls the backend **every minute** to publish due posts and **every 3 hours** to refresh stats.

## 7. First run

1. Open `https://avantidk.github.io/socialmedia/` and log in with the email/password from step 1.
2. **Accounts** → pick a company tab → Connect Facebook+Instagram / YouTube / X.
3. **New post** → pick the accounts, write text, attach a file → **Post now**. Start with a harmless test post.
4. **Posts** shows per-platform success or the exact error, with a Retry button.
5. **Dashboard** → **Refresh stats** to see followers, likes, comments and views.
