# INTERTEXE

## Overview
INTERTEXE is a luxury fashion platform focused on natural fabrics, acting as a "Google for natural-fabric fashion." It enables users to discover and shop for products made from specific natural fibers like cotton, linen, silk, wool, and cashmere, organizing over 17,000+ verified products across 90+ curated brands. Key features include quality tier badges, prescriptive buying rules, curated subcategory pages, a comprehensive brand directory, and AI-powered material advice. The platform aims to be the easiest way to shop luxury fashion while prioritizing natural materials, providing verified product-level data, and offering a highly curated shopping experience.

## User Preferences
- Brand colors: Background #FAFAF8, Accent #111111
- Typography: Playfair Display (serif headings), DM Sans (body)
- Design aesthetic: Luxury, minimal, editorial, modern
- No border radius (sharp edges throughout)

## System Architecture
The INTERTEXE platform is built with a modern web stack, emphasizing a luxury, minimal, and editorial design aesthetic, and is optimized for performance and user experience.

**UI/UX Decisions:**
- **Visuals:** Features a clean, sharp-edged design with no border radius, using Playfair Display for headings and DM Sans for body text.
- **Mobile-First Design:** Fully responsive and optimized for mobile devices, including touch-optimized interactions and safe-area-inset support.
- **Navigation:** Desktop navigation includes Fabrics, Shop, Sale, Directory, Scanner, Quiz, Chat. Mobile bottom navigation includes Home, Fabrics, Scan, Shop, Account.
- **Shop Page:** Product-first `/shop` page organizes verified products by material with fiber and category sub-filters. Product cards display essential information and link to affiliate partners via an interstitial page.

**Technical Implementations:**
- **Frontend:** Built with Next.js 15 App Router for SSR/SSG, utilizing Server Components for data fetching and Client Components for interactivity. Styling is managed with Tailwind CSS v4.
- **Backend:** All API routes are implemented using Next.js API routes. Authentication and user data routes directly interact with Supabase.
- **Database:** Supabase is the primary database for all application data, including users, authentication, products, and designers.
- **Authentication:** Features an email-based signup/login flow with custom HMAC-signed tokens for secure user management and password resets. Product favorites are saved to `localStorage` for anonymous users and synced to Supabase upon login. Server-side uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS); future iOS app will use Supabase Auth with anon key + JWT (RLS enforced).
- **Row Level Security (RLS):** Enabled on all tables. Products/designers/reviews are publicly readable. All user data tables (favorites, quiz results, conversations, price alerts, recents) are restricted to the owning user via `auth.uid()`. Analytics events are public-insert only. The service role key used by the website bypasses RLS.
- **AI Integration:** Utilizes OpenAI's GPT-4o-mini for AI-driven material advice and quiz recommendations, supporting conversation persistence.
- **Analytics:** GA4 event tracking is implemented for key user actions and interactions.
- **Account Management:** Provides a user dashboard with profile management, wishlists, quiz history, and settings, including password changes and account deletion. A price watch system monitors product prices for user favorites.
- **Product Data:** Integrates a robust system for product verification, data scraping (Shopify JSON endpoints), and categorization. All products must be 95%+ natural fiber — viscose/rayon/modal/lyocell/acetate are classified as SYNTHETIC and do NOT count toward the natural fiber percentage. Every product query in `lib/supabase-server.ts` enforces `.gte("natural_fiber_percent", 95)`. It includes a `price_watches` system for price drop alerts.
- **Data Quality Cron:** A daily Vercel cron job (`/api/cron/data-quality`, runs at 3 AM UTC) automatically recalculates natural fiber percentages, corrects category misclassifications (skirts→bottoms, jackets→outerwear), removes duplicates, and flags products below the 95% threshold or missing images. Returns a JSON report of all fixes. Note: Hobby plan only supports daily crons — hourly schedule (`0 * * * *`) will cause deployment warnings.
- **SEO Optimization:** Dynamic rendering with `revalidate = 0` (no ISR caching) on all pages — content is always fresh. Sitemap index at `/api/sitemap` splits into pages, designers, and product chunks (5,000 per file). Organization + WebSite JSON-LD on every page. Brand name "INTERTEXE" in H1, title tags, meta descriptions, and footer content. Canonical tags on all pages.
- **Caching:** All ISR caching has been removed. `revalidate = 0` on all 14+ pages. Global `no-cache` headers set in `next.config.js`. Homepage API uses `no-store, no-cache, must-revalidate`.
- **Quality Tier System:** A defined quality tier system (Exceptional, Excellent, Good, Caution, Under Review) is applied to designers and products.
- **Fabric Persona System:** Assigns users a fabric persona based on quiz answers for personalized recommendations.

