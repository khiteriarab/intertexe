const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSQL(filePath, label) {
  console.log(`\n--- Running: ${label} ---`);
  const sql = fs.readFileSync(filePath, "utf-8");
  
  // Split into individual statements
  const statements = sql
    .split(/;\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  let success = 0;
  let errors = 0;

  for (const stmt of statements) {
    const cleanStmt = stmt.endsWith(";") ? stmt : stmt + ";";
    const { error } = await supabase.rpc("exec_sql", { query: cleanStmt }).maybeSingle();
    if (error) {
      // Try direct approach via REST
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: cleanStmt }),
      });
      if (!res.ok) {
        // If exec_sql doesn't exist, we need another approach
        errors++;
        if (errors <= 3) {
          console.log(`  Error: RPC not available. Will try pg approach.`);
        }
      } else {
        success++;
      }
    } else {
      success++;
    }
  }
  console.log(`  ${success} succeeded, ${errors} failed`);
  return errors === 0;
}

async function runViaInserts() {
  console.log("\n--- Using Supabase client API instead of raw SQL ---");
  
  // 1. Create products table - we need to use the SQL editor approach
  // Since we can't run DDL via the client API, let's try the management API
  const sqlEndpoint = `${supabaseUrl}/rest/v1/`;
  
  // Check if products table exists
  const { data: prodCheck, error: prodErr } = await supabase
    .from("products")
    .select("id")
    .limit(1);
  
  if (prodErr && prodErr.code === "42P01") {
    console.log("Products table does not exist. You need to run the SQL in Supabase SQL editor.");
    console.log("File: supabase-products-migration.sql");
  } else if (prodErr) {
    console.log("Products table check error:", prodErr.message);
  } else {
    console.log(`Products table exists (${prodCheck?.length || 0} sample rows)`);
  }

  // Check if brand_profiles table exists
  const { data: bpCheck, error: bpErr } = await supabase
    .from("brand_profiles")
    .select("id")
    .limit(1);
  
  if (bpErr && bpErr.code === "42P01") {
    console.log("Brand profiles table does not exist. You need to run the SQL in Supabase SQL editor.");
    console.log("File: supabase-brand-profiles-migration.sql");
  } else if (bpErr) {
    console.log("Brand profiles table check error:", bpErr.message, bpErr.code);
  } else {
    console.log(`Brand profiles table exists (${bpCheck?.length || 0} sample rows)`);
  }

  return { prodExists: !prodErr, bpExists: !bpErr };
}

async function main() {
  console.log("Checking Supabase tables...");
  console.log(`URL: ${supabaseUrl?.substring(0, 30)}...`);
  
  const { prodExists, bpExists } = await runViaInserts();
  
  if (!prodExists || !bpExists) {
    console.log("\n=== TABLES MISSING ===");
    console.log("The Supabase JS client cannot create tables (DDL operations).");
    console.log("You have two options:");
    console.log("");
    console.log("Option 1: Run in Supabase SQL Editor (dashboard.supabase.com → SQL Editor)");
    if (!prodExists) console.log("  - Copy contents of: supabase-products-migration.sql");
    if (!bpExists) console.log("  - Copy contents of: supabase-brand-profiles-migration.sql");
    console.log("");
    console.log("Option 2: Let me try via the Supabase Management API...");
    
    // Try via the management API (requires the project ref)
    const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\./)?.[1];
    if (projectRef) {
      console.log(`\nProject ref: ${projectRef}`);
      console.log("Attempting SQL execution via Management API...");
      
      // The management API endpoint for SQL
      for (const [file, label] of [
        ["supabase-products-migration.sql", "Products"],
        ["supabase-brand-profiles-migration.sql", "Brand Profiles"],
      ]) {
        if (file === "supabase-products-migration.sql" && prodExists) continue;
        if (file === "supabase-brand-profiles-migration.sql" && bpExists) continue;
        
        const sql = fs.readFileSync(file, "utf-8");
        const res = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: sql }),
        });
        
        if (res.ok) {
          console.log(`  ✓ ${label}: Executed successfully`);
        } else {
          const text = await res.text();
          console.log(`  ✗ ${label}: ${res.status} - ${text.substring(0, 200)}`);
        }
      }
    }
  } else {
    console.log("\n✓ Both tables exist! Checking row counts...");
    
    const { count: prodCount } = await supabase.from("products").select("*", { count: "exact", head: true });
    const { count: bpCount } = await supabase.from("brand_profiles").select("*", { count: "exact", head: true });
    
    console.log(`  Products: ${prodCount} rows`);
    console.log(`  Brand Profiles: ${bpCount} rows`);
    
    if ((prodCount || 0) === 0) console.log("  ⚠ Products table is empty - data needs to be inserted");
    if ((bpCount || 0) === 0) console.log("  ⚠ Brand Profiles table is empty - data needs to be inserted");
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
