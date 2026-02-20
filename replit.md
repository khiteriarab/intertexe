# INTERTEXE

## Overview
INTERTEXE is a luxury fashion discovery and curation platform focused on **material quality**. Users can browse designers ranked by natural fiber percentage, take a material-preference quiz, save favorites, and receive AI-powered recommendations.

## Recent Changes
- **2026-02-20**: Initial full-stack build
  - PostgreSQL database with Drizzle ORM
  - Passport.js authentication (email/password)
  - 20 seeded designers with real natural fiber data
  - AI recommendation endpoint (OpenAI integration with fallback)
  - Full quiz flow (4 steps) with persistence
  - Favorites system with user association
  - Luxury editorial design with Playfair Display + DM Sans fonts

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + wouter routing + TanStack Query
- **Backend**: Express.js with session-based auth (Passport.js)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4o-mini for quiz recommendations (graceful fallback if no API key)

### Key Files
- `shared/schema.ts` - Data models (users, designers, favorites, quiz_results)
- `server/routes.ts` - API routes (/api/designers, /api/favorites, /api/quiz, /api/recommend, /api/auth/*)
- `server/storage.ts` - Database CRUD operations
- `server/auth.ts` - Passport authentication setup
- `server/seed.ts` - Designer seed data (20 luxury brands)
- `client/src/lib/api.ts` - Frontend API client
- `client/src/hooks/use-auth.ts` - Authentication hook

### Routes
- `/` - Homepage with hero, featured designers, material focus, CTA
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
- `DATABASE_URL` - PostgreSQL connection
- `OPENAI_API_KEY` - Optional, for AI recommendations
- `SESSION_SECRET` - Optional, defaults to dev secret
