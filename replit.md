# INTERTEXE

## Overview
INTERTEXE is a luxury fashion platform focused on natural fabrics, acting as a "Google for natural-fabric fashion." It enables users to discover and shop for products made from specific natural fibers like cotton, linen, silk, wool, and cashmere, organizing over 17,000 verified products. Key features include quality tier badges, prescriptive buying rules, curated subcategory pages, a comprehensive brand directory, and AI-powered material advice. The platform aims to be the easiest way to shop luxury fashion while prioritizing natural materials, providing verified product-level data, and offering a highly curated shopping experience.

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
- **Data Quality Cron:** An hourly Vercel cron job (`/api/cron/data-quality`) automatically recalculates natural fiber percentages, corrects category misclassifications (skirts→bottoms, jackets→outerwear), removes duplicates, and flags products below the 95% threshold or missing images. Returns a JSON report of all fixes.
- **SEO Optimization:** ISR (Incremental Static Regeneration) with 1-hour revalidation on all pages for proper cache headers. Sitemap index at `/api/sitemap` splits into pages, designers, and product chunks (5,000 per file). Organization + WebSite JSON-LD on every page. Brand name "INTERTEXE" in H1, title tags, meta descriptions, and footer content. Canonical tags on all pages.
- **Quality Tier System:** A defined quality tier system (Exceptional, Excellent, Good, Caution, Under Review) is applied to designers and products.
- **Fabric Persona System:** Assigns users a fabric persona based on quiz answers for personalized recommendations.

**Feature Specifications:**
- **Designer Directory:** A searchable A-Z directory of designers with quality tier filters.
- **Material Detail Pages:** Rich editorial content for various materials with recommended designers.
- **Interactive Quiz:** A multi-step quiz for user material preferences, leading to persona assignment and tailored recommendations.
- **Personalized Shop:** A dedicated shop page that curates designers and products based on user preferences.
- **Affiliate Integration:** Implements an interstitial `/leaving` page for affiliate redirects with disclosures.
- **Product Pages:** Individual product pages (`/product/:id`) include JSON-LD, dynamic SEO, composition breakdown, and related product recommendations.
- **Sale Page:** A dedicated `/sale` page with fiber type and price threshold filters, featuring products with discounts.
- **Price Update System:** A daily script (`scripts/update-prices.cjs`) crawls product endpoints to update prices and flag sale items.

## External Dependencies
- **OpenAI:** Used for AI recommendations and chat functionalities (GPT-4o-mini).
- **Supabase:** Primary database for all application data (users, auth, products, designers, favorites, quiz results).
- **Resend:** Utilized for sending transactional emails, such as password reset links and welcome emails.
- **thum.io:** Employed for generating website screenshots for brand images.