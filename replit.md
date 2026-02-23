# INTERTEXE

## Overview
INTERTEXE is the definitive material quality reference for luxury fashion. The platform makes buying decisions for high-end consumers — every designer is vetted, ranked, and given a clear quality verdict so shoppers never have to read a label or guess. Features include quality tier badges, prescriptive buying rules for every fabric, curated "The Edit" picks, a comprehensive directory with tier filters, and AI-powered material advice.

## Recent Changes
- **2026-02-23**: Logo Rebrand & Reviews Removal
  - Logo changed from "The House of / INTERTEXE" to just "INTERTEXE" with light "INTER" + bold "TEXE"
  - Applied consistently across Navbar, Footer, and all brand references
  - Removed entire community reviews feature (schema, storage, API routes, UI components)
  - Added "Browse Collection" teaser section on designer detail pages (Coming Soon — for future clothing API)
- **2026-02-22**: Brand Name Cleaning & Image Components
  - cleanBrandSymbols() strips ®, ™, ©, * from brand names (server + client)
  - Shared BrandImage component (client/src/components/BrandImage.tsx) used on designer detail + quiz results
  - Website screenshots via thum.io with letter-initial fallback
- **2026-02-22**: Authority Redesign — "We choose so you don't have to think"
  - Quality Tier System: Exceptional (90%+), Excellent (70-89%), Good (50-69%), Caution (<50%), Under Review (null)
  - Every designer card now shows quality badge + verdict across all pages
  - Homepage: "We've done the research. You just shop." hero, INTERTEXE Standard section, stats, curated top picks
  - Designer Detail: "The INTERTEXE Verdict" section with tier-specific buy/trust recommendation
  - Material pages: Full "Buying Rules" section — Look For, Avoid, Red Flags, Price Guidance per fabric
  - "Just In" → "The Edit" — curated picks filtered to 70%+ quality designers with tier filter tabs
  - Designers Directory: Quality tier filter buttons (All/Exceptional/Excellent/Good)
  - Navbar: Updated labels (The Edit, Directory, Buying Guide), search results show quality badges
  - Mobile nav: The Edit + Directory as primary tabs
- **2026-02-22**: AI Chat Platform (Material Advisor)
  - Full chat UI with streaming responses via OpenAI (gpt-5.1)
  - Custom system prompt: fashion fabrics, designer quality, sustainability expertise
  - Conversations persisted to DB (conversations + messages tables)
  - Suggested questions for new users
  - Sidebar with conversation history (create/delete/switch)
  - Mobile-responsive: fullscreen sidebar on mobile, compact input
  - Added /chat route + "Chat" in desktop nav + mobile bottom nav
- **2026-02-22**: Material Detail Pages
  - Expanded material data: origin, description, characteristics, care, sustainability, search keywords
  - Individual material detail pages at /materials/:slug
  - Material cards now clickable links on Materials page
  - Each material page shows recommended designers using natural fibers
  - Rich editorial content for Cotton, Silk, Linen, Wool, Cashmere, Leather, Denim, Tencel/Modal, Viscose/Rayon, Alpaca
- **2026-02-22**: Auth token persistence (DB-backed)
  - auth_tokens table stores tokens in PostgreSQL (survives server restarts)
  - Replaced in-memory Map token store with DB queries
  - Hourly cleanup of expired tokens
  - Fixes login not working on published/deployed site
- **2026-02-22**: Quiz brands fix + Navbar logo
  - Quiz brands step: loads 500 designers (not all 11,909) + Supabase search for typed queries
  - Loading state shown while designers load on mobile
  - Navbar: "INTERTEXE" logo with light "INTER" + bold "TEXE" treatment
  - Mobile nav: replaced "New" with "Chat" icon
