"use client";

import Link from "next/link";
import { useState } from "react";
import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { SERIF } from "../platform-ui";

const SAMPLE_PASSPORTS = [
  {
    id: "cotton-poplin-shirt",
    name: "Cotton Poplin Shirt",
    sku: "SAMPLE-REPORTED",
    copy: "See how a single product record unlocks composition data, origin, impact insights, and next-life options — all in one place.",
    image: "/khiteri/ganni-poplin-shirt.jpg",
    pageImage: "/platform/demo/workspace-cotton-poplin-shirt.png",
    href: "/platform/api?gtin=0200000000011",
  },
  {
    id: "silk-midi-skirt",
    name: "Silk Midi Skirt",
    sku: "ITX-4102",
    copy: "See how a single product record unlocks composition data, origin, impact insights, and next-life options — all in one place.",
    image: "/platform/hero-silk-dress.png",
    pageImage: "/platform/demo/workspace-silk-midi-skirt.jpg",
    href: `/platform/api?gtin=${DEMO_FEATURED.gtin}`,
  },
  {
    id: "linen-wrap-top",
    name: "Linen Wrap Top",
    sku: "ITX-1180",
    copy: "See how a single product record unlocks composition data, origin, impact insights, and next-life options — all in one place.",
    image: "/editorial-linen.png",
    pageImage: "/platform/demo/workspace-linen-wrap-top.jpg",
    href: "/platform/api",
  },
  {
    id: "wool-trouser",
    name: "Wool Tailored Trouser",
    sku: "ITX-3308",
    copy: "See how a single product record unlocks composition data, origin, impact insights, and next-life options — all in one place.",
    image: "/editorial-tailoring.png",
    pageImage: "/platform/demo/workspace-wool-trouser.jpg",
    href: "/platform/api",
  },
  {
    id: "cashmere-crew",
    name: "Cashmere Crew",
    sku: "ITX-2204",
    copy: "See how a single product record unlocks composition data, origin, impact insights, and next-life options — all in one place.",
    image: "/editorial-cashmere.jpg",
    pageImage: "/platform/demo/workspace-cashmere-crew.jpg",
    href: "/platform/api",
  },
] as const;

export function DemoFeaturedExample() {
  const [selectedId, setSelectedId] = useState<(typeof SAMPLE_PASSPORTS)[number]["id"]>("cotton-poplin-shirt");
  const selected = SAMPLE_PASSPORTS.find((product) => product.id === selectedId) ?? SAMPLE_PASSPORTS[0];

  return (
    <section id="passport" className="demo-editorial-passport scroll-mt-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        <div className="demo-editorial-passport-grid">
          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-4">
              Explore a real example
            </p>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-light leading-[1.08] mb-4" style={SERIF}>
              {selected.name}
            </h2>
            <p className="text-[15px] sm:text-[16px] font-light leading-relaxed text-[var(--platform-muted)] mb-8 max-w-md">
              {selected.copy}
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-8">
              <Link href={selected.href} className="demo-editorial-btn-primary">
                View full passport →
              </Link>
              <Link href="/platform/api" className="demo-editorial-btn-outline">
                Try another product
              </Link>
            </div>
            <div className="demo-editorial-passport-thumb" role="list" aria-label="Sample products">
              {SAMPLE_PASSPORTS.map((product) => {
                const active = product.id === selected.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    role="listitem"
                    onClick={() => setSelectedId(product.id)}
                    aria-pressed={active}
                    aria-label={product.name}
                    className="demo-editorial-passport-thumb-btn"
                  >
                    <img
                      src={product.image}
                      alt=""
                      width={88}
                      height={110}
                      className={`demo-editorial-passport-thumb-image ${active ? "demo-editorial-passport-thumb-image--active" : ""}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <figure className="demo-editorial-passport-lifestyle m-0">
            <img
              src={selected.image}
              alt={selected.name}
              width={640}
              height={800}
              className="demo-editorial-passport-lifestyle-image"
            />
          </figure>

          <figure className="demo-editorial-passport-page m-0">
            <img
              src={selected.pageImage}
              alt={`${selected.name} workspace preview`}
              width={1448}
              height={1006}
              className="demo-editorial-passport-page-image"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
