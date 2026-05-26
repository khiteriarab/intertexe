type LoopsContactInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  userGroup?: string;
  invitationCode?: string;
};

function resolveUserGroup(invitationCode?: string): string {
  const code = (invitationCode || "").toUpperCase();
  if (code.startsWith("FOUNDERS")) return "founders";
  if (code.startsWith("SILK") || code.startsWith("LINEN")) return "influencer";
  return "general";
}

/** Sync a new signup to Loops (no-op when LOOPS_API_KEY is unset). */
export async function syncContactToLoops(input: LoopsContactInput): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return;

  const userGroup = input.userGroup || resolveUserGroup(input.invitationCode);

  const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email: input.email,
      firstName: input.firstName || undefined,
      lastName: input.lastName || undefined,
      source: input.source || "signup",
      userGroup,
      mailingLists: {
        weekly_edit: true,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Loops contact sync failed:", res.status, text);
  }
}
