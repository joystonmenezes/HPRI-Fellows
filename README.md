# HPRI Summer Fellows

> A cardinal-and-gold home base for the people who spend a summer trying to make homelessness rarer, shorter, and less harmful.

[![Next.js 14](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS 3](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Firebase App Hosting](https://img.shields.io/badge/Firebase-App_Hosting-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
![USC Cardinal & Gold](https://img.shields.io/badge/USC-Cardinal_%26_Gold-990000)

The **HPRI Summer Fellows Program** is a six-week hybrid fellowship at the USC Homelessness Policy Research Institute. This is its website — one calm, scrollable hub where fellows, families, mentors, and staff find everything in one place: the weekly schedule, presentation recordings, the rules, mentor pairings, self-directed activities, assignment submissions, and the final capstone.

It is also a quietly capable little CMS. Every word, link, photo, and section on the public page is editable from a password-protected admin panel — **no code, no redeploys.** A staff member can reorder the page by dragging, hide a section with a checkbox, drop in a banner slideshow, open and close assignment windows, and read what students submit, all from the browser.

---

## Two faces, one site

**For fellows & families** — the public page
- A single, smooth scroll — no hunting through menus
- A hero banner that can rotate through a photo story of the cohort, at a speed staff choose
- A floating gold section-nav that follows you down the page
- A live program schedule with per-session presentation / recording / reflection links
- Self-serve assignment submissions with real file-upload handling
- Plain-language contacts, addresses, and youth-protection information

**For staff** — the `/admin` panel
- A no-code editor for every section: text, links, tables, announcements
- Drag-to-reorder page layout; show or hide any section, or any individual item
- Banner manager: upload a photo or paste a link, then set the slideshow speed
- Per-assignment open/close windows — students can only submit when you say so
- A submissions dashboard with file downloads, CSV export, and delete
- Optional email notifications on every new submission or message

---

## How it works

Content lives a three-layer life:

1. **Seed** — `src/content/program.ts` holds the program's default text, so the site is fully populated on day one and works even with no database attached.
2. **Store** — once an admin saves an edit, it is written to **Firestore** and overrides the seed. `src/lib/content.ts` sanitises every field on the way in and out.
3. **Serve** — the public page calls `getContent()` at request time, so edits appear immediately, with no rebuild.

A small **section registry** (`src/content/sections.ts`) is the single source of truth for which sections exist, their order, and their labels — shared by both the server and the admin editor so the two never drift apart.

Uploads are split by sensitivity. **Student submissions** go to a private Storage prefix and are only ever served through an authenticated admin route — the program includes minors, so this is deliberate. **Banner photos** are public marketing images, served from a public route.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router, React 18, server components) |
| Language | TypeScript |
| Styling | Tailwind CSS — USC cardinal & gold, Georgia serif display |
| Data | Firebase Firestore (content + submissions) |
| Files | Firebase Cloud Storage (uploads + banner) |
| Email | Nodemailer (SMTP) |
| Hosting | Firebase App Hosting (auto-deploys on push to `main`) |

No client-side state libraries and no UI kit — just React, a few hand-rolled hooks (including a dependency-free drag-to-reorder), and Tailwind.

---

## Project structure

```
src/
├─ app/
│  ├─ page.tsx                # The public single-scroll hub
│  ├─ admin/
│  │  ├─ page.tsx             # Dashboard: submissions & messages
│  │  └─ content/page.tsx     # The no-code content editor
│  └─ api/                    # submit, contact, banner, admin/*
├─ components/
│  ├─ HeroBanner.tsx          # Cross-fading banner slideshow
│  ├─ SectionNav.tsx          # Floating gold section nav
│  └─ admin/                  # Editors, drag-reorder, save bars
├─ content/
│  ├─ program.ts              # Default (seed) content
│  └─ sections.ts             # Section registry: order, labels, nav
└─ lib/
   ├─ content.ts              # Firestore-backed content + sanitisers
   ├─ store.ts                # Submissions (Firestore + Storage)
   ├─ firebase.ts             # Admin SDK init
   ├─ auth.ts                 # Admin session/cookie auth
   ├─ email.ts                # Nodemailer notifications
   └─ datetime.ts             # Submission-window helpers
```

---

## Run it locally

```bash
# Node 20+ recommended
npm install
npm run dev          # http://localhost:3000
```

With no Firebase credentials present, the site runs happily on its built-in seed content, using a local-file fallback for any edits — so you can develop the whole thing without touching the cloud. Add credentials (below) to use the real database.

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # Next.js lint
```

---

## Configuration

All configuration is through environment variables (and secrets in production). **Nothing here belongs in the repo** — the full, friendly walkthrough lives in [`SETUP.md`](./SETUP.md).

| Variable | Purpose |
| --- | --- |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Admin-panel login |
| `SESSION_SECRET` | Signs the admin session cookie |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Base64 service-account key (Firestore + Storage) |
| `FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket name |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Outgoing email server |
| `MAIL_FROM`, `ADMIN_EMAIL` | The "from" address, and where notifications land |

If the Firebase variables are absent, the app falls back to local files. If the SMTP variables are absent, email notifications are simply skipped — submissions are still recorded either way.

> Secrets live in Firebase App Hosting's secret manager or a git-ignored `service-account.json`, never in source. **This repository is public — please keep it that way.**

---

## Deployment

The site runs on **Firebase App Hosting** and redeploys automatically on every push to `main`; a typical rollout is live within a few minutes. The canonical operating, backup, and custom-domain (Wix DNS) instructions all live in [`SETUP.md`](./SETUP.md).

---

## What's on the page

The public hub is assembled from these admin-controlled sections, arranged in whatever order you like:

> External References&nbsp;·&nbsp;Program at a Glance&nbsp;·&nbsp;Presentations&nbsp;·&nbsp;Rules &amp; Expectations&nbsp;·&nbsp;Mentors&nbsp;·&nbsp;Self-Directed Activities&nbsp;·&nbsp;Submit Assignments&nbsp;·&nbsp;Capstone Project&nbsp;·&nbsp;Contacts &amp; Addresses

---

## A note on privacy

This program serves students — some of whom are minors — and it touches sensitive subject matter. The site is built accordingly: uploaded student work is never placed in a public folder, downloads require an authenticated admin session, and assignment submissions default to **closed** until staff explicitly open a window.

---

## Credits

Built for the **USC Homelessness Policy Research Institute (HPRI)** and its Summer Fellows. Cardinal and gold, with care.
