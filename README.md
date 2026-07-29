# Gujarati Class Portal — Phase 1

Roster, class assignment, and attendance (with automatic absence
emails). This is Phase 1 of the plan in `GujaratiClassApp_Plan_v1.md` --
weekly plans/homework, quizzes, and report cards are Phase 2/3, not in
this codebase yet.

Stack: Next.js 14 (App Router, TypeScript) + Supabase (Postgres, Auth,
RLS) + Resend (email). Build and lint have both been verified clean.

## Before you start

Delete the `node_modules` folder in this directory if one already
exists before running `npm install` -- it may have gotten corrupted by
the environment this project was scaffolded in, and a fresh install
resolves it in seconds either way.

## 1. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/migrations/0001_init.sql` once
   against your new project. This creates every table, the signup
   trigger, and all RLS policies in one shot.
3. Under **Project Settings -> API**, copy the Project URL and the
   `anon` public key.
4. Under **Authentication -> Providers**, enable **Google** (you'll
   need a Google Cloud OAuth client ID/secret -- Supabase's docs walk
   through this) and enable **Phone** with **Twilio** as the SMS
   provider (needs a Twilio account, Account SID, Auth Token, and a
   Verify Service SID).
5. Under **Authentication -> URL Configuration**, add
   `https://<your-deployed-domain>/auth/callback` (and
   `http://localhost:3000/auth/callback` for local dev) as a redirect
   URL.

## 2. Create the first admin account

The signup trigger only ever creates `parent` accounts -- there's no
public "make me an admin" button, on purpose. To bootstrap:

1. Sign in once through the app's `/sign-in` page with your own Google
   account or phone number. This creates your `profiles` row as
   `parent`.
2. In the Supabase SQL Editor, run:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Sign out and back in -- you'll land on `/admin`. From there, every
   later teacher promotion happens through the **Accounts** table in
   the admin UI instead of SQL.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- from
  step 1.
- `NEXT_PUBLIC_SITE_URL` -- `http://localhost:3000` for local dev, your
  real domain once deployed.
- `RESEND_API_KEY` -- from [resend.com](https://resend.com) (free tier
  is enough per the plan's volume estimate). Leave blank locally and
  absence emails just log to the console instead of sending.
- `NOTIFICATIONS_FROM_EMAIL` -- must be on a domain you've verified in
  Resend.

## 4. Run it locally

```bash
npm install
npm run dev
```

## 5. Deploy

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Import it into [Vercel](https://vercel.com), set the same
   environment variables from step 3 in the Vercel project settings.
3. Deploy. Update the Supabase redirect URL (step 1.5) to match your
   real Vercel domain.

## What's deliberately not here yet

Per the phased roadmap: no weekly plans/homework, no quizzes/exams, no
report cards, and no report-card email finalization. Admin can create
levels, terms, and classes, assign a teacher, and place students; a
teacher can mark attendance for their own class; a parent can add
children and see their class placement and recent attendance. That's
the whole of Phase 1.
