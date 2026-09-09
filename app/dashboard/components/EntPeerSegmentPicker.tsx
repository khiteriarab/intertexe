"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PEER_MARKETS,
  PEER_SEGMENTS,
  peerMarketLabel,
  peerSegmentLabel,
  type PeerMarket,
  type PeerSegment,
} from "../../../lib/enterprise/benchmark-segments";

export function EntPeerSegmentPicker({
  market,
  peerSegment,
}: {
  market: PeerMarket;
  peerSegment: PeerSegment;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="ent-panel-nested px-5 py-4 mb-6 flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-8">
      <div>
        <p className="ent-section-eyebrow mb-2">Peer segment</p>
        <div className="flex flex-wrap gap-2">
          {PEER_SEGMENTS.map((segment) => (
            <button
              key={segment}
              type="button"
              onClick={() => setParam("segment", segment)}
              className={`ent-chip ${peerSegment === segment ? "ent-chip-active" : ""}`}
              aria-pressed={peerSegment === segment}
            >
              {peerSegmentLabel(segment)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="ent-section-eyebrow mb-2">Market</p>
        <div className="flex flex-wrap gap-2">
          {PEER_MARKETS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setParam("market", item)}
              className={`ent-chip ${market === item ? "ent-chip-active" : ""}`}
              aria-pressed={market === item}
            >
              {peerMarketLabel(item)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--ent-muted-light)] lg:ml-auto max-w-sm leading-relaxed">
        Conversion index and peer medians use governed aggregates for{" "}
        <span className="text-[var(--ent-ink-soft)]">{peerSegmentLabel(peerSegment)}</span> in{" "}
        <span className="text-[var(--ent-ink-soft)]">{peerMarketLabel(market)}</span>. Individual competitor catalogs
        are never exposed.
      </p>
    </div>
  );
}
