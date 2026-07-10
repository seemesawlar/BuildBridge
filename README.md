# BuildBridge

A shared, tamper-evident project record for small residential renovations —
basements, decks, dens, kitchens, bathrooms, and general repairs. A
contractor and their client work from the same timeline of estimates,
change orders, progress photos, and payments, instead of scattered texts
and emails.

## Stack

- **Vite + React** (JavaScript, no TypeScript)
- **Tailwind CSS** with a custom "job-site blueprint" design system
- **Supabase** (Postgres + Auth + Row Level Security) for the backend
- **react-router-dom** for routing
- **lucide-react** for icons

## Getting started

```bash
npm install
cp .env.example .env
# fill in your Supabase project URL and anon key in .env
npm run dev
```

## Setting up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run, in order:
   - `supabase/schema.sql` — tables, types, indexes
   - `supabase/policies.sql` — Row Level Security policies + the public
     `project_public_summary` view used by the shareable read-only link
   - `supabase/storage.sql` — creates the `progress-photos`, `portfolio`,
     and `licenses` buckets and their access policies
   - `supabase/notifications.sql` — notifications table + the triggers
     that generate them automatically
   - `supabase/inquiries.sql` — marketplace quote-request flow (run this
     last — its triggers call `create_notification()`, defined above)
3. Copy your project URL and anon key (Project Settings → API) into `.env`.
4. Email confirmation is on by default in Supabase Auth. For local testing,
   you can disable "Confirm email" under Authentication → Providers → Email
   so newly created accounts can sign in immediately.

## How the trust model works

This app's core promise is a **permanent, dated record** that neither party
can quietly edit after the fact. That's enforced two ways:

- **Append-only tables.** `progress_updates` and `payments` only have
  `select` and `insert` policies — there is no `update` or `delete` policy,
  so once a progress photo or a payment is logged, it can't be altered or
  removed through the app.
- **Versioned estimates.** A new estimate never overwrites the old one — the
  previous version is marked `superseded` and stays in the table, so the
  full negotiation history is always visible.
- **Change orders as their own object**, not a comment or an edited budget
  line, with an explicit approve/reject step and a timestamp on both the
  request and the resolution.

## Reviews & ratings

A client can leave one review per project (5-star rating + text), but only
once the project's status is set to `completed` — the "Review" tab on a
project explains what's blocking it otherwise. A few integrity details
worth knowing:

- **The rating and text are locked once submitted.** A contractor can post
  a `contractor_response`, but a database trigger (`reviews_protect_integrity`
  in `policies.sql`) rejects any update that touches the rating, body, or
  the project/client/contractor it belongs to — RLS alone can gate *who*
  can update a row, not *which columns*, so the trigger closes that gap.
- **Reporting is a separate table**, `review_flags`, rather than a boolean
  on `reviews`. Any authenticated user can report a review once (a unique
  constraint prevents duplicate reports from the same person); only an
  admin can read the flags. This avoids widening the reviews table's own
  update policy just to support flagging.
- **Admin moderation** lives in the "Flagged reviews" tab of `/admin` —
  reports are grouped per review with a count, and an admin can either
  dismiss the reports (review stays up) or remove the review entirely
  (cascades to its flags).
- Aggregate rating + full review list show up on the public
  `/contractors/:id` profile via `ReviewsList`; the project's own review
  (if any) shows on that project's "Review" tab regardless of status.

Project status itself is now editable by either project member (client or
contractor) from the Overview tab — that's what actually unlocks the
review flow once a job wraps up, rather than requiring an admin to do it.

## Marketplace & quote requests

This is the piece that lets a client find a contractor cold, rather than
only inviting one they already know. It's deliberately a two-step flow,
not a one-click "add contractor to project":

1. **Browse** — `/contractors` (clients only) lists every contractor
   profile with search (name/area/specialty), a specialty filter, a
   verified-only toggle, and sort by rating/experience/newest. Rating is
   computed client-side from the `reviews` table since there's no
   separate ratings-aggregate table — fine at this scale, worth
   revisiting (a materialized view or a `rating_avg`/`rating_count`
   column maintained by trigger) if the contractor list grows into the
   thousands.
2. **Inquire** — from a contractor's public profile, a client sends a
   non-binding **quote request** (`inquiries` table): project type,
   description, rough budget. No project exists yet, and the contractor
   isn't attached to anything — this is intentionally lightweight, closer
   to how Thumbtack/Angi leads work than to a binding commitment.
3. **Respond** — the contractor sees it on `/inquiries`, and can send a
   response (questions, a rough quote, availability) or decline. The
   client gets notified either way.