- **2026-02-22**: Frontend-direct Supabase mode for Vercel deployment
  - client/src/lib/supabase.ts: Full Supabase Auth + direct CRUD for quiz/favorites/users
  - isVercelMode flag: VITE_USE_SUPABASE_AUTH=true activates direct Supabase writes
  - Supabase Auth (signUp/signInWithPassword) replaces Passport.js on Vercel
  - On signup: creates Supabase Auth user + inserts into custom users table
  - Quiz results write directly to Supabase quiz_results table (text[] arrays)
  - Favorites write directly to Supabase favorites table
  - Persona assignment runs client-side using shared/personas.ts
  - Login supports both email and username (username→email lookup if needed)
  - api.ts routes: isVercelMode → Supabase direct, else → Express /api/* routes
  - Replit mode unchanged: all API calls go through Express backend
- **2026-02-22**: Supabase dual-write sync (server-side)
  - server/storage.ts: All user CRUD operations now sync to Supabase (fire-and-forget)
  - Users, quiz_results, favorites tables synced on create/update/delete
  - Password hashes NOT synced (security) — placeholder value sent instead
  - Column mapping: camelCase (local PG) → snake_case (Supabase)
  - syncToSupabase() helper with error logging, non-blocking async
  - User persona updates sync to Supabase users table
- **2026-02-22**: Fabric persona system (5 categories)
  - shared/personas.ts: Defines 5 fabric personas (The Purist, The Refined Romantic, The Structured Minimalist, The Conscious Curator, The Performance Luxe)
  - assignPersona() deterministically assigns persona based on quiz answers (materials + synthetic tolerance)
  - fabric_persona column added to users table, updated on quiz completion/retake
  - /api/recommend now returns instant persona results (no AI dependency)
  - Quiz results page shows persona name, tagline, core value, buying advice, and designer types
  - Client-side fallback: if API fails, persona is assigned locally
  - Persona stored on user profile for filtering, recommendations, and email segmentation
- **2026-02-22**: Fabric standards module and redirect interstitial
  - shared/fabric-standards.ts: Defines allowed natural fibers, banned synthetics (polyester etc.), lining tolerance rules (max 15% synthetic in linings)
  - evaluateProduct() validates products against INTERTEXE quality standards for affiliate API integration
  - parseFabricString() parses common fabric composition formats from partner APIs
  - /leaving page: Branded interstitial shown before redirecting users to partner websites
  - 5-second auto-redirect countdown with manual "Continue to [Brand]" button
  - Affiliate disclosure included on redirect page
  - "Shop [Brand]" button added to designer detail pages, routing through /leaving
  - Designer interface updated to support website URL field (ready for Supabase column)
- **2026-02-22**: Signup flow, subscription gating, SEO, and analytics
  - After signup → redirect to /quiz (value-tied accounts)
  - Quiz results show "Save your results" banner if not logged in; auto-save if logged in
  - Removed all mock designer arrays (DESIGNERS, MOCK_USER) from data.ts
  - Added subscriptionTier column to users (default "free"), gating structure in /api/recommend
  - useSEO hook: dynamic page title + meta description + og:title/twitter:title per designer page
  - Analytics: analytics_events table, trackEvent on signup/quiz_completed/favorite_saved
  - /api/analytics/summary endpoint for event counts
  - Pending quiz results sync from localStorage on login/signup (syncPendingQuizData)
- **2026-02-22**: Resend welcome email on signup
  - server/resend.ts: Resend client via Replit connector (fresh credentials per send)
  - Branded HTML email with INTERTEXE luxury aesthetic (Georgia serif, #111 accents)
  - Fire-and-forget on signup — doesn't block account creation
- **2026-02-22**: Frontend-direct Supabase integration for Vercel deployment
  - Frontend now fetches designers directly from Supabase (no backend needed)
  - client/src/lib/supabase.ts: Supabase client with fetchDesigners/fetchDesignerBySlug
  - Falls back to /api/designers if VITE_SUPABASE_* env vars not set
  - All pages (Home, Designers, JustIn, Quiz, DesignerDetail, Navbar) use direct Supabase
  - Paginated fetching retrieves all 11,909 designers (batches of 1000)
  - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in Vercel env vars
  - TikTok social link updated to @shopintertexe
  - Scroll-to-top on page navigation
- **2026-02-20**: Mobile UX overhaul & auth simplification
  - Comprehensive mobile-first responsive design across all pages
  - Quiz brands step: shows 8 initial brands + search bar (not all 11,909)
  - Removed username from signup, email is now the sole login identifier
  - Touch-optimized: active:scale effects, proper tap targets, mobile grids
  - Safe-area-inset support for bottom nav on notched phones
  - Social links: Instagram @intertexe, TikTok @intertexe, Pinterest @shopintertexe
  - Designer directory: A-Z first, numbers/symbols grouped under "#" last
- **2026-02-20**: Supabase integration for designer data
  - Designers now sourced from Supabase (11,909 brands)
  - Graceful fallback to local PostgreSQL if Supabase unavailable
  - User's own OpenAI API key connected for AI recommendations
  - Frontend handles optional naturalFiberPercent/description fields
- **2026-02-20**: Initial full-stack build
  - PostgreSQL database with Drizzle ORM
  - Passport.js authentication (email/password)
  - AI recommendation endpoint (OpenAI integration with fallback)
  - Full quiz flow (4 steps) with persistence
  - Favorites system with user association
  - Luxury editorial design with Playfair Display + DM Sans fonts

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + wouter routing + TanStack Query
- **Backend**: Express.js with session-based auth (Passport.js)
- **Database**: PostgreSQL (local) for users/favorites/quiz + Supabase for designers
- **AI**: OpenAI GPT-4o-mini for quiz recommendations (user key > Replit integration > fallback)

### Key Files
- `shared/schema.ts` - Data models (users, designers, favorites, quiz_results)
- `server/routes.ts` - API routes (/api/designers, /api/favorites, /api/quiz, /api/recommend, /api/auth/*)
- `server/storage.ts` - Database CRUD operations (Supabase for designers, local PG for rest)
- `server/supabase.ts` - Server-side Supabase client configuration
- `server/auth.ts` - Passport authentication setup
- `server/seed.ts` - Designer seed data (local fallback, 20 luxury brands)
- `client/src/lib/supabase.ts` - Frontend Supabase client (direct designer fetching for Vercel)
- `client/src/lib/api.ts` - Frontend API client (auth, favorites, quiz)
- `client/src/hooks/use-auth.ts` - Authentication hook

### Routes
- `/` - Homepage with hero, featured designers, material focus, CTA
- `/just-in` - Latest designer additions with featured layout
- `/designers` - A-Z directory with search
- `/designers/:slug` - Designer detail with favorite toggle
- `/materials` - Material category guide
- `/quiz` - 4-step material preference quiz with AI results
- `/account` - Login/signup or dashboard with favorites & quiz history

## User Preferences
- Brand colors: Background #FAFAF8, Accent #111111
- Typography: Playfair Display (serif headings), DM Sans (body)
- Design aesthetic: Luxury, minimal, editorial, modern
- No border radius (sharp edges throughout)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (users, favorites, quiz)
- `OPENAI_API_KEY` - User's OpenAI key for AI recommendations
- `SUPABASE_PROJECT_URL` - Supabase project URL (server-side)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (server-side)
- `VITE_SUPABASE_URL` - Supabase project URL (frontend, required for Vercel)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (frontend, required for Vercel)
- `VITE_USE_SUPABASE_AUTH` - Set to "true" on Vercel to enable direct Supabase auth/writes (not set on Replit)
- `SESSION_SECRET` - Optional, defaults to dev secret

### Vercel Environment Variables
Set these in Vercel project settings:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- `VITE_USE_SUPABASE_AUTH` = `true`
