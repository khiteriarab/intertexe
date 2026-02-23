# INTERTEXE

## Overview
INTERTEXE is the definitive material quality reference for luxury fashion. The platform makes buying decisions for high-end consumers — every designer is vetted, ranked, and given a clear quality verdict so shoppers never have to read a label or guess. Features include quality tier badges, prescriptive buying rules for every fabric, curated "The Edit" picks, a comprehensive directory with tier filters, AI-powered material advice, and verified product-level data scraped from brand websites.

## User Preferences
- Brand colors: Background #FAFAF8, Accent #111111
- Typography: Playfair Display (serif headings), DM Sans (body)
- Design aesthetic: Luxury, minimal, editorial, modern
- No border radius (sharp edges throughout)

## System Architecture
The INTERTEXE platform is built with a modern web stack, emphasizing a luxury, minimal, and editorial design aesthetic.

**UI/UX Decisions:**
- **Visuals:** Features a clean, sharp-edged design with no border radius. Typography uses Playfair Display for headings and DM Sans for body text, adhering to a luxury aesthetic.
- **Mobile-First Design:** The entire platform is responsive and optimized for mobile devices, including touch-optimized interactions and safe-area-inset support for notched phones.
- **Navigation:** Clear and intuitive navigation with a focus on core features like "The Edit," "Directory," and "Buying Guide." A mobile bottom navigation is implemented for easy access.
- **Personalization:** A `/shop` page provides personalized shopping experiences based on user fabric personas, quiz preferences, and saved favorites.

**Technical Implementations:**
- **Frontend:** Developed with React, Vite, Tailwind CSS for styling, wouter for routing, and TanStack Query for data fetching.
- **Backend:** Powered by Express.js, handling API routes and session-based authentication using Passport.js.
- **Database Management:** Utilizes PostgreSQL for storing user-specific data (users, favorites, quiz results, products) and Supabase for designer data, allowing for efficient data management and scalability.
- **AI Integration:** Incorporates OpenAI's GPT-4o-mini for AI-driven material advice and quiz recommendations, with conversation persistence and history management.
- **Authentication:** Features an email-based signup and login flow, with token persistence in the database. A dual-write sync mechanism ensures data consistency between the local PostgreSQL and Supabase for user-related data.
- **Quality Tier System:** Implements a clear quality tier system (Exceptional, Excellent, Good, Caution, Under Review) displayed across designer cards and detailed verdicts.
- **Fabric Persona System:** Assigns one of five fabric personas (e.g., The Purist, The Refined Romantic) to users based on quiz answers, enabling personalized recommendations and content.
- **Product Verification:** 257 verified products across 5 brands (Anine Bing, Khaite, Sandro, Reformation, The Kooples) stored in products table with composition, natural fiber %, images, prices.
- **SEO Product Pages:** 9 material+category pages under `/materials/` (e.g., `/materials/linen-dresses`, `/materials/silk-tops`, `/materials/cashmere-sweaters`) with SEO titles like "Best Linen Dresses in 2026 | INTERTEXE", buying tips, red flags, and email capture.
- **Shop by Fabric:** General material pages (`/materials/cotton`, `/materials/cashmere`, etc.) now show verified products matching that fabric type with product cards, brand links, composition labels, and external shop links. Products queried via `fetchProductsByFiberAndCategory` with fiber-specific search terms.
- **SEO Optimization:** Dynamic SEO for designer pages (e.g., "Reformation Quality Review 2026"), product pages, and curated collection pages.
- **Navigation:** Desktop nav: The Edit, Directory, Buying Guide, Quiz, Chat. Shop available via mobile bottom nav. No logo overlap.
- **Composition Parsing:** Handles raw material names: "flax"→linen, "wood pulp"→viscose, "Good Earth Cotton"→cotton.

