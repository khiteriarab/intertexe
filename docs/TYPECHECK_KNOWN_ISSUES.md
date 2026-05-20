# Typecheck (`npm run check`) — known non-catalog issues

`npm run check` may still report errors **outside** the Next.js catalog layer (`lib/supabase-server.ts`, `lib/homepage-data.ts`, `app/**` product pages). As of the catalog migration, remaining failures are typically:

- **`server/routes.ts`** — Express `Request` missing Passport fields (`isAuthenticated`, `user`); `supabaseAdmin` nullability; `priceNum` undefined in one handler; regex `s` flag vs `tsconfig` `target` ES2017.
- **`server/vite.ts`** — missing root `vite.config` module (dev-only Vite middleware).

These are pre-existing / separate from the shared Supabase catalog RPC work. Fix or exclude them in a dedicated PR if you need a green `tsc` for CI.
