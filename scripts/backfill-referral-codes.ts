import { createServiceClient } from "../lib/supabase/server";
import { generatePermanentReferralCode } from "../lib/invitation-codes";

async function backfill() {
  const supabase = createServiceClient();

  const { data: users, error } = await supabase
    .from("user_preferences")
    .select("user_id")
    .is("referral_code", null);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  if (!users?.length) {
    console.log("No users to backfill");
    return;
  }

  console.log(`Backfilling ${users.length} users`);

  for (const user of users) {
    const code = await generatePermanentReferralCode(user.user_id);
    console.log(`${user.user_id} → ${code}`);
  }

  console.log("Done");
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
