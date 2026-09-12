import type { ResaleProvider, ResaleProviderContext, ResaleListingDraft, ResaleListingResult } from "../types";

function vintedProConfigured(): boolean {
  return Boolean(process.env.VINTED_PRO_API_KEY && process.env.VINTED_PRO_API_BASE);
}

export const vintedProvider: ResaleProvider = {
  id: "vinted",
  displayName: "Vinted",
  integrationStatus: vintedProConfigured() ? "live" : "requires_partner_access",

  capabilities() {
    const live = vintedProConfigured();
    return {
      listing_publish: live,
      listing_update: live,
      listing_deactivate: live,
      order_status: live,
      offer_management: false,
      webhooks: live,
      listing_handoff: false,
    };
  },

  async connectAccount(_ctx) {
    if (!vintedProConfigured()) {
      return {
        status: "requires_partner_access",
        message: "Integration access required — Vinted Pro Integrations API allowlist.",
      };
    }
    return { status: "pending", message: "Vinted Pro OAuth flow pending partner credentials." };
  },

  async disconnectAccount() {},

  async createDraft(_ctx, draft) {
    return {
      externalListingId: `vinted-draft-${draft.publicId}`,
      externalUrl: null,
      status: "draft",
    };
  },

  async publishListing(ctx, draft): Promise<ResaleListingResult> {
    if (!vintedProConfigured()) {
      return {
        externalListingId: null,
        externalUrl: null,
        status: "error",
        errorMessage: "Vinted Pro integration access required.",
      };
    }
    const base = process.env.VINTED_PRO_API_BASE!;
    const res = await fetch(`${base}/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINTED_PRO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        price: draft.askingPrice,
        currency: draft.currency,
        photos: draft.consumerPhotos,
        brand: draft.brand,
        intertexe_identity: draft.publicId,
      }),
    });
    if (!res.ok) {
      return {
        externalListingId: null,
        externalUrl: null,
        status: "error",
        errorMessage: `Vinted API error (${res.status})`,
      };
    }
    const data = (await res.json()) as { id?: string; url?: string };
    return {
      externalListingId: data.id || null,
      externalUrl: data.url || null,
      status: "published",
    };
  },

  async deactivateListing(_ctx, externalListingId) {
    if (!vintedProConfigured()) return { ok: false, message: "Vinted Pro access required" };
    const base = process.env.VINTED_PRO_API_BASE!;
    const res = await fetch(`${base}/items/${externalListingId}/deactivate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VINTED_PRO_API_KEY}` },
    });
    return { ok: res.ok };
  },
};
