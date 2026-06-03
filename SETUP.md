# HPRI Summer Fellows — Setup & Operating Guide

This is the complete guide for running, deploying, and managing the Fellows website.
It is written to be followed step by step. Where a step is genuinely technical
(the one-time server setup), that is called out so you can hand it to a developer
or IT person if you prefer.

---

## 1. What you have

A single self-contained website with two sides:

- **Public site** (`/`) — the USC-branded one-page hub: presentations, rules,
  mentors, activities, an **assignment upload form**, a **contact form**, news
  announcements, and quick links.
- **Admin side** (`/admin`) — password-protected. Staff use it to:
  - review every contact message and assignment upload (newest first),
  - download submitted files securely,
  - export everything to a spreadsheet (CSV),
  - **edit every section of the page** — header/intro, quick links, the
    "at a glance" table, the full presentations schedule (with Slides /
    Recording / Reflection links), rules, mentors, activities, assignments,
    capstone, contacts, and news — all with add / edit / delete buttons, no code.

**How data is stored:**
- **Page content** lives in **Firebase (Firestore)** — a Google-hosted database.
  Your edits in the admin "Edit content" page save there instantly and show on
  the public site right away. (See Section 11.)
- **Submissions & uploads** are saved into a folder named `data/` in the project:
  - `data/submissions.json` — all contact + assignment records
  - `data/uploads/` — the actual uploaded files (kept private, outside the public web folder)

> **This matters for hosting (see Section 5):** page content is in Firebase and
> persists anywhere, but **uploaded files are still saved to disk**, so the site
> must run on a host with a **disk that keeps its files** (a normal server / VPS).
> "Serverless" hosts like Vercel still need the uploads moved to Firebase Storage
> first — that's the planned next step.

**Built with:** Next.js 14, React 18, TypeScript, Tailwind CSS, Firebase Admin
(Firestore), Nodemailer (for email).

---

## 2. Run it on your own computer (local test)

Do this first to see the site working before you put it online.

1. **Install Node.js** (version 18.17 or newer; 20 LTS recommended) from
   <https://nodejs.org>. Verify it installed by opening a terminal and running:
   ```bash
   node -v
   ```
2. **Open a terminal in the project folder** (the folder that contains `package.json`).
3. **Install the dependencies** (one time):
   ```bash
   npm install
   ```
4. **Create your settings file.** Copy the example and edit it:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and fill in the values (see Sections 3 and 4 below). For a
   first local test you can leave the email values blank — the site still runs.
5. **Start the site:**
   ```bash
   npm run dev
   ```
6. Open <http://localhost:3000> in your browser. The admin login is at
   <http://localhost:3000/admin>.
7. To stop the site, press **Ctrl + C** in the terminal.

---

## 3. Set the admin username & password

In `.env.local`, set these three values:

```ini
ADMIN_USERNAME=admin
ADMIN_PASSWORD=use-a-long-hard-to-guess-password
SESSION_SECRET=a-long-random-string
```

- `ADMIN_USERNAME` / `ADMIN_PASSWORD` are what staff type at `/admin/login`.
- `SESSION_SECRET` keeps login sessions secure. Generate a strong value by running:
  ```bash
  openssl rand -hex 32
  ```
  Paste the result as the `SESSION_SECRET`.

After changing `.env.local`, **restart the site** for changes to take effect.

---

## 4. Turn on email (Gmail / Google Workspace)

When someone submits the contact form or uploads an assignment, the site can email
a notification to your program inbox. This is **optional** — submissions are always
saved to the admin dashboard even with email off.

Gmail will not accept your normal password from an app. You must create an
**App Password**:

1. Go to your **Google Account → Security**.
2. Turn on **2-Step Verification** (required before App Passwords appear).
3. Open **App passwords**, create one named e.g. "Fellows site", and copy the
   **16-character** code it gives you.
4. In `.env.local`, fill in:
   ```ini
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-address@gmail.com
   SMTP_PASS=the16charapppassword
   ADMIN_EMAIL=where-notifications-should-go@usc.edu
   MAIL_FROM=HPRI Summer Fellows <your-address@gmail.com>
   ```
   - `SMTP_USER` / `SMTP_PASS` = the Gmail account that sends the mail.
   - `ADMIN_EMAIL` = the inbox that receives notifications (defaults to `SMTP_USER`
     if left blank).
