import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "INTERTEXE does not process orders. Returns, exchanges, shipping, and refunds are handled by the retailer you purchase from.",
  alternates: { canonical: "https://www.intertexe.com/returns" },
};

export default function ReturnsPage() {
  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-4 md:gap-6">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Legal</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-returns-title">
          Returns &amp; Refunds
        </h1>
        <p className="text-sm text-muted-foreground">Last updated: August 2026</p>
      </header>

      <div className="flex flex-col gap-8 md:gap-10 text-sm md:text-base text-foreground/80 leading-relaxed">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">1. INTERTEXE does not sell the products</h2>
          <p>
            INTERTEXE is a fashion discovery platform operated by Stellar Communications LLC. We help you
            identify materials and find pieces at partner retailers. We do not take payment, hold inventory,
            ship garments, or act as the seller of record.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">2. Who handles returns</h2>
          <p>
            When you click through to buy, your contract is with that retailer (for example Net-a-Porter,
            Mytheresa, or another listed store). <strong className="text-foreground">Orders, shipping,
            exchanges, refunds, and customer service are handled only by that retailer</strong>, under their
            return policy.
          </p>
          <p>
            Before you purchase, open the retailer&apos;s checkout or help pages and read their return window,
            condition requirements, and any restocking or return-shipping fees for your country.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">3. How to start a return</h2>
          <ol className="flex flex-col gap-2 pl-6 list-decimal marker:text-muted-foreground">
            <li>Find the order confirmation email or account page from the retailer you paid.</li>
            <li>Follow that retailer&apos;s return or exchange instructions.</li>
            <li>Ship the item according to their packaging and deadline rules.</li>
          </ol>
          <p>
            INTERTEXE cannot approve a return, issue a refund, or print a retailer return label. We also
            cannot change a retailer&apos;s window once the order is placed.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">4. Refunds and fees</h2>
          <p>
            Refund timing, original-payment method, return postage, and restocking fees are set by the
            retailer. Affiliate commission INTERTEXE may earn does not change your rights with that seller.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">5. Country-specific consumer rights</h2>
          <p>
            If you buy as a consumer in the UK, EU, or another jurisdiction with statutory cooling-off or
            faulty-goods rights, those rights are against the retailer that sold you the item, not against
            INTERTEXE. Use the retailer&apos;s process first.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">6. INTERTEXE account, app, and links</h2>
          <p>
            For problems with the INTERTEXE website, iOS app, Chrome extension, or a broken product link —
            not a garment you already purchased — email{" "}
            <a
              href="mailto:info@intertexe.com"
              className="border-b border-foreground hover:text-muted-foreground transition-colors"
            >
              info@intertexe.com
            </a>
            . We typically respond within 24–48 hours. See also our{" "}
            <Link href="/contact" className="border-b border-foreground hover:text-muted-foreground transition-colors">
              contact
            </Link>
            ,{" "}
            <Link href="/terms" className="border-b border-foreground hover:text-muted-foreground transition-colors">
              terms
            </Link>
            , and{" "}
            <Link href="/privacy" className="border-b border-foreground hover:text-muted-foreground transition-colors">
              privacy
            </Link>{" "}
            pages.
          </p>
        </section>
      </div>
    </div>
  );
}