**Feature Specifications:**
- **Designer Directory:** A comprehensive, searchable A-Z directory of designers with quality tier filters.
- **Material Detail Pages:** Rich editorial content for various materials, including origin, characteristics, care, and sustainability, along with recommended designers.
- **Interactive Quiz:** A multi-step quiz to ascertain user material preferences, leading to persona assignment and tailored recommendations.
- **Personalized Shop:** A dedicated `shop` page that curates designers and products based on user preferences and fabric persona.
- **Affiliate Integration:** Implements an interstitial `/leaving` page for affiliate redirects, displaying disclosures and maintaining brand consistency.
- **Analytics:** Tracks key user events (signup, quiz completion, favorites) for insights.
- **Products API:** `/api/products` with fiber/category filters, `/api/products/:brandSlug` for brand-specific products.

## External Dependencies
- **OpenAI:** Utilized for AI recommendations and chat functionalities (GPT-4o-mini). Users can connect their own OpenAI API keys.
- **Supabase:** Serves as the primary database for designer information and as a synchronized data store for user data and products, supporting direct frontend integration for Vercel deployments.
- **PostgreSQL:** The core database for the Express.js backend, storing user accounts, quiz results, favorites, and verified products.
- **Resend:** Used for sending branded welcome emails upon user signup.
- **thum.io:** Employed for generating website screenshots for brand images.

## Product Data
- **Supabase Migration:** `supabase-products-migration.sql` contains CREATE TABLE + 257 INSERT statements for syncing to Supabase.
- **Scraper Scripts:** `scripts/scrape-brands.cjs` (Shopify JSON scrapers for Khaite, Anine Bing) and `scripts/sync-to-supabase.cjs` (Supabase sync + migration SQL generation).
- **Brands Scraped:** Anine Bing (113 products, keyword-inferred compositions), Frame (150 products, Shopify composition data), Khaite (96 products, Shopify Material option), Sandro (26 products), Reformation (13 products), The Kooples (9 products). Total: 407 verified products.
- **Frame SQL:** `supabase-frame-products.sql` — 150 INSERT statements for syncing Frame products to Supabase.
- **Non-Scrapable Brands:** ba&sh, Sézane, Ganni, Isabel Marant, Vince are protected by Cloudflare/non-Shopify platforms and cannot be scraped via Shopify JSON APIs.
- **Composition Inference:** Anine Bing uses keyword-based inference from product descriptions (silk, cashmere, cotton, wool, denim, etc.) since structured composition data is not available.
- **Pass Rates:** Sandro dresses 7%, Sandro tops 95%, Reformation 87%, The Kooples 75%.
- **Homepage Brands:** Khaite, Anine Bing, Totême, Frame, AGOLDE, Sandro, Acne Studios, Nanushka (strong hero images, verified data or curated scores).

## Brand Directory (Curated Profiles)
- **Brand Profiles:** `client/src/lib/brand-profiles.ts` — 36 structured brand profiles with editorial intros, material strengths, price ranges, tier classification, HQ, and founding year.
- **4-Tier System:** Anchor (established, high trust), Material-Strong (fabric-first brands), Aspirational Luxury (finest materials), Accessible Premium (quality at approachable prices).
- **Anchor Brands:** Khaite, Anine Bing, Vince, Rag & Bone, Frame, Totême, Theory, Sandro, Nanushka, Max Mara, The Kooples.
- **Material-Strong:** Eileen Fisher, A.P.C., COS, Arket, Equipment, Nili Lotan, Filippa K, Joseph, Margaret Howell, Citizens of Humanity, AGOLDE, Ami Paris.
- **Aspirational:** The Row, Brunello Cucinelli, Loro Piana, Jil Sander, Lemaire, Bottega Veneta, Chloé, Loewe, Stella McCartney, Acne Studios.
- **Accessible:** Reformation, Everlane, & Other Stories, Massimo Dutti, Re/Done, Quince.
- **Additional Profiles:** Loulou Studio, St. Agni, Maria McManus (39 total brand profiles).
- **Designer Detail Page:** Enhanced with brand profile data — material strength tags, price range, tier badge, HQ/founding year, editorial intro. Mobile hero image banner added. "Shop" button text updated for affiliate readiness.
- **Supabase Migration:** `supabase-brand-profiles-migration.sql` — CREATE TABLE + 39 INSERT statements for `brand_profiles` table. Run in Supabase SQL editor to populate data for Vercel deployment.
- **Navigation:** Desktop nav uses flexbox layout (no absolute positioning) to prevent logo overlap. Mobile bottom nav with safe-area-inset support.