**Feature Specifications:**
- **Designer Directory:** A searchable A-Z directory of designers with quality tier filters.
- **Material Detail Pages:** Rich editorial content for various materials with recommended designers.
- **Interactive Quiz:** A multi-step quiz for user material preferences, leading to persona assignment and tailored recommendations.
- **Personalized Shop:** A dedicated shop page that curates designers and products based on user preferences.
- **Affiliate Integration:** Implements an interstitial `/leaving` page for affiliate redirects with disclosures. Rakuten Affiliate Network provides product feeds via FTP for 7 MIDs: Isabel Marant (49987), Fleur du Mal (50739), Faithfull the Brand (46961), Diesel (49384), A.L.C. (41993), L'AGENCE (42841), and Marketplace MID 50745 (multi-brand outlet with 40 brands including Theory, Vince, rag & bone, FRAME, Rails, Paige, Free People, Johnny Was, etc.). Ingestion scripts: `scripts/ingest-fleur-du-mal.cjs`, `scripts/ingest-marketplace-50745.cjs`, `scripts/ingest-lagence.cjs`.
- **Product Pages:** Individual product pages (`/product/:id`) include JSON-LD, dynamic SEO, composition breakdown, and related product recommendations.
- **Sale Page:** A dedicated `/sale` page with fiber type and price threshold filters, featuring products with discounts.
- **Price Update System:** A daily script (`scripts/update-prices.cjs`) crawls product endpoints to update prices and flag sale items.

## Deployment (Vercel via GitHub)
- **Repo:** `khiteriarab/intertexe` on GitHub, connected to Vercel (Hobby plan) since Feb 20.
- **How code gets to GitHub:** The `push-to-github.ts` script uses the GitHub API (blobs, trees, commits, ref updates) to push code. It does NOT use `git push` — it uploads files via API. This is slow for full uploads (629+ files) but works for incremental changes.
- **How Vercel builds:** Vercel's GitHub App watches the repo for push events. However, API-based ref updates (from `push-to-github.ts`) do NOT always trigger the Vercel webhook. When automatic builds stop working, use one of these manual triggers:
  1. **Vercel Dashboard → Deployments → Create Deployment** — paste `https://github.com/khiteriarab/intertexe/tree/main` as the branch reference.
  2. **Vercel Dashboard → three dots on a deployment → Redeploy** — but this rebuilds the SAME commit, not the latest. Only useful if the commit is already correct.
  3. **Deploy Hook** (recommended) — create one in Vercel Settings → Git → Deploy Hooks for the `main` branch. Can be triggered via `curl -X POST <hook-url>` from Replit.
- **Known deployment blockers:**
  - Cron schedule `0 * * * *` (hourly) causes a warning on Hobby plan — changed to `0 3 * * *` (daily at 3 AM).
  - The "Redeploy" button rebuilds the same old commit — to deploy NEW code, use "Create Deployment" with the branch reference.
  - API-created GitHub deployments (via `POST /repos/.../deployments`) are ignored by Vercel — only Vercel's own bot builds.
- **Vercel env vars needed:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `OPENAI_API_KEY`.
- **Build command:** `rm -rf .next && npx next build` (set in `vercel.json`).

## External Dependencies
- **OpenAI:** Used for AI recommendations and chat functionalities (GPT-4o-mini).
- **Supabase:** Primary database for all application data (users, auth, products, designers, favorites, quiz results).
- **Resend:** Utilized for sending transactional emails, such as password reset links and welcome emails.
- **thum.io:** Employed for generating website screenshots for brand images.