5. Restart the site. Submit a test message to confirm the email arrives.

> To turn email **off**, just leave `SMTP_USER` and `SMTP_PASS` blank.

---

## 5. Go live (put it on the internet)

The site needs a host that **runs Node.js and keeps written files on disk**. The
recommended path is a small VPS (virtual server). This one-time setup is technical;
if you are not comfortable with a terminal, hand Section 5A to a developer.

### 5A. Recommended: a small VPS (e.g. DigitalOcean, ~US$6/month)

1. **Create a server (droplet):** choose **Ubuntu 24.04**, the smallest size is
   fine. Note its **public IP address** (e.g. `203.0.113.10`).
2. **Connect to it** from your terminal:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```
3. **Install Node.js 20 and tools** (run these on the server):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs nginx
   npm install -g pm2
   ```
4. **Copy the project onto the server.** Easiest is to put the code in a private
   Git repository and clone it; or copy the folder up with `scp` from your computer:
   ```bash
   scp -r /path/to/Fellowship root@YOUR_SERVER_IP:/var/www/fellows
   ```
5. **Build it** (on the server, inside the project folder):
   ```bash
   cd /var/www/fellows
   npm install
   cp .env.example .env.local      # then edit .env.local with real values
   nano .env.local                 # fill in password + email, save with Ctrl+O, exit Ctrl+X
   npm run build
   ```
6. **Keep it running with PM2** (auto-restarts on crash/reboot):
   ```bash
   pm2 start "npm run start" --name fellows
   pm2 save
   pm2 startup        # run the one line it prints back to you
   ```
   The site is now running on the server at port 3000 (not public yet).
7. **Put it on port 80/443 with Nginx.** Create `/etc/nginx/sites-available/fellows`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.org www.yourdomain.org;
       client_max_body_size 25M;   # allow file uploads
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Enable it and reload Nginx:
   ```bash
   ln -s /etc/nginx/sites-available/fellows /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```
8. **Add free HTTPS** (after the domain points here — see Section 6):
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.org -d www.yourdomain.org
   ```

### 5B. Simpler managed option

If you prefer not to manage a server, a platform like **Render** can run it:
build command `npm install && npm run build`, start command `npm run start`.
**You must attach a Persistent Disk mounted at the project's `data` folder**, or
uploads/submissions/content will be lost on every redeploy.

### 5C. Do NOT use (as-is)

**Vercel / Netlify** and similar serverless hosts do not keep files written by the
app, so the contact form records, uploaded assignments, and content edits would
vanish. Only use them if a developer first replaces the file storage with a
database + cloud file storage.

---

## 6. Connect your Wix domain

Keep the domain **registered at Wix** — you are only pointing it at the new server,
not transferring it.

1. In **Wix → Domains**, open your domain and find **DNS records** (often under
   "Advanced" / "Edit DNS"). If Wix says the domain is connected to a Wix site,
   disconnect it from that site first so you can edit records.
2. **Point the root domain to your server:** add/edit an **A record**
   - Host/Name: `@`
   - Value: your server's IP address (from Section 5A step 1)
3. **Point www:** add a **CNAME** record
   - Host/Name: `www`
   - Value: `yourdomain.org`
4. **Save.** DNS changes can take from a few minutes up to a few hours to take effect.
5. Once the domain shows your site, run the **certbot** step (5A step 8) to enable HTTPS.

> If Wix limits pointing the root domain with an A record, you can instead put a
> free Cloudflare account in front (change the nameservers at Wix to Cloudflare,
> then add the same A/CNAME records in Cloudflare). This is optional.

---

## 7. Day-to-day admin guide (for staff — no coding)

1. Go to **`https://yourdomain.org/admin`** and log in with the username/password
   from Section 3.
2. **Submissions dashboard:**
   - **Assignment submissions** and **Contact messages** are listed newest first.
   - Click an **email address** to reply in your mail app.
   - Click a **file name** to securely download an uploaded assignment.
   - Click **Export CSV** to download everything as a spreadsheet (opens in Excel /
     Google Sheets).
