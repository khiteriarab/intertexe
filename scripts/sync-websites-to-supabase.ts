import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const KNOWN_DOMAINS: Record<string, string> = {
  "alexander wang": "alexanderwang.com",
  "ralph lauren": "ralphlauren.com",
  "tommy hilfiger": "tommyhilfiger.com",
  "calvin klein": "calvinklein.com",
  "michael kors": "michaelkors.com",
  "marc jacobs": "marcjacobs.com",
  "kate spade": "katespade.com",
  "tory burch": "toryburch.com",
  "diane von furstenberg": "dvf.com",
  "oscar de la renta": "oscardelarenta.com",
  "carolina herrera": "carolinaherrera.com",
  "helmut lang": "helmutlang.com",
  "rag & bone": "rag-bone.com",
  "acne studios": "acnestudios.com",
  "a.p.c.": "apc.fr",
  "maison margiela": "maisonmargiela.com",
  "rick owens": "rickowens.eu",
  "the row": "therow.com",
  "bottega veneta": "bottegaveneta.com",
  "saint laurent": "ysl.com",
  "louis vuitton": "louisvuitton.com",
  "gucci": "gucci.com",
  "prada": "prada.com",
  "burberry": "burberry.com",
  "givenchy": "givenchy.com",
  "balenciaga": "balenciaga.com",
  "valentino": "valentino.com",
  "fendi": "fendi.com",
  "dior": "dior.com",
  "celine": "celine.com",
  "loewe": "loewe.com",
  "chanel": "chanel.com",
  "hermès": "hermes.com",
  "hermes": "hermes.com",
  "versace": "versace.com",
  "dolce & gabbana": "dolcegabbana.com",
  "armani": "armani.com",
  "giorgio armani": "armani.com",
  "emporio armani": "armani.com",
  "moncler": "moncler.com",
  "stone island": "stoneisland.com",
  "off-white": "off---white.com",
  "off white": "off---white.com",
  "fear of god": "fearofgod.com",
  "amiri": "amiri.com",
  "tom ford": "tomford.com",
  "stella mccartney": "stellamccartney.com",
  "isabel marant": "isabelmarant.com",
  "nanushka": "nanushka.com",
  "ganni": "ganni.com",
  "cos": "cos.com",
  "arket": "arket.com",
  "& other stories": "stories.com",
  "zara": "zara.com",
  "massimo dutti": "massimodutti.com",
  "uniqlo": "uniqlo.com",
  "j.crew": "jcrew.com",
  "theory": "theory.com",
  "vince": "vince.com",
  "frame": "frame-store.com",
  "brunello cucinelli": "brunellocucinelli.com",
  "loro piana": "loropiana.com",
  "zegna": "zegna.com",
  "tod's": "tods.com",
  "salvatore ferragamo": "ferragamo.com",
  "jimmy choo": "jimmychoo.com",
  "christian louboutin": "christianlouboutin.com",
  "nike": "nike.com",
  "adidas": "adidas.com",
  "new balance": "newbalance.com",
  "converse": "converse.com",
  "vans": "vans.com",
  "birkenstock": "birkenstock.com",
  "ugg": "ugg.com",
  "the north face": "thenorthface.com",
  "patagonia": "patagonia.com",
  "canada goose": "canadagoose.com",
  "barbour": "barbour.com",
  "allsaints": "allsaints.com",
  "paul smith": "paulsmith.com",
  "vivienne westwood": "viviennewestwood.com",
  "alexander mcqueen": "alexandermcqueen.com",
  "etro": "etro.com",
  "missoni": "missoni.com",
  "max mara": "maxmara.com",
  "jil sander": "jilsander.com",
  "marni": "marni.com",
  "sacai": "sacai.jp",
  "issey miyake": "isseymiyake.com",
  "kenzo": "kenzo.com",
  "ami paris": "amiparis.com",
  "jacquemus": "jacquemus.com",
  "lemaire": "lemaire.fr",
  "our legacy": "ourlegacy.com",
  "stussy": "stussy.com",
  "carhartt wip": "carhartt-wip.com",
  "reformation": "thereformation.com",
  "anine bing": "aninebing.com",
  "agolde": "agolde.com",
  "khaite": "khaite.com",
  "proenza schouler": "proenzaschouler.com",
  "coach": "coach.com",
  "longchamp": "longchamp.com",
  "mulberry": "mulberry.com",
  "mcm": "mcmworldwide.com",
  "hugo boss": "hugoboss.com",
  "boss": "hugoboss.com",
  "diesel": "diesel.com",
  "dsquared2": "dsquared2.com",
  "moschino": "moschino.com",
  "balmain": "balmain.com",
  "lanvin": "lanvin.com",
  "mugler": "mugler.com",
  "rabanne": "rabanne.com",
  "chloé": "chloe.com",
  "chloe": "chloe.com",
  "sandro": "sandro-paris.com",
  "maje": "maje.com",
  "zadig & voltaire": "zadig-et-voltaire.com",
  "ba&sh": "ba-sh.com",
  "h&m": "hm.com",
  "a_cold_wall*": "a-cold-wall.com",
  "gcds": "gcds.com",
  "msgm": "msgm.it",
  "oamc": "oamc.com",
  "dkny": "dkny.com",
  "3.1 phillip lim": "31philliplim.com",
  "thom browne": "thombrowne.com",
  "a bathing ape": "bape.com",
  "supreme": "supremenewyork.com",
  "golden goose": "goldengoose.com",
  "common projects": "commonprojects.com",
  "everlane": "everlane.com",
  "aritzia": "aritzia.com",
  "free people": "freepeople.com",
  "madewell": "madewell.com",
  "gap": "gap.com",
  "brooks brothers": "brooksbrothers.com",
  "lululemon": "lululemon.com",
  "alo yoga": "aloyoga.com",
  "hoka": "hoka.com",
  "puma": "puma.com",
  "zimmermann": "zimmermann.com",
  "eileen fisher": "eileenfisher.com",
  "citizens of humanity": "citizensofhumanity.com",
  "mother": "motherdenim.com",
  "paige": "paige.com",
  "7 for all mankind": "7forallmankind.com",
  "veja": "veja-store.com",
  "on running": "on-running.com",
  "salomon": "salomon.com",
  "asics": "asics.com",
  "columbia": "columbia.com",
  "timberland": "timberland.com",
  "fjallraven": "fjallraven.com",
  "woolrich": "woolrich.com",
};

