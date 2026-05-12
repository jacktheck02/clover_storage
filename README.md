# Clover - Cloud File Storage & Management

Clover is a cloud file storage and management web application. It is basically a lightweight clone of Google Drive. The site is hosted on Vercel with Next.js, while a separate Cloudflare Worker backend owns Cloudflare D1 auth/file metadata and Cloudflare R2 private file objects. You can upload files, preview them, and share them with other users in your instance of the application.

Based on the tutorial by [JavaScript Mastery](https://github.com/JavaScript-Mastery-Pro/storage-management).

## Features

- Email OTP sign-in and sign-up with hashed sessions
- Optional Cloudflare Turnstile protection for auth flows
- Private file storage in Cloudflare R2
- D1-backed file metadata, sharing records, sessions, and rate limits
- File upload, preview, download, rename, share, and delete flows
- Dashboard with storage usage and recent files
- Operations scripts for D1 backup and stale upload cleanup

## Tech Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS
- **UI:** Radix primitives, local shadcn/ui-style components, Phosphor Icons
- **Backend:** Cloudflare Workers, D1, R2
- **Auth/email:** Email OTP, Resend, optional Cloudflare Turnstile
- **Deployment:** Vercel for the Next.js app, Cloudflare for the Worker backend

## Architecture Notes

Clover uses a split deployment:

- The **Next.js app** handles the UI, server actions, cookies, and user-facing API routes.
- The **Cloudflare Worker** owns auth verification, D1 queries, R2 object access, upload validation, and file authorization.
- The **R2 bucket is private**. File view and download requests are proxied through authenticated routes that check ownership or sharing access before streaming the object.

Uploads currently use a server-mediated direct upload route:

1. The browser asks the Next.js app for an upload intent.
2. The Worker reserves a pending file row in D1.
3. The browser uploads to a Next.js route.
4. The Next.js route forwards the file to the Worker.
5. The Worker writes the object to R2 and activates the file after validating size and ownership.

This keeps R2 private and simple to operate, but it is not a presigned browser-to-R2 upload flow. The app intentionally caps files at 50 MB. For larger files or heavier usage, the next step would be presigned/direct R2 uploads with the same completion validation.

## Prerequisites

- Node.js 22+ and npm. This repo includes `.nvmrc` for Node 22.16.0.
- A Cloudflare account with Workers, D1, and R2 enabled.
- A Resend account and verified sender for production OTP email.

## Local Setup

Install dependencies:

```bash
npm install
```

Create the Cloudflare resources:

```bash
npx wrangler d1 create clover-db
npx wrangler r2 bucket create clover-files
npx wrangler r2 bucket create clover-backups
```

Copy and edit the local config files:

```bash
cp .env.example .env.local
cp wrangler.example.jsonc wrangler.jsonc
```

Update `wrangler.jsonc` with the generated D1 `database_id`. Use the same long random `CLOVER_BACKEND_SECRET` in `.env.local` and the Worker secret.

Configure Worker secrets:

```bash
npx wrangler secret put CLOVER_BACKEND_SECRET
npx wrangler secret put AUTH_HASH_PEPPER
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
```

Apply D1 migrations:

```bash
npm run db:migrations:apply
npm run db:migrations:apply:remote
```

Run the backend and frontend in separate terminals:

```bash
npm run backend:dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Frontend/Vercel variables:

- `AUTH_COOKIE_NAME`
- `CLOVER_BACKEND_URL`
- `CLOVER_BACKEND_SECRET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` if Turnstile is enabled

Worker secrets:

- `CLOVER_BACKEND_SECRET`
- `AUTH_HASH_PEPPER`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `TURNSTILE_SECRET_KEY` if Turnstile is enabled

Worker vars:

- `TURNSTILE_ENABLED`
- `AUTH_DEBUG_OTP_LOGGING` for local-only OTP debugging without Resend

Cloudflare API credentials such as `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_DATABASE_ID` are only for Wrangler, Drizzle Kit, and operations scripts. Keep them in your shell or CI secrets, not in source or Vercel runtime variables.

## Scripts

```bash
npm run dev                         # Start the Next.js app
npm run backend:dev                 # Start the Cloudflare Worker locally
npm run lint                        # Run ESLint
npm run build                       # Build the Next.js app
npm run backend:deploy              # Deploy the Worker
npm run db:migrations:apply         # Apply local D1 migrations
npm run db:migrations:apply:remote  # Apply remote D1 migrations
npm run backup:d1                   # Export remote D1 and upload to backup R2
npm run cleanup:uploads             # Remove stale pending uploads
```

## Deployment

Deploy the frontend to Vercel and the backend to Cloudflare Workers:

```bash
npm run db:migrations:apply:remote
npm run build
npm run backend:deploy
```

Set Vercel environment variables before deploying the frontend, then point `CLOVER_BACKEND_URL` at the deployed Worker URL.

## Open Source

Clover is released under the [MIT License](./LICENSE).

## Acknowledgements

This project was originally based on the [JavaScript Mastery storage management tutorial](https://github.com/JavaScript-Mastery-Pro/storage-management) and has since been adapted with a custom Cloudflare Workers/D1/R2 backend, OTP auth, private object access, and deployment/operations tooling.