3. **Edit content** (top-right button): change the **term, dates, tagline, intro**,
   the **Quick Links**, and the **News & Announcements**. Changes save immediately
   and appear on the public site right away. Tip: leave a quick link's address
   blank to show it as a "coming soon" placeholder.
4. **Log out** when finished (button in the top-right).

---

## 8. Backups (important)

The `data/` folder is the **only copy** of every submission, uploaded file, and
content edit. Back it up regularly — for example, copy it somewhere safe on a
schedule. On the VPS:

```bash
tar -czf fellows-backup-$(date +%F).tar.gz -C /var/www/fellows data
```

Keep these backups off the server (download them, or use a storage service).

---

## 9. Rules & gotchas (please read)

- **Keep Next.js at 14.2.35.** Do **not** run `npm audit fix --force` — it would
  upgrade to a version that breaks this site. Security warnings from `npm audit`
  can be ignored, or ask a developer to review them.
- **Never run `npm run build` while `npm run dev` is running.** They share the same
  `.next` build folder and will collide, producing confusing errors like
  *"Cannot find module"* and *"Export encountered errors on /admin"*. Always stop
  the dev server (Ctrl + C) before building. *(If you ever see that build error,
  this is why — stop dev, then build again.)*
- **Secrets live only in `.env.local`.** Never put passwords in the code and never
  share or commit `.env.local` (it is already git-ignored).
- **Don't move `data/uploads/`.** It is deliberately outside the public web folder
  so uploaded files (including students' work) cannot be downloaded by the public —
  only by logged-in admins.
- After editing `.env.local` on the server, apply it with: `pm2 restart fellows`.

---

## 10. Updating the site later

**Staff can self-edit every section** (no developer) from `/admin` → Edit content:
header/intro, quick links, the "at a glance" table, the presentations schedule
(and its Slides/Recording/Reflection links), rules, mentors, activities,
assignments, capstone, contacts, and news — each with add / edit / delete buttons.
Changes save to Firebase and appear on the public site immediately.

**A developer is only needed** for layout, colors, the brand name, or adding
brand-new section types. The starting/default text lives in code at
`src/content/program.ts`; once you edit a section in the admin, the Firebase copy
takes over.

**To publish code changes to the live server:**
```bash
cd /var/www/fellows
git pull               # or copy the new files up
npm install            # only if dependencies changed
npm run build
pm2 restart fellows
```

---

## 11. The database: Firebase (Firestore)

Page content is stored in **Firebase**, project **`hpri-fellows`**. You don't
have to do anything day-to-day — the admin "Edit content" page reads and writes
it for you. This section is only for setup, hosting, and safety.

**How the app finds your Firebase credentials (in order):**
1. An environment variable `FIREBASE_SERVICE_ACCOUNT_B64` (best for hosting), or
2. A file named `service-account.json` at the project root (best for local dev).

If neither is found, the site still runs but falls back to a local
`data/content.json` file and edits won't sync to Firebase.

**Local computer:** the `service-account.json` file is already in place. It is
**git-ignored** (never committed). Nothing else to do.

**On a server / Vercel** (where you can't keep a file): turn the JSON into one
line and store it as the env var. In a terminal, in the project folder:
```bash
base64 -i service-account.json | tr -d '\n'
```
Copy the long line it prints, and add it to your host's environment as:
```
FIREBASE_SERVICE_ACCOUNT_B64=<paste the long line here>
```
(On a VPS, put that line in `.env.local` and run `pm2 restart fellows`.)

> ### ⚠️ Security: rotate the key you shared
> The Firebase service-account key was pasted into a chat, so you should treat it
> as exposed and **replace it**:
> 1. Firebase Console → ⚙️ **Project settings** → **Service accounts**
> 2. **Generate new private key** → download the new JSON
> 3. Save it over the existing `service-account.json` (and re-make the base64 line
>    above for any servers)
> 4. In **Google Cloud Console → IAM & Admin → Service accounts → Keys**, **delete
>    the old key** so it can no longer be used.
> This takes two minutes and means the key seen in chat is worthless.

**Backups:** Firestore is hosted and replicated by Google, so your content is
safe even if your server dies. You can export a backup any time from the Firebase
Console (Firestore → ⋮ → Export), or just re-save from the admin page.

**Where the content lives in Firestore:** one document — collection `site`,
document `content`. You normally never need to open it; edit through `/admin`.
