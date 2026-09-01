# Club Portal — Admin App

React + Vite + TypeScript. Deploy `firebase-backend/` first.

## Deploying

Same as the student portal — static Vite build, deploy anywhere. `vercel.json` / `public/_redirects` included for Vercel/Netlify. **Add your deployed domain to Firebase Console → Authentication → Settings → Authorized domains**, or sign-in will fail silently.

## Setup

```bash
npm install
cp .env.example .env   # same Firebase web config as the student app
npm run dev
```

Log in with the admin account created by `firebase-backend/scripts/seedFirstAdmin.ts`.

## Pages

- `/members` — search, add member (creates Firebase Auth user + Firestore profile atomically, enforces unique reg. no. / email, sends a "set your password" email — no admin-generated passwords), **Bulk Import** (CSV/XLSX upload, same flow per row, results table + downloadable results CSV), change role, activate/deactivate, resend setup email
- `/administrators` — add/revoke **pure administrators**: people who need admin access but aren't club members (no registration number, never appear in the Members table, attendance rosters, or event registrations, and — since the student portal requires a member profile — can't access it at all). Also shows club members who hold admin role via the Members page, for a full picture of who has access.
- `/meetings` — create/edit/cancel/delete; `/meetings/:id` — mark attendance (bulk "mark all" + per-member override with required reason for "Other")
- `/events` — create/edit/publish/unpublish/cancel; `/events/:id` — **Attendance** tracking (bulk "mark all" + per-member status overrides with required reason for "Other")

- `/announcements` — post/delete announcements shown on member dashboards
- `/audit-logs` — every admin action, filterable

All mutations go through Cloud Functions in `firebase-backend/functions/src` —
this app never writes to Firestore directly, and the admin claim (not just a
Firestore field) gates every admin-only screen and function call.
