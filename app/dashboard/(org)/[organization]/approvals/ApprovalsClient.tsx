"use client";

type Approval = {
  id: string;
  title: string;
  status: string;
  detail: string | null;
  request_comment: string | null;
  decision_comment: string | null;
  created_at: string;
  decided_at: string | null;
};

export function ApprovalsClient({
  organization,
  pending,
  decided,
}: {
  organization: string;
  pending: Approval[];
  decided: Approval[];
}) {
  async function decide(id: string, status: "approved" | "rejected") {
    const decisionComment = window.prompt(status === "approved" ? "Approval comment (optional)" : "Rejection reason") || "";
    await fetch(`/api/dashboard/org/${organization}/approvals`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalRequestId: id, status, decisionComment }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold mb-3">Pending</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--ent-muted)]">No pending approvals.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--ent-border)] p-4">
                <p className="font-medium">{item.title}</p>
                {item.detail ? <p className="text-sm text-[var(--ent-muted)] mt-1">{item.detail}</p> : null}
                <div className="flex gap-2 mt-3">
                  <button type="button" className="ent-btn ent-btn-primary text-xs" onClick={() => decide(item.id, "approved")}>Approve</button>
                  <button type="button" className="ent-btn ent-btn-secondary text-xs" onClick={() => decide(item.id, "rejected")}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-3">History</h3>
        <div className="space-y-2">
          {decided.slice(0, 20).map((item) => (
            <div key={item.id} className="text-sm border-b border-[var(--ent-border)] py-2">
              <span className="font-medium">{item.title}</span>
              <span className="text-[var(--ent-muted)]"> · {item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