4. **Convert** — once a contractor's responded, the client can hit "Start
   a project with them" from `/inquiries`. This routes into the existing
   `NewProject` flow with the contractor, project type, and description
   pre-filled and the contractor attached immediately on creation — the
   inquiry is marked `accepted` and linked to the resulting project via
   `inquiries.project_id`.

**Integrity**, matching the same pattern used for reviews: RLS lets a
contractor update *their own* inquiry row (to respond) and a client
update theirs (to withdraw/accept), but a database trigger
(`protect_inquiry_integrity`) restricts *which columns* each side can
touch — a contractor can't rewrite the client's original message or
budget, and a client can't rewrite the contractor's response.

**Defense in depth on roles:** the UI hides "New project" and "Find
contractors" from contractor accounts, but that's just UX — the
underlying RLS policies also now require the actual `role` on `profiles`
to match (a client creating a project, a client sending an inquiry to an
actual contractor), so a contractor account can't create a project or
send an inquiry even by calling the API directly.

**What's still missing here, on purpose:** the marketplace is inside the
authenticated app, not a public pre-signup browse page — a real
"discovery" product would want an SEO-indexable public version of
`/contractors` and `/contractors/:id` that prompts sign-up only when you
try to send an inquiry. That's a meaningfully different routing/auth
setup (public read access to a subset of profile data) and is the
natural next step if organic/search-driven client acquisition matters to
you.

## Notifications

Notifications are generated by **database triggers**, not client-side
inserts — every meaningful event on a project writes a row via a
`security definer` `create_notification()` function, so a notification
can't be silently skipped by a UI path that forgets to call it:

| Event | Notifies |
|---|---|
| Estimate sent | Client |
| Estimate accepted / rejected | The contractor who sent it |
| Change order proposed | Whichever member didn't propose it |
| Change order approved / rejected | Whoever requested it |
| Progress update posted | Whichever member didn't post it |
| Payment recorded | Whichever member didn't record it |
| Message sent | Whichever member didn't send it |
| Milestone marked complete | Client |
| Contractor added to a project | That contractor |
| Review submitted | The reviewed contractor |
| Contractor responds to a review | The client |
| Verification approved / revoked | That contractor |
| Quote request sent | The contractor |
| Contractor responds / declines a quote request | The client |
| Quote request accepted (project created) | The contractor |

The bell icon in the top bar shows an unread count, a dropdown of recent
notifications, and updates **live** via a Supabase Realtime subscription
(`postgres_changes` on `notifications`, filtered to the signed-in user) —
no polling or refresh needed. Clicking a notification marks it read and
deep-links straight to the relevant project tab (`src/lib/notifications.js`
maps notification type → tab via a `?tab=` query param that
`ProjectDetail` reads on load).

If the `alter publication` statement at the bottom of `notifications.sql`
fails (some projects already have `supabase_realtime` configured as
`FOR ALL TABLES`), it's caught and logged as a notice rather than failing
the whole script — nothing else in that file depends on it succeeding,
it only affects whether new notifications appear instantly vs. on next
page load.

## Milestone editing

The milestone timeline (Overview tab) is editable, not just decorative —
click the pencil next to any milestone to update its status, percent
complete, and target date. Marking a milestone `complete` is what fires
the "Milestone completed" notification above, and stamps `completed_at`.

## Creating an admin account

There's no public "sign up as admin" option by design — admin accounts are
granted, not self-selected. To make your first admin:

1. Sign up normally as a client or contractor.
2. In the Supabase SQL editor, run:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Sign out and back in. A new **Admin** link appears in the sidebar,
   linking to `/admin`.

From there, admins can promote/demote other users' roles (Users tab), so
after the first admin exists you don't need to touch SQL again.

## Admin dashboard

`/admin` (role-gated via `AdminRoute`) covers the three most immediately
useful pieces of the "Platform Administrator" role from the spec:

- **Verification queue** — every contractor who has uploaded a license
  shows up here with the document rendered inline (via a signed URL, since
  the `licenses` bucket is private) and an approve/revoke action that
  flips `profiles.is_verified`. This is what turns on the verified badge
  shown on `/contractors/:id` and in project overviews.
- **Users** — every account, with an inline role switcher (client /
  contractor / admin) for basic user management.
