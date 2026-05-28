"use client";

import { useCallback, useEffect, useState } from "react";
import { HORIZONTAL_RAIL_INSET_CLASS, HORIZONTAL_RAIL_PRODUCT_CARD_CLASS } from "../../lib/horizontal-rail";

const TOKEN_KEY = "intertexe_auth_token";

export type ProductClickoutRow = {
  id: string;
  user_id: string;
  product_id: string | null;
  brand_name: string | null;
  product_name: string | null;
  product_url: string | null;
  image_url: string | null;
  price: number | string | null;
  currency: string | null;
  natural_fiber_percent: number | null;
  clicked_at: string | null;
};

export function RecentlyViewedRail() {
  const [clickouts, setClickouts] = useState<ProductClickoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClickouts = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setClickouts([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/account/product-clickout", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setClickouts([]);
        return;
      }
      const data = await res.json();
      setClickouts(data.clickouts ?? []);
    } catch {
      setClickouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClickouts();
  }, [loadClickouts]);

  return (
    <div className="flex flex-col gap-4 border-t border-border/30 pt-8" data-testid="section-recently-viewed">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Recently Viewed
      </h3>

      {loading ? (
        <div className={`${HORIZONTAL_RAIL_INSET_CLASS} min-h-[160px]`}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`${HORIZONTAL_RAIL_PRODUCT_CARD_CLASS} aspect-[3/4] bg-secondary animate-pulse`}
            />
          ))}
        </div>
      ) : clickouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Products you shop will appear here.
        </p>
      ) : (
        <div className={HORIZONTAL_RAIL_INSET_CLASS}>
          {clickouts.slice(0, 10).map((clickout) => {
            const shopUrl = clickout.product_url;
            const imageUrl = clickout.image_url;
            const card = (
              <>
                <div className="aspect-[3/4] bg-[#f5f4f2] relative overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={clickout.product_name ?? "Product"}
                      className="absolute inset-0 w-full h-full object-cover object-[center_28%]"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : null}
                </div>
                <p className="text-xs tracking-widest uppercase text-neutral-500 mt-2 truncate">
                  {clickout.brand_name ?? ""}
                </p>
                <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5">
                  {clickout.product_name ?? ""}
                </p>
              </>
            );

            if (!shopUrl) {
              return (
                <div
                  key={clickout.id}
                  className={`flex flex-col ${HORIZONTAL_RAIL_PRODUCT_CARD_CLASS}`}
                  data-rail-card
                >
                  {card}
                </div>
              );
            }

            return (
              <a
                key={clickout.id}
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-col ${HORIZONTAL_RAIL_PRODUCT_CARD_CLASS}`}
                data-rail-card
                data-testid={`link-recently-viewed-${clickout.product_id ?? clickout.id}`}
              >
                {card}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
