# Clover - Cloud File Storage & Management

Clover is a cloud file storage and management web application. It is basically a lightweight clone of Google Drive. The site is hosted on Vercel with Next.js, while a separate Cloudflare Worker backend owns Cloudflare D1 auth/file metadata and Cloudflare R2 private file objects. You can upload files, preview them, and share them with other users in your instance of the application.

Based on the tutorial by [JavaScript Mastery](https://github.com/JavaScript-Mastery-Pro/storage-management).

## Technologies Used

### Frontend

- **Next.js** - React framework with App Router
- **React** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible primitives used by local UI components (dialogs, dropdowns, selects, toasts)
- **shadcn/ui-style components** - Local reusable primitives in `components/ui`
- **Phosphor Icons** - Icon library

### Backend & Services

- **Vercel** - Next.js site hosting
- **Cloudflare Workers** - Backend API for D1/R2 operations
- **Cloudflare D1** - Auth, file metadata, and sharing records
- **Cloudflare R2** - Private object storage
- **Resend** - Email OTP delivery
- **Cloudflare Turnstile** - Optional bot protection for auth flows

### Form Handling & Validation

- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **@hookform/resolvers** - Form validation integration

### Additional Libraries

- **react-dropzone** - File upload handling
- **input-otp** - OTP input component
- **use-debounce** - Debouncing utilities
- **jszip** - Archive preview support
- **jsmediatags** - Audio artwork metadata parsing
- **class-variance-authority** - Component variant management
- **clsx** & **tailwind-merge** - Conditional styling utilities

## Prerequisites

- **Node.js** 22+ and npm. This repository includes an `.nvmrc` for Node 22.16.0.
- A Cloudflare account with Workers, D1, and R2 enabled
- A Resend account and verified sender for production OTP email

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/satyalyadav/clover_storage.git
cd clover_storage
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Cloudflare

Create the D1 database and R2 buckets:

```bash
npx wrangler d1 create clover-db
npx wrangler r2 bucket create clover-files
npx wrangler r2 bucket create clover-backups
```

Copy the example Wrangler config, then update `wrangler.jsonc` with the generated D1 `database_id` and any bucket names you changed:

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

Apply migrations:

```bash
npm run db:migrations:apply
npm run db:migrations:apply:remote
```

### 4. Set up environment variables

For local Vercel/Next development, copy the environment example:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your local values. `CLOVER_BACKEND_SECRET` must be the same long random value used by the Worker.

Set the same `AUTH_COOKIE_NAME`, `CLOVER_BACKEND_URL`, and `CLOVER_BACKEND_SECRET` in Vercel project environment variables before pushing to a Vercel-deployed branch.

For the Cloudflare Worker backend, configure secrets with Wrangler:

```bash
npx wrangler secret put CLOVER_BACKEND_SECRET
npx wrangler secret put AUTH_HASH_PEPPER
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
```

OTP codes are not logged by default when email delivery is missing. For local-only debugging without Resend, set `AUTH_DEBUG_OTP_LOGGING=true` in your local Worker environment; do not enable it in production.

If you enable Turnstile, set `TURNSTILE_ENABLED=true` for the Worker, add `TURNSTILE_SECRET_KEY` with Wrangler, and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the Next app.

Cloudflare API credentials such as `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_DATABASE_ID` are only for Wrangler, Drizzle Kit, and operations scripts. Keep them in your local shell or CI secret store, not in Vercel runtime variables and never in source.

### 5. Run development servers

Run the Cloudflare backend Worker:

```bash
npm run backend:dev
```

In another terminal, run the Vercel/Next app:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application. The Next app calls the Worker URL from `CLOVER_BACKEND_URL`.

### 6. Build for production

```bash
npm run db:migrations:apply:remote
npm run build
npm run backend:deploy
```

## Operations

Create a remote D1 export and upload it to the backup R2 bucket:

```bash
BACKUPS_R2_BUCKET_NAME=clover-backups npm run backup:d1
```

The backup script uses the R2 S3 API from your shell or CI. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` when running it.

Clean up stale pending upload rows and orphaned R2 objects:

```bash
npm run cleanup:uploads
```

The cleanup script requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN`. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` as well if it should delete orphaned R2 objects.

If you previously enabled direct browser uploads to R2, copy the example CORS policy, update its production origin, and apply it after deployment:

```bash
cp r2-cors.example.json r2-cors.json
npm run r2:cors:set
```

## Backend Structure

The Cloudflare Worker backend is split by responsibility under `cloudflare-api/src`:

- `index.ts` - Worker entrypoint, authorization gate, route dispatch, and top-level error handling
- `auth.ts` - OTP, sessions, Turnstile, Resend, and authenticated actor lookup
- `files.ts` - file listing, rename, share, delete, and storage summary routes
- `uploads.ts` - upload intent, direct upload, and upload completion routes
- `objects.ts` - authenticated file view/download streaming from R2
- `schemas.ts` - request validation schemas
- `storage.ts` - file type, MIME, R2 key, quota, and content-disposition helpers
- `users.ts` - D1 user/file row mapping helpers
- `crypto.ts`, `http.ts`, `rate-limit.ts`, `constants.ts`, and `types.ts` - shared utilities

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Next.js Documentation](https://vercel.com/docs/frameworks/nextjs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)

## Deployment

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository to Vercel
3. Add Vercel frontend environment variables in **Settings** → **Environment Variables**
4. Deploy!

**Important:** Vercel hosts the frontend only. Deploy the backend separately with `npm run backend:deploy`, then point `CLOVER_BACKEND_URL` at that Worker URL.

Vercel is the supported frontend deployment target for this project. Other hosts may work, but they need equivalent support for Next.js App Router and the same frontend environment variables.

## Open Source

Clover is released under the [MIT License](./LICENSE).

Before opening a pull request, run:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

Do not commit local deployment files such as `.env.local`, `wrangler.jsonc`, `r2-cors.json`, `.dev.vars`, `.wrangler/`, `.next/`, or `.open-next/`.
