/**
 * B2B entry architecture — platform subdomain routing (no live DNS required).
 * Run: npm run test:platform-routing
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isPlatformHost } from "../lib/dashboard/constants.ts";
import {
  buildDashboardPasswordResetRedirect,
  getEnterpriseLoginUrl,
  getEnterpriseLoginOrigin,
} from "../lib/platform-urls.ts";
import { hostScopedSessionCookieOptions } from "../lib/dashboard/session-cookies.ts";

test("isPlatformHost recognizes enterprise subdomain", () => {
  assert.equal(isPlatformHost("platform.intertexe.com"), true);
  assert.equal(isPlatformHost("platform.localhost"), true);
  assert.equal(isPlatformHost("www.intertexe.com"), false);
  assert.equal(isPlatformHost("dashboard.intertexe.com"), false);
});

test("enterprise login URL defaults to platform.intertexe.com in production", () => {
  const prev = process.env.NEXT_PUBLIC_PLATFORM_APP_URL;
  const prevNode = process.env.NODE_ENV;
  delete process.env.NEXT_PUBLIC_PLATFORM_APP_URL;
  process.env.NODE_ENV = "production";
  assert.equal(getEnterpriseLoginOrigin(), "https://platform.intertexe.com");
  assert.equal(getEnterpriseLoginUrl(), "https://platform.intertexe.com/");
  process.env.NEXT_PUBLIC_PLATFORM_APP_URL = prev;
  process.env.NODE_ENV = prevNode;
});

test("session cookies are host-scoped and never set domain", () => {
  const opts = hostScopedSessionCookieOptions();
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.sameSite, "lax");
  assert.equal(opts.path, "/");
  assert.equal("domain" in opts, false);
  const login = fs.readFileSync(path.join(process.cwd(), "app/api/dashboard/login/route.ts"), "utf8");
  const cookies = fs.readFileSync(path.join(process.cwd(), "lib/dashboard/session-cookies.ts"), "utf8");
  assert.match(login, /hostScopedSessionCookieOptions/);
  assert.match(cookies, /Never set `domain`/);
  assert.doesNotMatch(login, /domain:/);
});

test("password reset redirect stays on requesting host", () => {
  assert.equal(
    buildDashboardPasswordResetRedirect("https://platform.intertexe.com"),
    "https://platform.intertexe.com/reset-password?next=%2Fdashboard"
  );
  assert.equal(
    buildDashboardPasswordResetRedirect("https://www.intertexe.com"),
    "https://www.intertexe.com/reset-password?next=%2Fdashboard"
  );
  const forgot = fs.readFileSync(path.join(process.cwd(), "app/api/dashboard/forgot-password/route.ts"), "utf8");
  assert.match(forgot, /buildDashboardPasswordResetRedirect\(request\.nextUrl\.origin\)/);
});

test("middleware handles platform host and enterprise login path", () => {
  const middleware = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.match(middleware, /isPlatformHost/);
  assert.match(middleware, /enterpriseLoginPath/);
  assert.match(middleware, /\/dashboard\/login/);
  assert.match(middleware, /Consumer routes.*belong on www/);
  assert.match(middleware, /isEnterpriseSurface/);
});

test("consumer sign-in banner targets www account, not enterprise login", () => {
  const banner = fs.readFileSync(path.join(process.cwd(), "app/components/SignInBenefitsBanner.tsx"), "utf8");
  const urls = fs.readFileSync(path.join(process.cwd(), "lib/platform-urls.ts"), "utf8");
  assert.match(banner, /getConsumerAccountUrl/);
  assert.match(banner, /isPlatformHost/);
  assert.doesNotMatch(banner, /getEnterpriseLoginUrl/);
  assert.match(urls, /getConsumerAccountUrl/);
});

test("sales page links sign-in to enterprise login helper", () => {
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");
  const sections = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-sections.tsx"), "utf8");
  assert.match(nav, /getEnterpriseLoginUrl/);
  assert.match(sections, /Request a demo/);
  assert.match(sections, /Sign in/);
  assert.match(sections, /INTERTEXE FOR BRANDS/);
  assert.doesNotMatch(nav, /\/dashboard\/login/);
});

test("enterprise login supports SSO without consumer chrome", () => {
  const login = fs.readFileSync(path.join(process.cwd(), "app/dashboard/login/page.tsx"), "utf8");
  assert.match(login, /Continue with SSO/);
  assert.match(login, /Welcome to INTERTEXE/);
  assert.match(login, /Go to INTERTEXE/);
  assert.match(login, /Your product data,/);
  assert.match(login, /getConsumerAccountUrl/);
});

test("reset-password recognizes enterprise flow from platform host", () => {
  const reset = fs.readFileSync(path.join(process.cwd(), "app/reset-password/page.tsx"), "utf8");
  assert.match(reset, /isEnterpriseResetFlow/);
  assert.match(reset, /isPlatformHost/);
  assert.match(reset, /Opening your workspace/);
});

test("platform host strips consumer chrome from login", () => {
  const appShell = fs.readFileSync(path.join(process.cwd(), "app/components/AppShell.tsx"), "utf8");
  const clientApp = fs.readFileSync(path.join(process.cwd(), "app/components/ClientApp.tsx"), "utf8");
  const layout = fs.readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");
  assert.match(appShell, /isPlatformHost/);
  assert.match(appShell, /platformHost/);
  assert.match(clientApp, /platformHost/);
  assert.match(clientApp, /showConsumerChrome/);
  assert.match(clientApp, /platformHost \|\| b2b/);
  assert.match(layout, /AppShell/);
  assert.match(layout, /ConsumerCookieConsent/);
});
