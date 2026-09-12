import type { ResaleListingDraft, ResaleListingResult, ResaleProvider } from "../types";

const POSHMARK_CONTINUE_URL = "https://poshmark.com/sell";

export const poshmarkProvider: ResaleProvider = {
  id: "poshmark",
  displayName: "Poshmark",
  integrationStatus: "handoff",

  capabilities() {
    return {
      listing_publish: false,
      listing_update: false,
      listing_deactivate: false,
      order_status: false,
      offer_management: false,
      webhooks: false,
      listing_handoff: true,
    };
  },

  async connectAccount() {
    return {
      status: "handoff",
      message: "Poshmark has no approved API publishing in this environment. Use listing package handoff.",
    };
  },

  async disconnectAccount() {},

  async createDraft(_ctx, draft) {
    return buildHandoff(draft);
  },

  async publishListing(_ctx, draft) {
    return buildHandoff(draft);
  },

  async deactivateListing() {
    return { ok: false, message: "Poshmark handoff listings require manual seller action on Poshmark." };
  },
};

function buildHandoff(draft: ResaleListingDraft): ResaleListingResult {
  const description = [
    draft.description,
    draft.composition ? `Composition: ${draft.composition}` : null,
    draft.flaws ? `Notes: ${draft.flaws}` : null,
    `INTERTEXE product identity: ${draft.productIdentity}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    externalListingId: `poshmark-handoff-${draft.publicId}`,
    externalUrl: POSHMARK_CONTINUE_URL,
    status: "handoff",
    handoffPackage: {
      title: draft.title,
      description,
      suggestedCategory: draft.category,
      continueUrl: POSHMARK_CONTINUE_URL,
    },
  };
}
