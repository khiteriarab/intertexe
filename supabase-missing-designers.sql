-- Add missing designers that have products but no designer entry
-- Run this in the Supabase SQL Editor

INSERT INTO designers (name, slug, website, status) VALUES
  ('Rixo', 'rixo', 'https://rixo.co.uk', 'Pending'),
  ('Sea New York', 'sea-new-york', 'https://sea-ny.com', 'Pending'),
  ('Aje', 'aje', 'https://ajeworld.com', 'Pending'),
  ('Sir the Label', 'sir-the-label', 'https://sirthelabel.com', 'Pending'),
  ('Camilla and Marc', 'camilla-and-marc', 'https://camillaandmarc.com', 'Pending')
ON CONFLICT (slug) DO NOTHING;
