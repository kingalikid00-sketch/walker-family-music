# The Walker Family

**A Lifetime of Music. A Legacy of Memories.**

A premium, mobile-first website for personalised original songs.

## Website
- Premium dark walnut, cream and gold visual direction.
- $99 USD offer and four-working-day delivery target.
- Order form preview and draft privacy/terms pages.
- GitHub Pages hosts the public website.

## Order API scaffold
The repository now includes:
- `worker.js` — Cloudflare Worker for server-side Paystack initialization and verification.
- `schema.sql` — D1 orders table.
- `wrangler.toml` — Worker configuration (database ID still needs to be set).
- `.github/workflows/deploy-worker.yml` — deployment workflow.

**This backend is not deployed or connected to the form yet.** The website does not currently accept orders or payments. Do not advertise checkout as active until the API, database, merchant account and end-to-end test are complete.

## Required deployment configuration
1. Create a separate Cloudflare D1 database named `walker-family-orders`, run `schema.sql` against it, then replace the placeholder `database_id` in `wrangler.toml`.
2. Add GitHub Actions repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Add the Worker secret `PAYSTACK_SECRET_KEY` and Worker variable `SITE_URL` (the public GitHub Pages URL).
4. Deploy the Worker, test its health endpoint, then connect the website form to its exact Worker URL.

Never put payment secrets in browser code, GitHub files, screenshots or chat messages.

## Paystack and settlement
Paystack's current documentation lists USD payments for eligible Nigerian businesses. USD settlement requires an approved Zenith Bank USD domiciliary account; USD acceptance must also be enabled for the merchant. International USD card pricing is currently listed at 3.9%. A Starter Business has a USD 5,000 lifetime collection limit. These requirements must be confirmed in the merchant's own Paystack dashboard before checkout is enabled.

## Family photo
The approved image is saved separately but has not yet been committed to `assets/walker-family.jpg`. The hero currently falls back to its dark background until that asset is added.

## Launch checklist
- Connect and test the order API.
- Add private admin access, order tracking and delivery email.
- Confirm business contact details and final privacy/terms wording.
- Test a complete payment and server-side verification before accepting customers.
