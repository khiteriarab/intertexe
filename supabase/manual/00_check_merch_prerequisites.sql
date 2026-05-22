-- Run in Supabase SQL Editor BEFORE applying 20240018_merch_refresh_v2.sql
-- All "ok" rows should be true.

SELECT 'homepage_merch_rails' AS object,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'homepage_merch_rails'
  ) AS ok;

SELECT 'homepage_feed_items' AS object,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'homepage_feed_items'
  ) AS ok;

SELECT 'homepage_feed_insert_picked' AS object,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'homepage_feed_insert_picked'
  ) AS ok;

SELECT 'catalog_dedupe_key' AS object,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_dedupe_key'
  ) AS ok;

SELECT 'live_products_apparel' AS object,
  EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'live_products_apparel'
  ) AS ok;

SELECT 'editorial_collection_products' AS object,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'editorial_collection_products'
  ) AS ok;

SELECT 'refresh_homepage_feeds_v2 already exists' AS object,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_homepage_feeds_v2'
  ) AS ok;
