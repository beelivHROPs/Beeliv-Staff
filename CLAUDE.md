@AGENTS.md

# Beeliv-Staff

Serves `talent.beeliv.co` — the Applicant and Assigned Staff dashboards (an applicant who's hired transitions into a staff account, hence "Talent" covering both). Extracted from the shared prototype repo (`babaloloademola320-glitch/beeliv-hr-ops`) on 2026-09-05, per the project lead's confirmation of the real subdomain split. See `README.md` in this repo for the full split rationale, what's deliberately duplicated here vs. that source repo, and the not-yet-wired auth design.

**This repo inherits every rule from the source repo's own `CLAUDE.md`** (stage boundaries, no-invented-requirements, small-testable-changes, secrets handling, etc.) — treat that document as still governing, even though it isn't physically copied here. In particular:

- **Stage boundary:** this is still Stage 1 prototype work. No database tables, RLS, Supabase Auth, or real authentication exist here. Every disabled/structural pattern (disabled form fields with an explanatory `title`, etc.) must stay that way until Stage 2 is explicitly approved.
- **The public application flow stays out of this repo** — browsing open positions, job details, and creating an account (`/apply/[id]`) live in `Beeliv-Client` on `beeliv.co`. This repo only covers what happens *after* login.
- **Do not invent requirements, features, business rules, or roles** not already established in the source repo's documentation.
- **Do not add authentication/session logic** without first designing the cross-subdomain session approach (a Supabase Auth cookie scoped to `.beeliv.co`, shared with `Beeliv-Client` and `Beeliv-Admin`) — implementing it independently here risks a design that doesn't interoperate with the other two apps.
- **Shared components/lib are intentionally duplicated** from the source repo rather than pulled from a shared package (see README). Don't "fix" this by importing across repos — if the duplication becomes a real problem, that's a decision to make explicitly, not silently.
