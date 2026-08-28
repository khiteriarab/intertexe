# INTERTEXE identity architecture

Status: **Phase 1 implemented 27 Aug 2026.** Two Auth projects remain separate. Staff use HQ Auth; the workspace switch mints a short-lived, revocable obelisk-core user session. Email is never authorization.

## Why this exists

Consumer/HQ (`burrylupizvggupsryuj`) and obelisk-core (`dpiksashuqetyzrjogal`) stay separate. Separate projects do **not** require two passwords for the same INTERTEXE person.

Phase 1 replaced the accidental design (HQ login auto-creating INTERTEXE membership by email, then reading catalogs with the service role) with an explicit staff mapping and a user-JWT data plane.

---

## Implemented Phase 1

### Populations

| Population | Human login | Authorization / RLS principal | Password they type |
|---|---|---|---|
| INTERTEXE staff (Founder HQ) | Consumer/HQ Auth (`dashboard_session`) | HQ: `hq_internal_users` + roles. Enterprise: linked obelisk-core `auth.users` row so RLS sees `auth.uid()` | HQ password only |
| Brand users | obelisk-core Auth (`enterprise_session`) | `profiles.auth_user_id` + `organization_memberships` | Enterprise password |
| Supplier users | obelisk-core Auth | same, role `supplier_contributor` + assigned products | Enterprise password |

No third identity provider. No shared JWT secret. Staff’s obelisk-core user is a **technical principal**, not a second human password. The founder principal is **owner of org `intertexe` only**, not an Enterprise super-admin (`intertexe_super_admin` stays false).

Mapping table (HQ):

`enterprise_identity_links(hq_user_id, enterprise_user_id, status, created_at, created_by, email_audit)`

UUIDs only. `email_audit` is forensic. Provisioner email: `itx-principal.{compactHqUuid}@identity.intertexe.com`.

### How the Enterprise JWT is issued

`POST /api/dashboard/workspace/enter-enterprise` (POST only; no GET mint):

1. Verify the HQ session with HQ Auth `getUser(token)` and an active `hq_internal_users` row.
2. Load the **active** identity link by `hq_user_id` (UUID). Missing/revoked → 403.
3. Load the Enterprise user by `enterprise_user_id`. Banned / missing → fail.
4. Mint a **real obelisk-core user session** server-side:
   - `auth.admin.generateLink({ type: "magiclink", email })` — admin API, **does not send mail**, type is never `recovery`.
   - `verifyOtp({ token_hash, type: "email" })` on an **ephemeral** anon client (not the cached verifier, so another user’s session is not left in memory).
   - `action_link` is discarded. **Refresh token is discarded.** Only the access JWT is stored.
5. Confirm **active membership** on the requested org using that user JWT. Fail closed and `signOut` the minted session if membership is missing/suspended.
6. Record GoTrue `session_id` in HQ `enterprise_handoff_sessions` with `expires_at` = now + **15 minutes** (`ENTERPRISE_HANDOFF_TTL_SECONDS`).
7. Set httpOnly `enterprise_session` with `maxAge` 15 minutes. The browser never receives the service-role key or a reusable admin token.
8. Audit `enterprise_handoff_minted` on HQ.

The switcher POSTs this route, then navigates. Bookmark of `/dashboard/intertexe` with only an HQ cookie is redirected to `/dashboard` (middleware + org layout). Staff re-enter through the switcher.

### How it is refreshed, expired, and revoked

| Event | Behavior |
|---|---|
| Refresh | **None.** No refresh cookie. After 15 minutes the browser drops the cookie. Even if the GoTrue access token is still cryptographically valid, HQ `enterprise_handoff_sessions` is expired and `getEnterpriseAuthSession` returns null. |
| Every org request (handoff) | `requireHandoffStillValid`: HQ cookie still present and valid, handoff row live, identity link still **active**, `enterprise_user_id` matches. |
| Membership suspended | Memberships are listed with the user JWT and `status=active` only. Org pages 404. New mint fails. |
| Identity link revoked | New mint fails. Existing handoff fails the per-request link check. All open handoff rows for that HQ user are revoked. |
| Logout | Clear both cookies. Revoke HQ handoff rows. `auth.admin.signOut` on the Enterprise access token (local). `auth.admin.signOut` on the HQ access token (local). Bust the in-process HQ session memo. Subsequent HQ JWTs issued **before** the latest `hq_auth_audit_events.logout` row are rejected (JWT `iat` check) so a stolen HQ cookie does not survive logout. |

Linked staff cannot `signInWithPassword` on obelisk-core (`isLinkedEnterprisePrincipal`, including revoked links). Dashboard forgot-password is **HQ Auth only** and skips `itx-principal.*@identity.intertexe.com`. Linked recovery remains disabled.

### Org data plane

Org pages and `/api/dashboard/org/*` use `getEnterpriseUserClient(accessToken)`. `lib/enterprise/queries.ts`, `pipeline.ts`, `review.ts`, and `publish.ts` do not call `getEnterpriseServiceClient`.

