import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Partner with INTERTEXE — featured placement, composition data API, and retail partnerships for material transparency in fashion.",
  alternates: { canonical: "https://www.intertexe.com/partners" },
};

export default function PartnersPage() {
  return (
    <div className="py-8 md:py-20 max-w-3xl mx-auto w-full px-4 md:px-6">
      <p
        className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-8"
        data-testid="text-partners-eyebrow"
      >
        PARTNERS
      </p>

      <h1
        className="text-[32px] md:text-[40px] font-serif font-light leading-[1.2] text-foreground mb-6"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        data-testid="text-partners-title"
      >
        The material transparency layer for fashion.
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed mb-16">
        Intertexe is building the infrastructure for fiber composition verification in fashion. We work with
        brands, retailers, and platforms who want to lead on material transparency.
      </p>

      <div className="space-y-12 mb-16">
        <div className="border-t border-border/30 pt-8">
          <h2 className="text-[10px] tracking-[0.2em] uppercase mb-4">FEATURED PLACEMENT</h2>
          <p className="text-sm text-foreground/80 leading-relaxed mb-2">
            Appear in the Intertexe edit. Featured placement puts your brand in front of a curated audience
            actively looking for natural fiber fashion. Your products appear in relevant collection pages,
            scanner alternatives, and the Brands We Love section.
          </p>
          <p className="text-xs text-muted-foreground mt-4">From $500 per month</p>
        </div>

        <div className="border-t border-border/30 pt-8">
          <h2 className="text-[10px] tracking-[0.2em] uppercase mb-4">COMPOSITION DATA API</h2>
          <p className="text-sm text-foreground/80 leading-relaxed mb-2">
            Access our verified fiber composition database via API. Enrich your product catalog with verified
            composition data. Essential for EU Digital Product Passport compliance coming in 2026.
          </p>
          <p className="text-xs text-muted-foreground mt-4">Custom pricing based on volume</p>
        </div>

        <div className="border-t border-border/30 pt-8">
          <h2 className="text-[10px] tracking-[0.2em] uppercase mb-4">RETAIL PARTNERSHIP</h2>
          <p className="text-sm text-foreground/80 leading-relaxed mb-2">
            Power your own fiber transparency features with Intertexe data and scanner technology. White-label
            integration available for retailers and multi-brand platforms.
          </p>
          <p className="text-xs text-muted-foreground mt-4">Contact us for enterprise pricing</p>
        </div>
      </div>

      <div className="border-t border-border/30 pt-12">
        <h2 className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-6">GET IN TOUCH</h2>
        <p className="text-sm text-foreground/80 mb-6">
          We work with a small number of partners who share our commitment to material quality and
          transparency. If that is you we would like to hear from you.
        </p>
        <a
          href="mailto:partners@intertexe.com"
          className="inline-block text-[10px] tracking-[0.2em] uppercase border border-foreground px-8 py-4 text-foreground hover:bg-foreground hover:text-background transition-colors"
          data-testid="link-partners-email"
        >
          Contact Partners Team
        </a>
      </div>
    </div>
  );
}
