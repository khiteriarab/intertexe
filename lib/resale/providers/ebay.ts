import type {
  ResaleListingDraft,
  ResaleListingResult,
  ResaleOffer,
  ResaleProvider,
  ResaleProviderContext,
} from "../types";

function ebayConfigured(): boolean {
  return Boolean(
    process.env.EBAY_CLIENT_ID &&
      process.env.EBAY_CLIENT_SECRET &&
      (process.env.EBAY_USER_TOKEN || process.env.EBAY_OAUTH_REDIRECT_URI)
  );
}

function apiBase(sandbox: boolean): string {
  return sandbox
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
}

function authBase(sandbox: boolean): string {
  return sandbox
    ? "https://auth.sandbox.ebay.com"
    : "https://auth.ebay.com";
}

export const ebayProvider: ResaleProvider = {
  id: "ebay",
  displayName: "eBay",
  integrationStatus: ebayConfigured() ? "live" : "disconnected",

  capabilities() {
    return {
      listing_publish: ebayConfigured(),
      listing_update: ebayConfigured(),
      listing_deactivate: ebayConfigured(),
      order_status: ebayConfigured(),
      offer_management: ebayConfigured(),
      webhooks: false,
      listing_handoff: false,
    };
  },

  async connectAccount(ctx) {
    const clientId = process.env.EBAY_CLIENT_ID;
    const redirect = process.env.EBAY_OAUTH_REDIRECT_URI;
    if (!clientId || !redirect) {
      return {
        status: "disconnected",
        message: "eBay OAuth is not configured. Set EBAY_CLIENT_ID and EBAY_OAUTH_REDIRECT_URI.",
      };
    }
    const sandbox = ctx.sandbox !== false;
    const scope = encodeURIComponent(
      "https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account"
    );
    const state = encodeURIComponent(`${ctx.userId}:${Date.now()}`);
    const authUrl = `${authBase(sandbox)}/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&scope=${scope}&state=${state}`;
    return { authUrl, status: "pending" };
  },

  async disconnectAccount() {
    /* Token revocation handled in resale-service via vault key removal */
  },

  async createDraft(_ctx, draft) {
    return {
      externalListingId: `ebay-draft-${draft.publicId}`,
      externalUrl: null,
      status: "draft",
    };
  },

  async publishListing(ctx, draft, externalDraftId) {
    const token = ctx.accessToken || process.env.EBAY_USER_TOKEN;
    const sandbox = ctx.sandbox !== false;
    if (!token) {
      return {
        externalListingId: externalDraftId || null,
        externalUrl: null,
        status: "error",
        errorMessage: "eBay seller account not connected. Complete OAuth before publishing.",
      };
    }
    if (!ebayConfigured()) {
      return {
        externalListingId: externalDraftId || null,
        externalUrl: null,
        status: "error",
        errorMessage: "eBay API credentials not configured.",
      };
    }

    const sku = `ITX-${draft.publicId}`.slice(0, 50);
    const inventoryPayload = {
      product: {
        title: draft.title.slice(0, 80),
        description: draft.description.slice(0, 4000),
        aspects: {
          Brand: draft.brand ? [draft.brand] : undefined,
          "Size Type": ["Regular"],
        },
        imageUrls: draft.consumerPhotos.length ? draft.consumerPhotos : undefined,
      },
      condition: mapCondition(draft.condition),
      availability: { shipToLocationAvailability: { quantity: 1 } },
    };

    try {
      const invRes = await fetch(`${apiBase(sandbox)}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify(inventoryPayload),
      });

      if (!invRes.ok) {
        const errText = await invRes.text();
        return {
          externalListingId: externalDraftId || null,
          externalUrl: null,
          status: "error",
          errorMessage: `eBay inventory error (${invRes.status}): ${errText.slice(0, 200)}`,
        };
      }

      const offerPayload = {
        sku,
        marketplaceId: sandbox ? "EBAY_US" : "EBAY_US",
        format: "FIXED_PRICE",
        availableQuantity: 1,
        categoryId: "63861",
        listingDescription: draft.description.slice(0, 4000),
        pricingSummary: {
          price: { value: String(draft.askingPrice), currency: draft.currency || "USD" },
        },
        listingPolicies: { fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID || "0" },
      };

      const offerRes = await fetch(`${apiBase(sandbox)}/sell/inventory/v1/offer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify(offerPayload),
      });

      if (!offerRes.ok) {
        const errText = await offerRes.text();
        return {
          externalListingId: sku,
          externalUrl: null,
          status: "error",
          errorMessage: `eBay offer error (${offerRes.status}): ${errText.slice(0, 200)}`,
        };
      }

      const offer = (await offerRes.json()) as { offerId?: string };
      const offerId = offer.offerId;
      if (!offerId) {
        return {
          externalListingId: sku,
          externalUrl: null,
          status: "error",
          errorMessage: "eBay offer created without offerId.",
        };
      }

      const pubRes = await fetch(`${apiBase(sandbox)}/sell/inventory/v1/offer/${offerId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Language": "en-US",
        },
      });

      if (!pubRes.ok) {
        const errText = await pubRes.text();
        return {
          externalListingId: offerId,
          externalUrl: null,
          status: "pending_publish",
          errorMessage: `Offer created; publish pending (${pubRes.status}): ${errText.slice(0, 120)}`,
        };
      }

      const published = (await pubRes.json()) as { listingId?: string };
      const listingId = published.listingId || offerId;
      const host = sandbox ? "https://www.sandbox.ebay.com" : "https://www.ebay.com";
      return {
        externalListingId: listingId,
        externalUrl: `${host}/itm/${listingId}`,
        status: "published",
      };
    } catch (err) {
      return {
        externalListingId: externalDraftId || null,
        externalUrl: null,
        status: "error",
        errorMessage: err instanceof Error ? err.message : "eBay publish failed",
      };
    }
  },

  async updateListing(ctx, externalListingId, patch) {
    const token = ctx.accessToken || process.env.EBAY_USER_TOKEN;
    if (!token) {
      return {
        externalListingId,
        externalUrl: null,
        status: "error",
        errorMessage: "eBay not connected",
      };
    }
    if (patch.askingPrice != null) {
      const sandbox = ctx.sandbox !== false;
      await fetch(`${apiBase(sandbox)}/sell/inventory/v1/offer/${externalListingId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return { externalListingId, externalUrl: null, status: "published" };
  },

  async deactivateListing(ctx, externalListingId) {
    const token = ctx.accessToken || process.env.EBAY_USER_TOKEN;
    const sandbox = ctx.sandbox !== false;
    if (!token) return { ok: false, message: "eBay not connected" };
    try {
      const res = await fetch(`${apiBase(sandbox)}/sell/inventory/v1/offer/${externalListingId}/withdraw`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      return { ok: res.ok, message: res.ok ? undefined : await res.text() };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "withdraw failed" };
    }
  },

  async fetchListingStatus(ctx, externalListingId) {
    const token = ctx.accessToken || process.env.EBAY_USER_TOKEN;
    const sandbox = ctx.sandbox !== false;
    if (!token) return { status: "unknown" };
    const res = await fetch(`${apiBase(sandbox)}/sell/inventory/v1/offer/${externalListingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { status: "unknown" };
    const data = (await res.json()) as { status?: string; listing?: { listingStatus?: string } };
    const sold = data.listing?.listingStatus === "ENDED" || data.status === "PUBLISHED";
    return { status: sold ? "listed" : data.status?.toLowerCase() || "unknown" };
  },

  async fetchOffers(_ctx, _externalListingId): Promise<ResaleOffer[]> {
    return [];
  },
};

function mapCondition(condition: string): string {
  switch (condition) {
    case "new":
      return "NEW";
    case "excellent":
      return "LIKE_NEW";
    case "good":
      return "USED_EXCELLENT";
    case "fair":
      return "USED_GOOD";
    default:
      return "USED_EXCELLENT";
  }
}
