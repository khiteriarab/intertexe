# INTERTEXE B2B entry architecture

Local implementation only — **no production DNS cutover yet**.

## URL map

| URL | Role |
|-----|------|
| `intertexe.com` | Consumer / public INTERTEXE |
| `intertexe.com/platform` | Public B2B sales page (10 sections) |
| `platform.intertexe.com` | Enterprise login + existing SaaS (`/dashboard/...`) |
| `intertexe.com/p/[public-id]` | Public product passport |
| `dashboard.intertexe.com` | Legacy HQ/enterprise host (still supported) |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_PLATFORM_APP_URL` | Enterprise origin for Sign in CTAs (`https://platform.intertexe.com`) |
| `NEXT_PUBLIC_SITE_URL` | Consumer origin for cross-links (`https://www.intertexe.com`) |

## Vercel (before cutover)

1. Add `platform.intertexe.com` domain to the same Vercel project.
2. Set `NEXT_PUBLIC_PLATFORM_APP_URL=https://platform.intertexe.com`.
3. Preview locally with `platform.localhost` + `/etc/hosts`.

## Supabase

No OAuth callback changes required — dashboard auth is password-based via `/api/dashboard/login`.

Before go-live, add `https://platform.intertexe.com/reset-password` to HQ Auth redirect allowlist
(current config lists www URLs only).

## Cookies — host isolation (do NOT use Domain=.intertexe.com)

Sessions are **host-scoped** on purpose:

| Host | Cookies set | Used by |
|------|-------------|---------|
| `platform.intertexe.com` | `enterprise_session` / `dashboard_session` on platform host | Enterprise login + org dashboard |
| `www.intertexe.com` | Separate jar | Consumer + legacy `/dashboard` during transition |

Implementation: `lib/dashboard/session-cookies.ts` — `httpOnly`, `Secure` (prod), `SameSite=Lax`, `path=/`, **no `domain` attribute**.

Login from `platform.intertexe.com` posts to `/api/dashboard/login` on the same host, so Set-Cookie applies to platform only. Consumer and enterprise cookies must not be shared via parent domain.

## Password reset

`/api/dashboard/forgot-password` builds `redirectTo` from `request.nextUrl.origin`:

- From `platform.intertexe.com` → `https://platform.intertexe.com/reset-password?next=/dashboard`
- From `www` → `https://www.intertexe.com/reset-password?next=/dashboard`

HQ Auth only (not obelisk-core). Pure enterprise-only accounts without HQ Auth credentials cannot use this flow today.

## Customer-facing login URL

Production Sign in: `https://platform.intertexe.com/` (middleware rewrites internally to `/dashboard/login`).

Do not advertise `/dashboard/login` in production CTAs. Dev fallback: `/dashboard/login` when `NEXT_PUBLIC_PLATFORM_APP_URL` is unset.

## Compatibility

- `/dashboard/login` on www still works during transition (separate cookie jar).
- `/platform/login` redirects to enterprise login URL.
- `dashboard.intertexe.com` unchanged.
