# Cloudflare Cutover Runbook

## Preflight

- Upgrade local Node to `20.19+`.
- Confirm `wrangler.jsonc` has the production D1 database id and R2 bucket names.
- Confirm Vercel has `CLOVER_BACKEND_URL`, `CLOVER_BACKEND_SECRET`, and `AUTH_COOKIE_NAME`.
- Apply schema migrations to staging first, then production:

```bash
npm run db:migrations:apply
npm run db:migrations:apply:remote
```

- Configure Worker secrets:

```bash
npx wrangler secret put CLOVER_BACKEND_SECRET
npx wrangler secret put AUTH_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

## Staging Rehearsal

1. Run `npm run migrate:appwrite -- --dry-run` and compare exported user/file counts against Appwrite.
2. Run a real migration into staging D1/R2.
3. Verify sign-up, sign-in, OTP resend, upload, preview, rename, share, unshare, download, delete, search, sort, and dashboard totals.
4. Verify Vercel can reach the Worker backend URL with the shared secret.
5. Check random migrated files for byte size, content type, preview behavior, and download headers.

## Production Cutover

1. Put the Appwrite-backed app in maintenance mode or otherwise freeze writes.
2. Run `npm run migrate:appwrite`.
3. Import `migration-output/appwrite-import.sql` into production D1.
4. Run verification counts, byte totals, share access checks, and random file samples.
5. Deploy the Cloudflare Worker backend with `npm run backend:deploy`.
6. Set `CLOVER_BACKEND_URL` in Vercel to the deployed Worker URL.
7. Push/deploy the Vercel frontend.
8. Monitor Vercel function errors plus Worker CPU, D1 rows read/written, R2 Class A/B operations, and Resend delivery failures.

## Backups

- D1 Time Travel covers short recovery windows only.
- Run `BACKUPS_R2_BUCKET_NAME=clover-backups npm run backup:d1` after cutover and before risky maintenance.
- Keep Appwrite read-only until the rollback window closes.

## Rollback

- If verification fails before Vercel env cutover, keep the Appwrite-backed deployment live and discard the staging Cloudflare data.
- If issues appear after cutover, point Vercel back to the Appwrite-backed deployment or previous environment during the rollback window.
- Do not accept writes in both systems at once; freeze writes before switching back.
