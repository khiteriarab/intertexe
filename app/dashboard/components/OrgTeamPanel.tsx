"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { invitationSummary } from "../../../../../lib/enterprise/invitation-status";

type InvitationSummary = ReturnType<typeof invitationSummary> & {
  statusLabel?: string;
  expiresLabel?: string;
};

export function OrgTeamPanel({
  slug,
  invitations,
  canInvite,
}: {
  slug: string;
  invitations: InvitationSummary[];
  canInvite: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("reviewer");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!canInvite) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(typeof payload.message === "string" ? payload.message : "Could not send invitation.");
        return;
      }
      setEmail("");
      setMessage("Invitation sent.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-[var(--ent-muted)] mb-5 leading-relaxed">
        Invite colleagues to this INTERTEXE workspace. Only owners and admins can send invitations.
      </p>

      {canInvite ? (
        <form onSubmit={invite} className="grid sm:grid-cols-[1fr_auto_auto] gap-3 mb-6">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="colleague@brand.com"
            className="ent-input text-sm"
          />
          <select value={role} onChange={(event) => setRole(event.target.value)} className="ent-select text-sm">
            <option value="product_manager">Product manager</option>
            <option value="reviewer">Reviewer</option>
            <option value="sustainability">Sustainability</option>
            <option value="admin">Admin</option>
            <option value="read_only">Read only</option>
          </select>
          <button type="submit" disabled={pending} className="ent-button-primary text-sm px-4 py-2.5 rounded-xl">
            {pending ? "Sending…" : "Invite"}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-[var(--ent-raspberry)] mb-4">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ent-forest)] mb-4">{message}</p> : null}

      <ul className="divide-y divide-[var(--ent-border)]">
        {invitations.length === 0 ? (
          <li className="py-4 text-sm text-[var(--ent-muted)]">No pending invitations.</li>
        ) : (
          invitations.map((invite) => (
            <li key={invite.id} className="py-4 flex items-center justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-[var(--ent-ink)]">{invite.email}</p>
                <p className="text-xs text-[var(--ent-muted-light)] mt-1">
                  {invite.role.replaceAll("_", " ")} · {invite.status}
                </p>
              </div>
              <span className="text-xs text-[var(--ent-muted-light)]">
                {new Date(invite.expiresAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
