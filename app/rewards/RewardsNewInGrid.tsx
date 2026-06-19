import Link from "next/link";
import Image from "next/image";
import type { RewardsGridProduct } from "../../lib/rewards";

export function RewardsNewInGrid({ products }: { products: RewardsGridProduct[] }) {
  return (
    <section className="py-12 px-6 md:px-16 bg-white">
      <div className="max-w-lg mx-auto text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-serif font-light text-[#1C2B2A] mb-3">
          Can we tempt you?
        </h2>
        <p className="text-[13px] font-light text-[#AAAAAA]">
          Explore our curated selection of new items
        </p>
      </div>

      <div className="max-w-lg mx-auto grid grid-cols-3 gap-1">
        {products.length === 0
          ? Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-[#F4F4ED]"
              />
            ))
          : products.map((product) => {
              const href = product.id ? `/product/${product.id}` : "/shop?sort=new";
              const image = product.imageUrl || "";
              return (
                <Link
                  key={product.id}
                  href={href}
                  className="aspect-[3/4] bg-[#F4F4ED] overflow-hidden relative block group"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt={product.name || "New arrival"}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E8E8E0]" />
                  )}
                </Link>
              );
            })}
      </div>

      <div className="max-w-lg mx-auto mt-8">
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
