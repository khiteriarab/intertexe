import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { invitationStatus } from "../lib/enterprise/invitation-status.ts";

describe("Founder invitation status", () => {
  const now = Date.parse("2026-08-28T12:00:00.000Z");

  it("derives pending, accepted, expired, and revoked states", () => {
    assert.equal(
      invitationStatus(
        { id: "1", email: "a@b", role: "owner", expires_at: "2026-09-01T00:00:00Z", accepted_at: null },
        now
      ),
      "pending"
    );
    assert.equal(
      invitationStatus(
        {
          id: "1",
          email: "a@b",
          role: "owner",
          expires_at: "2026-09-01T00:00:00Z",
          accepted_at: "2026-08-28T10:00:00Z",
        },
        now
      ),
      "accepted"
    );
    assert.equal(
      invitationStatus(
        { id: "1", email: "a@b", role: "owner", expires_at: "2026-08-01T00:00:00Z", accepted_at: null },
        now
      ),
      "expired"
    );
    assert.equal(
      invitationStatus(
        {
          id: "1",
          email: "a@b",
          role: "owner",
          expires_at: "2026-09-01T00:00:00Z",
          accepted_at: null,
          revoked_at: "2026-08-28T11:00:00Z",
        },
        now
      ),
      "revoked"
    );
  });
});
