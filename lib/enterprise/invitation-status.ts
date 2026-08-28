export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at?: string | null;
  created_at?: string;
};

export function invitationStatus(row: InvitationRow, now = Date.now()): InvitationStatus {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at).getTime() < now) return "expired";
  return "pending";
}

export function invitationSummary(row: InvitationRow) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at || null,
    createdAt: row.created_at || null,
    status: invitationStatus(row),
  };
}