Service role remains only for: provisioning, `generateLink`, org deletion, public resolver, HQ snapshot admin.

Direct `/dashboard/{org}` without `enterprise_session`: middleware 307 to `/dashboard` (if HQ cookie) or login. Layout also 403/404.

### What was removed from the login path

- `ensureCustomerZeroMembership(email)`
- Listing Enterprise memberships by HQ email for HQ actors
- Treating `HQ_FOUNDER_EMAILS` as Enterprise authorization (HQ bootstrap only)

---

## 1. Recommended long-term identity architecture

Keep **two backend security domains** forever. Do not introduce a third identity vendor until a product need exists (staff Google Workspace SSO, or brand SAML).

Treat **people** and **authorization principals** as different things. The table in “Implemented Phase 1” is the long-term shape.

## 2. Authorization across HQ, organizations, and suppliers

Authorization is always **server-side** and **role-scoped**. The switcher is not an authority.

```text
HQ page
  → valid HQ JWT (consumer Auth)
  → hq_internal_users.is_active
  → hq_internal_user_roles
  → JWT iat after latest logout audit event

Enterprise org page / API
  → valid obelisk-core JWT
  → if handoff: live HQ handoff row + active identity link + HQ session
  → profiles.auth_user_id = auth.uid()
  → organization_memberships (org, role, status=active)
  → RLS

Staff entering DPP Workspace
  → HQ checks above
  → enterprise_identity_links.status = active
  → mint + membership + RLS
```

## 3. How RLS stays enforced in obelisk-core

Dashboard product data uses the anon key plus `Authorization: Bearer ${enterpriseUserJwt}`. Not the service-role client.

## 4. Password reset, MFA, logout, email change, lifecycle

| Event | Staff (linked) | Brand / supplier |
|---|---|---|
| Login | HQ Auth only | obelisk-core Auth only |
| Password reset | HQ forgot-password only. Technical principal emails are skipped. | obelisk-core recovery (not via `/api/dashboard/forgot-password`) |
| Logout | Clear both cookies; revoke handoff; sign out both GoTrue sessions; HQ JWT iat vs logout audit | Clear Enterprise cookie |
| Email change | HQ email is not authorization. Update `email_audit` only. | Standard obelisk-core email change |
| Offboarding | `status=revoked`, suspend HQ user, suspend membership | Membership removed / user banned |

## 5. Migration path

Phase 1 **is** the long-term shape for a long time. Later, without rewriting tenants:

| When | Change | What stays |
|---|---|---|
| Staff want Google Workspace | SSO **on HQ Auth**. Mapping + mint unchanged. | obelisk-core customer Auth |
| Brands want SAML | SSO **on obelisk-core Auth**. | HQ Auth, identity_links |
| Supabase first-party impersonation | Replace generateLink mint with that API. | Same cookies, 15-minute TTL, RLS |
| Central IdP | Last resort. Both projects keep local principals. | Data domains stay split |

## 6. Security risks and tradeoffs

| Risk | Mitigation |
|---|---|
| HQ compromise can mint linked Enterprise sessions | Limit links to named staff. Audit mints. Revoke on offboarding. 15-minute TTL. |
| `generateLink` is privileged | Server-only, magiclink not recovery, hashed_token never returned to the browser, no mail. |
| GoTrue access tokens may outlive 15 minutes | App TTL + HQ `enterprise_handoff_sessions` + per-request link check. Refresh token never stored. |
| HQ JWT may remain valid after GoTrue logout | Logout audit `iat` check plus cookie clear. |
| Service role still on the Next.js server | Provisioning/mint/deletion/public resolver only. Never in cookies. |
| Dual cookies | Logout clears both. Linked users cannot Enterprise-password-login. |

## Test accounts

**A. Founder / internal** — existing HQ Auth user `d3287555-de2b-422f-93c8-a9ac61fc7684`; Enterprise principal `7f3b09d1-2d90-4327-bd21-c07c273e16cc`; owner of `intertexe` (`65e504e7-8238-4d34-81de-d356ac1fe810`).

**B. Ordinary brand user** — obelisk-core Auth only, membership on a disposable test org, not `intertexe`.

## Tests (27 Aug 2026)

See `docs/enterprise-readiness.md` for the full gate table. Identity-specific:

- `scripts/enterprise-identity.test.ts` — 12 unit invariants passed
- `scripts/enterprise-identity.live.test.ts` — staff switch, HQ-only org URL denied, RLS as linked user, Org A ⊄ Org B, suspend, revoke, brand off HQ/intertexe, logout
- Isolation + permissions live tests — Org A ⊄ Org B, supplier assigned-only, read-only cannot mutate
- `scripts/enterprise-customer-zero-gate.ts` — founder HQ session → enter-enterprise → import → approve → publish v1/v2 as the linked user JWT
- Browser: disposable HQ analyst → switcher → INTERTEXE DPP Workspace → upload → map → source preserved → approve → publish → `/p/{id}` v1 → update → resolve conflict → publish v2
