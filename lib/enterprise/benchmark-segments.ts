export const PEER_MARKETS = ["eu_fashion", "us_fashion", "uk_fashion"] as const;
export type PeerMarket = (typeof PEER_MARKETS)[number];

export const PEER_SEGMENTS = ["luxury", "contemporary", "mass"] as const;
export type PeerSegment = (typeof PEER_SEGMENTS)[number];

export const DEFAULT_PEER_MARKET: PeerMarket = "eu_fashion";
export const DEFAULT_PEER_SEGMENT: PeerSegment = "contemporary";

const MARKET_LABELS: Record<PeerMarket, string> = {
  eu_fashion: "EU fashion",
  us_fashion: "US fashion",
  uk_fashion: "UK fashion",
};

const SEGMENT_LABELS: Record<PeerSegment, string> = {
  luxury: "Luxury",
  contemporary: "Contemporary",
  mass: "Mass market",
};

/** Maps benchmark market keys to consumer_intelligence geography codes. */
const MARKET_TO_GEOGRAPHY: Record<PeerMarket, string> = {
  eu_fashion: "eu",
  us_fashion: "us",
  uk_fashion: "uk",
};

export function peerMarketLabel(market: PeerMarket): string {
  return MARKET_LABELS[market];
}

export function peerSegmentLabel(segment: PeerSegment): string {
  return SEGMENT_LABELS[segment];
}

export function geographyForMarket(market: PeerMarket): string {
  return MARKET_TO_GEOGRAPHY[market];
}

export function parsePeerMarket(value: string | null | undefined): PeerMarket {
  if (value && PEER_MARKETS.includes(value as PeerMarket)) return value as PeerMarket;
  return DEFAULT_PEER_MARKET;
}

export function parsePeerSegment(value: string | null | undefined): PeerSegment {
  if (value && PEER_SEGMENTS.includes(value as PeerSegment)) return value as PeerSegment;
  return DEFAULT_PEER_SEGMENT;
}

export type BenchmarkSegmentSelection = {
  market: PeerMarket;
  peerSegment: PeerSegment;
  marketLabel: string;
  segmentLabel: string;
  geography: string;
};

export function resolveBenchmarkSegmentSelection(input: {
  market?: string | null;
  segment?: string | null;
}): BenchmarkSegmentSelection {
  const market = parsePeerMarket(input.market);
  const peerSegment = parsePeerSegment(input.segment);
  return {
    market,
    peerSegment,
    marketLabel: peerMarketLabel(market),
    segmentLabel: peerSegmentLabel(peerSegment),
    geography: geographyForMarket(market),
  };
}
