/**
 * Pilot motherboard: brand email and /platform requests open $5K opportunities
 * without auto-closing revenue.
 * Run: node --import tsx --test scripts/pilot-motherboard.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  PILOT_AMOUNT_USD,
  canSystemAdvance,
  isB2bPilotBuyer,
  stageForPlatformIntent,
  stageFromGmailEvent,
} from "../lib/dashboard/pilot-motherboard.ts";

describe("B2B buyer types", () => {
  it("treats brand, business and organization as pilot buyers", () => {
    assert.equal(isB2bPilotBuyer("brand"), true);
    assert.equal(isB2bPilotBuyer("business"), true);
    assert.equal(isB2bPilotBuyer("organization"), true);
    assert.equal(isB2bPilotBuyer("influencer"), false);
    assert.equal(isB2bPilotBuyer("customer"), false);
  });
});

describe("Platform intents", () => {
  it("opens a $5,000 proposal from a founding-pilot request", () => {
    const plan = stageForPlatformIntent("founding_pilot");
    assert.ok(plan);
    assert.equal(plan?.amount, PILOT_AMOUNT_USD);
    assert.equal(plan?.stage, "proposal");
    assert.match(plan?.opportunity || "", /Founding Material Data Pilot/);
  });

  it("opens a $5,000 snapshot-stage opportunity from a free snapshot request", () => {
    const plan = stageForPlatformIntent("snapshot");
    assert.equal(plan?.amount, 5000);
    assert.equal(plan?.stage, "snapshot_sent");
  });

  it("does not invent a pilot from API-access intent", () => {
    assert.equal(stageForPlatformIntent("api_access"), null);
  });
});

describe("Gmail stage moves", () => {
  it("opens a qualified pilot when a brand is emailed", () => {
    const move = stageFromGmailEvent("email_sent", null);
    assert.equal(move?.stage, "qualified");
    assert.equal(move?.activityType, "personalized_outreach");
  });

  it("advances a reply to meeting, never to won", () => {
    const move = stageFromGmailEvent("email_reply_received", "qualified");
    assert.equal(move?.stage, "meeting");
    assert.equal(canSystemAdvance("meeting", "won"), false);
    assert.equal(canSystemAdvance("proposal", "won"), false);
    assert.equal(canSystemAdvance("qualified", "lost"), false);
  });

  it("does not regress a snapshot or proposal when another email is sent", () => {
    assert.equal(stageFromGmailEvent("email_sent", "snapshot_sent"), null);
    assert.equal(stageFromGmailEvent("email_sent", "proposal"), null);
    assert.equal(canSystemAdvance("snapshot_sent", "proposal"), true);
  });
});

describe("Wiring stays off the public platform surface", () => {
  it("lets the public lead route call the motherboard without naming deal tables", () => {
    const leads = fs.readFileSync(path.join(process.cwd(), "app/api/v1/leads/route.ts"), "utf8");
    assert.match(leads, /syncPlatformLeadToPilotPipeline/);
    assert.doesNotMatch(leads, /hq_deals/);
    assert.doesNotMatch(leads, /revenue-plan/);
  });

  it("hooks Gmail send and reply into the motherboard", () => {
    const gmail = fs.readFileSync(path.join(process.cwd(), "lib/dashboard/gmail-outreach.ts"), "utf8");
    assert.match(gmail, /syncGmailEventToPilotPipeline/);
    assert.match(gmail, /email_sent/);
    assert.match(gmail, /email_reply_received/);
  });

  it("never writes won from the motherboard module", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib/dashboard/pilot-motherboard.ts"), "utf8");
    assert.doesNotMatch(source, /stage:\s*"won"/);
    assert.match(source, /entry_mode: "system"/);
  });
});
