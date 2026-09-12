export type MarketplaceProvider = "ebay" | "vinted" | "poshmark";

export type ProviderIntegrationStatus =
  | "live"
  | "requires_partner_access"
  | "handoff"
  | "disconnected";

export type ProviderCapabilities = {
  listing_publish: boolean;
  listing_update: boolean;
  listing_deactivate: boolean;
  order_status: boolean;
  offer_management: boolean;
  webhooks: boolean;
  listing_handoff: boolean;
};

export type ResaleListingDraft = {
  title: string;
  description: string;
  brand: string | null;
  category: string | null;
  composition: string | null;
  condition: string;
  conditionNotes?: string | null;
  flaws?: string | null;
  color?: string | null;
  size?: string | null;
  askingPrice: number;
  currency: string;
  consumerPhotos: string[];
  productIdentity: string;
  publicId: string;
};

export type ResaleListingResult = {
  externalListingId: string | null;
  externalUrl: string | null;
  status: "draft" | "pending_publish" | "published" | "handoff" | "error";
  handoffPackage?: {
    title: string;
    description: string;
    suggestedCategory: string | null;
    continueUrl: string;
  };
  errorMessage?: string;
};

export type ResaleOffer = {
  externalOfferId: string;
  amount: number;
  currency: string;
  status: string;
  receivedAt: string;
};

export type ResaleProviderContext = {
  userId: string;
  accessToken?: string | null;
  sandbox?: boolean;
};

export interface ResaleProvider {
  id: MarketplaceProvider;
  displayName: string;
  integrationStatus: ProviderIntegrationStatus;
  capabilities(): ProviderCapabilities;
  connectAccount(ctx: ResaleProviderContext): Promise<{ authUrl?: string; status: string; message?: string }>;
  disconnectAccount(ctx: ResaleProviderContext): Promise<void>;
  createDraft(ctx: ResaleProviderContext, draft: ResaleListingDraft): Promise<ResaleListingResult>;
  publishListing(
    ctx: ResaleProviderContext,
    draft: ResaleListingDraft,
    externalDraftId?: string | null
  ): Promise<ResaleListingResult>;
  updateListing?(
    ctx: ResaleProviderContext,
    externalListingId: string,
    patch: { askingPrice?: number; status?: string }
  ): Promise<ResaleListingResult>;
  deactivateListing(ctx: ResaleProviderContext, externalListingId: string): Promise<{ ok: boolean; message?: string }>;
  fetchListingStatus?(
    ctx: ResaleProviderContext,
    externalListingId: string
  ): Promise<{ status: string; soldAt?: string | null }>;
  fetchOffers?(ctx: ResaleProviderContext, externalListingId: string): Promise<ResaleOffer[]>;
}
