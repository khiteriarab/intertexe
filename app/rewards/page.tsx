import type { Metadata } from "next";
import Link from "next/link";
import { RewardsNewInGrid } from "./RewardsNewInGrid";
import { getCachedRewardsNewInProducts } from "../../lib/rewards";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Intertexe Rewards | Know More, Earn More",
  description:
    "The more you scan and shop, the more exclusive your access. Three tiers of natural fiber rewards.",
};

const FAQ = [
  {
    q: "How do I earn tier status?",
    a: "Your tier is determined by whichever is higher — your total scans or your annual spend through Intertexe. Both count equally toward your status.",
  },
  {
    q: "When does my tier reset?",
    a: "Tiers are evaluated annually. Your spend resets each year but your scan history is cumulative.",
  },
  {
    q: "What is a personal fiber stylist?",
    a: "Cashmere members receive access to an Intertexe stylist who helps you build and verify your natural fiber wardrobe. Available via chat and email.",
  },
  {
    q: "Does scanning count even if I do not buy?",
    a: "Yes. Every scan counts toward your tier status. Scanning is discovery — it is part of the Intertexe experience.",
  },
];

const FIBER_BENEFITS = [
  "Early access to new arrivals",
  "Unlimited scan history",
  "Weekly natural fiber edit",
  "Saved favorites",
];

const SILK_BENEFITS = [
  "Everything in Fiber",
  "Early sale access — 24 hours before public",
  "Priority customer support",
  "Exclusive brand edits curated for your fiber preferences",
  "Invitations to brand previews",
];

const CASHMERE_BENEFITS = [
  "Everything in Silk",
  "First access to limited drops and brand collaborations",
  "Personal fiber stylist",
  "Invitations to Intertexe events",
  "Annual natural fiber wardrobe consultation",
];

function BenefitList({
  benefits,
  light = false,
}: {
  benefits: string[];
  light?: boolean;
}) {
  return (
    <div className="space-y-4">
      {benefits.map((benefit) => (
        <div key={benefit} className="flex items-start gap-3">
          <div
            className={`w-px h-4 mt-0.5 flex-shrink-0 ${
              light ? "bg-white/40" : "bg-[#1C2B2A]"
            }`}
          />
          <p
            className={`text-[12px] font-light leading-snug ${
              light ? "text-white/80" : "text-[#1C2B2A]"
            }`}
          >
            {benefit}
          </p>
        </div>
      ))}
    </div>
  );
}

export default async function RewardsPage() {
  const newInProducts = await getCachedRewardsNewInProducts();

  return (
    <main className="min-h-screen bg-white">
      <section
        className="relative w-full overflow-hidden bg-[#1C2B2A]"
        style={{ minHeight: "60vh" }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(135deg, #1C2B2A 0%, #3D342E 50%, #5C4F45 100%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-24 min-h-[60vh]">
          <p className="text-[9px] tracking-[0.45em] uppercase text-white/60 mb-4">
            Intertexe
          </p>
          <h1 className="text-4xl md:text-6xl font-serif font-light text-white leading-tight mb-4">
            Rewards
          </h1>
          <p className="text-[13px] font-light text-white/70 max-w-md leading-relaxed">
            The more you scan and shop, the more exclusive your access. Natural
            fiber discovery, rewarded.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 md:px-16 max-w-3xl mx-auto text-center">
        <p className="text-[9px] tracking-[0.4em] uppercase text-[#AAAAAA] mb-4">
          Our Rewards Program
        </p>
        <p className="text-[15px] font-light text-[#1C2B2A] leading-relaxed">
          Intertexe Rewards offers exclusive benefits based on your scans and
          annual spend. The more you discover and shop natural fiber, the more
          exclusive your access — including early sale access, brand
          collaborations, and your own personal fiber stylist.
        </p>
      </section>

      <RewardsNewInGrid products={newInProducts} />

      <section className="pb-20 px-6 md:px-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-1">
          <div className="bg-[#F4F4ED] p-8 md:p-10">
            <div className="mb-8">
              <p className="text-[8px] tracking-[0.4em] uppercase text-[#AAAAAA] mb-3">
                Entry
              </p>
              <h2 className="text-3xl font-serif font-light text-[#1C2B2A] mb-2">
                Fiber
              </h2>
              <p className="text-[11px] font-light text-[#AAAAAA]">
                10+ scans or $500+ spend
              </p>
            </div>
            <BenefitList benefits={FIBER_BENEFITS} />
          </div>

          <div className="bg-[#1C2B2A] p-8 md:p-10">
            <div className="mb-8">
              <p className="text-[8px] tracking-[0.4em] uppercase text-white/50 mb-3">
                Mid
              </p>
              <h2 className="text-3xl font-serif font-light text-white mb-2">
                Silk
              </h2>
              <p className="text-[11px] font-light text-white/50">
                50+ scans or $2,000+ spend
              </p>
            </div>
            <BenefitList benefits={SILK_BENEFITS} light />
          </div>

          <div className="bg-[#420217] p-8 md:p-10">
            <div className="mb-8">
              <p className="text-[8px] tracking-[0.4em] uppercase text-white/50 mb-3">
                Top
              </p>
              <h2 className="text-3xl font-serif font-light text-white mb-2">
                Cashmere
              </h2>
              <p className="text-[11px] font-light text-white/50">
                200+ scans or $5,000+ spend
              </p>
            </div>
            <BenefitList benefits={CASHMERE_BENEFITS} light />
          </div>
        </div>
      </section>

      <section className="bg-[#F4F4ED] py-16 px-6 md:px-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[9px] tracking-[0.4em] uppercase text-[#AAAAAA] mb-4">
            Founding Members
          </p>
          <h2 className="text-3xl font-serif font-light text-[#1C2B2A] mb-4">
            Join before August 8
          </h2>
          <p className="text-[13px] font-light text-[#1C2B2A] leading-relaxed mb-8">
            Pre-register before our official launch and receive Fiber status
            automatically — no scans or spend required. Founding members keep
            their status forever.
          </p>
          <Link
            href="/signup"
            className="inline-block text-[9px] tracking-[0.35em] uppercase bg-[#1C2B2A] text-white px-10 py-4 hover:bg-[#2A3B3A] transition-colors"
          >
            Become a Founding Member
          </Link>
        </div>
      </section>

      <section className="py-16 px-6 md:px-16 max-w-2xl mx-auto">
        <h2 className="text-[10px] tracking-[0.45em] uppercase text-[#1C2B2A] mb-10 text-center">
          How It Works
        </h2>
        <div className="space-y-8">
          {FAQ.map((item) => (
            <div key={item.q} className="border-t border-[#E8E8E0] pt-8">
              <h3 className="text-[13px] font-light text-[#1C2B2A] mb-3">
                {item.q}
              </h3>
              <p className="text-[12px] font-light text-[#AAAAAA] leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