- **Projects** — every project on the platform with an inline status
  switcher, useful for dispute resolution (e.g. marking a project
  `on_hold` or `cancelled` when something's contested) and general
  platform monitoring.

Review moderation (responding to reported reviews) has RLS support
(`admins can moderate any review` delete policy) but no dedicated UI yet —
it's a small addition once reviews/ratings are built out on the client
side.

## File storage

Three Supabase Storage buckets, each with access rules matched to what they hold:

| Bucket | Public? | Path convention | Access |
|---|---|---|---|
| `progress-photos` | No | `{project_id}/{file}` | Project members only (client + assigned contractor) |
| `portfolio` | Yes | `{contractor_id}/{file}` | Anyone can view; only the owning contractor can upload/delete — used for both portfolio images and profile avatars |
| `licenses` | No | `{user_id}/{file}` | Owner-only (verification documents; an admin review flow isn't built yet) |

Progress photos are fetched with short-lived signed URLs (`getSignedUrl` in
`src/lib/storage.js`) rather than public URLs, since that bucket is private.
Portfolio images and avatars use public URLs directly since that bucket is
public by design — they're marketing material meant to be seen without a
login, e.g. from a future contractor marketplace listing.

## Project structure

```
src/
  context/AuthContext.jsx     Session + profile state, refreshProfile()
  routes/
    ProtectedRoute.jsx        Auth gate for the app shell
    AdminRoute.jsx             Role gate for /admin
  components/
    layout/AppLayout.jsx      Sidebar, top bar (notification bell), shell
    ui/StatusBadge.jsx        Shared status pill
    project/                  Feature panels (estimates, change orders,
                               progress log w/ photo upload, payments,
                               messages, invite contractor)
    profile/                  AvatarUpload, LicenseUpload, PortfolioGallery
    reviews/                  StarRating, ReviewForm, ReviewCard, ReviewsList
    admin/                    LicenseViewer (signed-URL doc viewer)
    notifications/            NotificationBell (live dropdown)
    marketplace/              ContractorCard, InquiryForm
  lib/
    supabaseClient.js         Supabase client init
    storage.js                uploadFile / getSignedUrl / deleteFile helpers
    notifications.js          notification type → project tab link mapping
  pages/
    Login.jsx / Signup.jsx
    Dashboard.jsx             Project list
    NewProject.jsx            Creates a project + seeds its milestone
                               template (+ prefill from an accepted inquiry)
    ProjectDetail.jsx         Tabbed transparency dashboard (+ Review tab,
                               editable milestones, URL-synced tabs)
    SharedSummary.jsx         Public read-only page at /share/:token
    Profile.jsx               Edit your own profile (role-aware form)
    ContractorProfile.jsx     Public profile at /contractors/:id (+ reviews,
                               + Request a quote for client viewers)
    Marketplace.jsx           Browse/search contractors at /contractors
    Inquiries.jsx             Quote request inbox/outbox at /inquiries
    admin/AdminDashboard.jsx  Verification queue, users, projects, flagged reviews
  utils/milestoneTemplates.js Per-project-type default milestone sequences
supabase/
  schema.sql                  Tables, types, triggers
  policies.sql                RLS policies + project_public_summary view +
                               review integrity trigger
  storage.sql                 Storage buckets + storage.objects policies
  notifications.sql           notifications table + all notification triggers
  inquiries.sql                inquiries table + integrity trigger +
                               inquiry notification triggers
```

## What's intentionally not in v1

AI recommendations, payment processing, GPS/time tracking,
permit-tracking integrations, supplier marketplace, drone/BIM uploads,
multi-language support, and a public (pre-signup) version of the
marketplace are all deferred. Every other feature from the original MVP
list is implemented and wired end to end: profiles, portfolios, photo
storage, milestone tracking, estimates, change orders, payments
tracking, messaging, reviews & ratings with moderation, notifications,
and now contractor discovery through browse + quote requests.

A note on "fully ready for use": this is a complete, working MVP that
builds cleanly and covers the full loop honestly and thoroughly, but it
hasn't been through real-world load testing, a security audit, or usage
by actual contractors and clients. Treat it as a strong foundation to
pilot with a handful of real users, not as something to launch publicly
unreviewed.

## Notes on the public share link

The `projects` table itself has no public `select` policy — only project
members can query it directly. The `/share/:token` route instead queries
`project_public_summary`, a view granted to the `anon` role that exposes
only a safe subset of columns (title, status, budget, dates, and
contractor/client display names — no messages, no internal notes, no
payment or line-item detail). Views in Postgres run with the privileges of
their owner by default, which is what allows this view to read from RLS-
protected tables while still hiding everything not explicitly selected in
its definition. If you rename or recreate the view, keep it owned by a
role with access to the base tables (e.g. `postgres`), or add
`security_invoker = false` explicitly.
