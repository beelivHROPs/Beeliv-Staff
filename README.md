# Beeliv-Staff

Serves `talent.beeliv.co` — the Applicant and Assigned Staff dashboards, extracted from the shared `my-app` prototype repo (`babaloloademola320-glitch/beeliv-hr-ops`) on 2026-09-05, per the project lead's live confirmation of the real subdomain split:

- `beeliv.co` (public landing + recruitment) + `client.beeliv.co` (Client dashboard) → `Beeliv-Client`
- `admin.beeliv.co` (HR + Ops) → `Beeliv-Admin`
- `talent.beeliv.co` (Applicant + Staff, so an applicant can transition into a staff account) → **this repo**

Named "Talent" deliberately: an applicant who's hired transitions into a staff account, so both roles' authenticated dashboards live in one app, together. The **public** application flow (browsing open positions, creating an account, `/apply/[id]`) stays on `beeliv.co` in `Beeliv-Client` — this repo only covers what happens *after* login.

## What's duplicated here, and why

Same tradeoff as `Beeliv-Admin`'s README: this app carries its own copies of every shared component/hook/lib file it needs rather than depending on a shared package across all three repos. Deliberate for this Stage 1/prototype stage — revisit if the three apps' shared UI starts diverging in practice.

**No cross-role links existed in Staff/Applicant** (verified before this split) — nothing needed rewiring to a cross-subdomain URL here. The one internal link from Application Flow's `/apply` reference doesn't apply — that page (`app/apply/[id]`) isn't part of this app at all; it lives in `Beeliv-Client`.

## Auth (not yet wired)

No Supabase Auth/session handling exists in this app yet — `app/page.tsx`'s root redirect to `/applicant/dashboard` is a structural placeholder, not real role detection. Same intended design as `Beeliv-Admin`: shared login on `beeliv.co`, a session cookie scoped to `.beeliv.co` so it's valid here too, and a post-login redirect based on the authenticated user's role.

## Stage boundary

Same as `my-app`: this is Stage 1 prototype work. No database tables, RLS, or real authentication exist. Every disabled/structural pattern from the source repo is preserved as-is.
