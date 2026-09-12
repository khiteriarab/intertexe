import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MEMBER_USER_EMAIL_TYPES } from "./member-users.ts";
import { EMAIL_TYPES } from "../email-constants.ts";

describe("member-users", () => {
  it("includes Founder Welcome and lifecycle programs in user count", () => {
    assert.ok(MEMBER_USER_EMAIL_TYPES.includes(EMAIL_TYPES.FOUNDER_WELCOME));
    assert.ok(MEMBER_USER_EMAIL_TYPES.includes(EMAIL_TYPES.LIFECYCLE_DAY4));
    assert.ok(MEMBER_USER_EMAIL_TYPES.includes(EMAIL_TYPES.WEEKLY_EDIT));
  });
});
