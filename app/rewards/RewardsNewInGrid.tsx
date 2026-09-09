import Link from "next/link";
import Image from "next/image";
import { REWARDS_EDITORIAL_TILES } from "../../lib/rewards";

export function RewardsNewInGrid() {
  return (
    <section className="py-12 px-6 md:px-16 bg-white">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-serif font-light text-[#1C2B2A] mb-3">
          Discover natural fiber
        </h2>
        <p className="text-[13px] font-light text-[#AAAAAA]">
          Curated edits across silk, linen, cashmere, and more — every composition verified.
        </p>
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-1.5 md:gap-2">
        {REWARDS_EDITORIAL_TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="aspect-[3/4] bg-[#F4F4ED] overflow-hidden relative block group"
          >
            <Image
              src={tile.src}
              alt={tile.alt}
              fill
              className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
              sizes="(min-width: 768px) 320px, 33vw"
            />
          </Link>
        ))}
      </div>

      <div className="max-w-3xl mx-auto mt-8">
        <Link
          href="/shop?sort=new"
          className="block w-full text-center text-[11px] tracking-[0.35em] uppercase bg-[#1C2B2A] text-white py-4 hover:bg-[#2A3B3A] transition-colors"
        >
          Shop New In
        </Link>
      </div>
    </section>
  );
}
