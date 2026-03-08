import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ message: "Server configuration error" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let userId: string;

    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: { data: { name: name || "" } },
    });

    if (signUpError) {
      if (signUpError.message.includes("already been registered") || signUpError.message.includes("already registered")) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (adminError) {
        if (adminError.message.includes("already been registered")) {
          return res.status(400).json({ message: "Email already registered" });
        }
        return res.status(400).json({ message: "Unable to create account. Please try again." });
      }

      if (!adminData.user) {
        return res.status(500).json({ message: "Failed to create user" });
      }
      userId = adminData.user.id;
    } else {
      if (!signUpData.user) {
        return res.status(500).json({ message: "Failed to create user" });
      }
      userId = signUpData.user.id;

      if (signUpData.user.identities?.length === 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
    }

    const username = email.split("@")[0] + "_" + userId.slice(0, 6);

    await supabaseAdmin.from("users").upsert({
      id: userId,
      email,
      name: name || null,
      username,
      password: "supabase-auth",
      subscription_tier: "free",
      fabric_persona: null,
    });

    return res.status(201).json({
      id: userId,
      email,
      name: name || null,
      username,
      subscriptionTier: "free",
      fabricPersona: null,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
