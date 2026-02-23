# INTERTEXE

## Overview
INTERTEXE is a platform designed to be the definitive material quality reference for luxury fashion, aiming to simplify buying decisions for high-end consumers. It vets and ranks designers, providing clear quality verdicts. Key features include quality tier badges, prescriptive buying rules for various fabrics, curated selections ("The Edit"), a comprehensive directory with quality filters, and AI-powered material advice. The platform's vision is to empower consumers with reliable information, ensuring they make informed luxury fashion purchases without extensive label scrutiny.

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
- **Database Management:** Utilizes PostgreSQL for storing user-specific data (users, favorites, quiz results) and Supabase for designer data, allowing for efficient data management and scalability.
- **AI Integration:** Incorporates OpenAI's GPT-4o-mini for AI-driven material advice and quiz recommendations, with conversation persistence and history management.
- **Authentication:** Features an email-based signup and login flow, with token persistence in the database. A dual-write sync mechanism ensures data consistency between the local PostgreSQL and Supabase for user-related data.
- **Quality Tier System:** Implements a clear quality tier system (Exceptional, Excellent, Good, Caution, Under Review) displayed across designer cards and detailed verdicts.
- **Fabric Persona System:** Assigns one of five fabric personas (e.g., The Purist, The Refined Romantic) to users based on quiz answers, enabling personalized recommendations and content.
- **Product Verification:** Includes a system for storing and displaying verified products with detailed composition, natural fiber percentages, and links to brand sites.
- **SEO Optimization:** Dynamic SEO is implemented for designer and product pages, ensuring discoverability and rich previews.

**Feature Specifications:**
- **Designer Directory:** A comprehensive, searchable A-Z directory of designers with quality tier filters.
- **Material Detail Pages:** Rich editorial content for various materials, including origin, characteristics, care, and sustainability, along with recommended designers.
- **Interactive Quiz:** A multi-step quiz to ascertain user material preferences, leading to persona assignment and tailored recommendations.
- **Personalized Shop:** A dedicated `shop` page that curates designers and products based on user preferences and fabric persona.
- **Affiliate Integration:** Implements an interstitial `/leaving` page for affiliate redirects, displaying disclosures and maintaining brand consistency.
- **Analytics:** Tracks key user events (signup, quiz completion, favorites) for insights.

## External Dependencies
- **OpenAI:** Utilized for AI recommendations and chat functionalities (GPT-4o-mini). Users can connect their own OpenAI API keys.
- **Supabase:** Serves as the primary database for designer information and as a synchronized data store for user data, supporting direct frontend integration for Vercel deployments.
- **PostgreSQL:** The core database for the Express.js backend, storing user accounts, quiz results, and favorites.
- **Resend:** Used for sending branded welcome emails upon user signup.
- **thum.io:** Employed for generating website screenshots for brand images.