function guessBrandWebsite(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (KNOWN_DOMAINS[lower]) return `https://${KNOWN_DOMAINS[lower]}`;
  const cleaned = lower
    .replace(/[®™*#°]/g, '')
    .replace(/\s+/g, '')
    .replace(/[&+]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9.-]/g, '');
  if (cleaned.length < 2) return null;
  return `https://${cleaned}.com`;
}

async function main() {
  console.log("Step 1: Adding website column to Supabase if not exists...");

  const { error: rpcError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE designers ADD COLUMN IF NOT EXISTS website TEXT;'
  });
  
  if (rpcError) {
    console.log("RPC not available, trying direct column check...");
    const { data: testRow } = await supabase.from("designers").select("id, website").limit(1);
    if (testRow && testRow.length > 0 && 'website' in testRow[0]) {
      console.log("Website column already exists.");
    } else {
      console.log("WARNING: website column may not exist. You may need to run:");
      console.log("ALTER TABLE designers ADD COLUMN IF NOT EXISTS website TEXT;");
      console.log("in the Supabase SQL Editor first. Continuing anyway...");
    }
  } else {
    console.log("Website column added/confirmed.");
  }

  console.log("\nStep 2: Fetching all designers from Supabase...");
  
  const allDesigners: { id: string; name: string; website: string | null }[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from("designers")
      .select("id, name, website")
      .range(from, from + PAGE_SIZE - 1);
    
    if (error) {
      console.error("Error fetching designers:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allDesigners.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  
  console.log(`Fetched ${allDesigners.length} designers total.`);
  
  const needsUpdate = allDesigners.filter(d => !d.website);
  const alreadyHasWebsite = allDesigners.filter(d => d.website);
  console.log(`${alreadyHasWebsite.length} already have website URLs.`);
  console.log(`${needsUpdate.length} need website URLs generated.`);
  
  if (needsUpdate.length === 0) {
    console.log("\nAll designers already have website URLs! Nothing to do.");
    
    const sample = allDesigners.slice(0, 10);
    console.log("\nSample of existing URLs:");
    sample.forEach(d => console.log(`  ${d.name} -> ${d.website}`));
    return;
  }
  
  console.log("\nStep 3: Generating and saving website URLs...");
  
  const BATCH_SIZE = 100;
  let updated = 0;
  let skipped = 0;
  
  for (let i = 0; i < needsUpdate.length; i += BATCH_SIZE) {
    const batch = needsUpdate.slice(i, i + BATCH_SIZE);
    
    const updates = batch.map(d => {
      const url = guessBrandWebsite(d.name);
      return { id: d.id, website: url };
    }).filter(u => u.website !== null);
    
    for (const upd of updates) {
      const { error } = await supabase
        .from("designers")
        .update({ website: upd.website })
        .eq("id", upd.id);
      
      if (error) {
        console.error(`  Failed to update ${upd.id}: ${error.message}`);
        skipped++;
      } else {
        updated++;
      }
    }
    
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsUpdate.length / BATCH_SIZE);
    console.log(`  Batch ${batchNum}/${totalBatches}: ${updates.length} updated`);
  }
  
  console.log(`\nDone! Updated ${updated} designers, skipped ${skipped}.`);
  
  console.log("\nStep 4: Verifying...");
  const { data: verify, error: verifyError } = await supabase
    .from("designers")
    .select("id, name, website")
    .is("website", null)
    .limit(10);
  
  if (verifyError) {
    console.error("Verification error:", verifyError.message);
  } else if (verify && verify.length > 0) {
    console.log(`${verify.length} designers still without website URLs (sample):`);
    verify.forEach(d => console.log(`  ${d.name}`));
  } else {
    console.log("All designers now have website URLs!");
  }
  
  const { data: sample } = await supabase
    .from("designers")
    .select("name, website")
    .in("name", ["Gucci", "Prada", "Louis Vuitton", "Chanel", "Dior", "Balenciaga"])
    .limit(10);
  
  if (sample) {
    console.log("\nSample verified URLs:");
    sample.forEach((d: any) => console.log(`  ${d.name} -> ${d.website}`));
  }
}

main().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
