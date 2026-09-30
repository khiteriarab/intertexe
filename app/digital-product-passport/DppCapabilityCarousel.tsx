"use client";

import { useEffect, useRef, useState } from "react";

export type DppCapability = {
  title: string;
  copy: string;
};

type Props = {
  items: readonly DppCapability[];
};

export function DppCapabilityCarousel({ items }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const sync = () => {
      const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-dpp-card]"));
      if (!cards.length) return;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      cards.forEach((card, i) => {
        const center = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActive(best);
    };

    // Start with the second card centered (Kezzler-style focus), when available.
    const startIndex = items.length > 2 ? 1 : 0;
    const startCard = track.querySelectorAll<HTMLElement>("[data-dpp-card]")[startIndex];
    if (startCard) {
      const left = startCard.offsetLeft - (track.clientWidth - startCard.offsetWidth) / 2;
      track.scrollLeft = Math.max(0, left);
    }

    sync();
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      track.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [items.length]);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelectorAll<HTMLElement>("[data-dpp-card]")[index];
    if (!card) return;
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    track.scrollTo({ left, behavior: "smooth" });
  };

  return (
    <div className="dpp-carousel">
      <div
        ref={trackRef}
        className="dpp-carousel-track"
        role="region"
        aria-roledescription="carousel"
        aria-label="What INTERTEXE does"
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - active);
          const state =
            distance === 0 ? "is-active" : distance === 1 ? "is-near" : "is-far";
          return (
            <article
              key={item.title}
              data-dpp-card
              className={`dpp-carousel-card ${state}`}
              aria-current={distance === 0 ? "true" : undefined}
            >
              <button
                type="button"
                className="dpp-carousel-card-hit"
                onClick={() => goTo(index)}
                aria-label={`Show ${item.title}`}
              >
                <span className="dpp-carousel-card-dot" aria-hidden="true" />
                <h3 className="dpp-carousel-card-title">{item.title}</h3>
                <p className="dpp-carousel-card-copy">{item.copy}</p>
              </button>
            </article>
          );
        })}
      </div>

      <div className="dpp-carousel-dots" role="tablist" aria-label="Capability slides">
        {items.map((item, index) => {
          const distance = Math.abs(index - active);
          const size =
            distance === 0 ? "is-active" : distance === 1 ? "is-near" : "is-far";
          return (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Go to ${item.title}`}
              className={`dpp-carousel-dot ${size}`}
              onClick={() => goTo(index)}
            />
          );
        })}
      </div>
    </div>
  );
}
