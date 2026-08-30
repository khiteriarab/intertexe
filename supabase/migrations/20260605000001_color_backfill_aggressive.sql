-- Aggressive color backfill from product names (displayable US catalog products).

UPDATE public.products SET color = 'black'
WHERE color IS NULL AND is_displayable = true
AND name ILIKE '%black%';

UPDATE public.products SET color = 'white'
WHERE color IS NULL AND is_displayable = true
AND name ILIKE '%white%'
AND name NOT ILIKE '%off-white%'
AND name NOT ILIKE '%off white%';

UPDATE public.products SET color = 'ivory'
WHERE color IS NULL AND is_displayable = true
AND name ILIKE '%ivory%';

UPDATE public.products SET color = 'cream'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%cream%' OR name ILIKE '%oat%' OR name ILIKE '%butter%');

UPDATE public.products SET color = 'ecru'
WHERE color IS NULL AND is_displayable = true
AND name ILIKE '%ecru%';

UPDATE public.products SET color = 'off-white'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%off-white%' OR name ILIKE '%off white%');

UPDATE public.products SET color = 'beige'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%beige%' OR name ILIKE '% camel%' OR name ILIKE '% sand%' OR name ILIKE '% taupe%');

UPDATE public.products SET color = 'navy'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%navy%' OR name ILIKE '%midnight blue%');

UPDATE public.products SET color = 'burgundy'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%burgundy%' OR name ILIKE '%bordeaux%' OR name ILIKE '%wine%' OR name ILIKE '%oxblood%');

UPDATE public.products SET color = 'red'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '% red%' OR name ILIKE '%scarlet%' OR name ILIKE '%cherry%' OR name ILIKE '%crimson%')
AND name NOT ILIKE '%burgundy%' AND name NOT ILIKE '%bordeaux%';

UPDATE public.products SET color = 'blue'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '% blue%' OR name ILIKE '%cobalt%' OR name ILIKE '%cerulean%' OR name ILIKE '%teal%')
AND name NOT ILIKE '%navy%' AND name NOT ILIKE '%midnight%';

UPDATE public.products SET color = 'pink'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '% pink%' OR name ILIKE '%blush%' OR name ILIKE '% rose%' OR name ILIKE '%fuchsia%' OR name ILIKE '%coral%');

UPDATE public.products SET color = 'green'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '% green%' OR name ILIKE '%olive%' OR name ILIKE '%sage%' OR name ILIKE '%emerald%' OR name ILIKE '%moss%');

UPDATE public.products SET color = 'brown'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%brown%' OR name ILIKE '%cognac%' OR name ILIKE '%chocolate%' OR name ILIKE '%tobacco%' OR name ILIKE '%toffee%');

UPDATE public.products SET color = 'grey'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '% grey%' OR name ILIKE '% gray%' OR name ILIKE '%charcoal%' OR name ILIKE '%slate%');

UPDATE public.products SET color = 'orange'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%orange%' OR name ILIKE '%terracotta%' OR name ILIKE '% rust%' OR name ILIKE '%amber%');

UPDATE public.products SET color = 'yellow'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%yellow%' OR name ILIKE '%mustard%' OR name ILIKE '%saffron%');

UPDATE public.products SET color = 'gold'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '% gold%' OR name ILIKE '%champagne%')
AND name NOT ILIKE '%rose gold%';

UPDATE public.products SET color = 'silver'
WHERE color IS NULL AND is_displayable = true
AND name ILIKE '% silver%';

UPDATE public.products SET color = 'rose gold'
WHERE color IS NULL AND is_displayable = true
AND name ILIKE '%rose gold%';

UPDATE public.products SET color = 'purple'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%purple%' OR name ILIKE '%violet%' OR name ILIKE '%lavender%' OR name ILIKE '% lilac%' OR name ILIKE '% plum%');

UPDATE public.products SET color = 'metallic'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%metallic%' OR name ILIKE '%sequin%' OR name ILIKE '%lurex%' OR name ILIKE '%shimmer%');

UPDATE public.products SET color = 'animal print'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%leopard%' OR name ILIKE '%cheetah%' OR name ILIKE '%zebra%' OR name ILIKE '%snakeskin%' OR name ILIKE '%animal print%');

UPDATE public.products SET color = 'print'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%floral%' OR name ILIKE '%stripe%' OR name ILIKE '%striped%' OR name ILIKE '% plaid%' OR name ILIKE '%paisley%' OR name ILIKE '%printed%' OR name ILIKE '%houndstooth%' OR name ILIKE '%gingham%');

UPDATE public.products SET color = 'multi'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '%multicolor%' OR name ILIKE '%multicolour%' OR name ILIKE '%colorblock%');

UPDATE public.products SET color = 'neutrals'
WHERE color IS NULL AND is_displayable = true
AND (name ILIKE '% nude%' OR name ILIKE '%neutral%');
