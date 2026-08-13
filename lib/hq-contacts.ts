import { normalizeEmail } from "./email-constants";
import { createServiceClient } from "./supabase/server";

/**
 * Outreach contacts live in Supabase `hq_contacts` (imported from Google Docs).
 * HQ does not import or edit them. On signup, match email → set user_id.
 */
export async function linkHqContactOnSignup(input: {
  email: string;
  userId: string;
}): Promise<void> {
  const email = normalizeEmail(input.email || "");
  const userId = (input.userId || "").trim();
  if (!email || !userId) return;

  const supabase = createServiceClient();
  await supabase
    .from("hq_contacts")
    .update({
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .ilike("email", email)
    .is("user_id", null);
}
