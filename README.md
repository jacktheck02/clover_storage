# Clover - Cloud File Storage & Management

Clover is a cloud file storage and management web application. It is basically a lightweight clone of Google Drive. The site is hosted on Vercel with Next.js, while a separate Cloudflare Worker backend owns Cloudflare D1 auth/file metadata and Cloudflare R2 private file objects. You can upload files, preview them, and share them with other users in your instance of the application.

Based on the tutorial by [JavaScript Mastery](https://github.com/JavaScript-Mastery-Pro/storage-management).

## Technologies Used

### Frontend

- **Next.js** - React framework with App Router
- **React** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives (dialogs, dropdowns, selects, toasts)
- **shadcn/ui** - Re-usable component library
- **Recharts** - Data visualization and charts
- **Lucide React** - Icon library

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
- **class-variance-authority** - Component variant management
- **clsx** & **tailwind-merge** - Conditional styling utilities

## Prerequisites

- **Node.js** 20.19+ and npm/yarn/pnpm/bun
- A Cloudflare account with Workers, D1, and R2 enabled
- A Resend account and verified sender for production OTP email

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd clover
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Set up Cloudflare

Create the D1 database and R2 buckets:

```bash
npx wrangler d1 create clover-db
npx wrangler r2 bucket create clover-files
npx wrangler r2 bucket create clover-backups
```

Update `wrangler.jsonc` with the generated D1 `database_id`, then apply migrations:

```bash
npm run db:migrations:apply
npm run db:migrations:apply:remote
```

### 4. Set up environment variables

For local Vercel/Next development, create a `.env.local` file in the root directory:

```env
AUTH_COOKIE_NAME=clover-session
CLOVER_BACKEND_URL=http://localhost:8787
CLOVER_BACKEND_SECRET=replace_with_the_same_secret_used_by_the_worker
```

Set the same `AUTH_COOKIE_NAME`, `CLOVER_BACKEND_URL`, and `CLOVER_BACKEND_SECRET` in Vercel project environment variables before pushing to a Vercel-deployed branch.

For the Cloudflare Worker backend, configure secrets with Wrangler:

```bash
npx wrangler secret put CLOVER_BACKEND_SECRET
npx wrangler secret put AUTH_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

`CLOUDFLARE_API_TOKEN` is only for Wrangler resource/deploy commands. Keep it in your local shell or CI secret store, not in Vercel runtime variables and never in source.

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
npm run build
npm run backend:deploy
```

## Operations

Create a remote D1 export and upload it to the backup R2 bucket:

```bash
BACKUPS_R2_BUCKET_NAME=clover-backups npm run backup:d1
```

Clean up stale pending upload rows and orphaned R2 objects:

```bash
npm run cleanup:uploads
```

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

### Other Deployment Options

You can also deploy to:

- **Netlify** - Similar process, add environment variables in site settings
- **Railway** - Supports Next.js out of the box
- **Docker** - Build and deploy using containers
- **Self-hosted** - Deploy to your own server

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
