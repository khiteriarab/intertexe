# INTERTEXE

## Overview
INTERTEXE is a luxury fashion discovery and curation platform focused on **material quality**. Users can browse designers ranked by natural fiber percentage, take a material-preference quiz, save favorites, and receive AI-powered recommendations.

## Recent Changes
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
- `SESSION_SECRET` - Optional, defaults to dev secret
