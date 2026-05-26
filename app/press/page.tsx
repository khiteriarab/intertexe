import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Press",
  description:
    "Press resources for INTERTEXE — the natural fiber fashion discovery platform and label scanner.",
  alternates: { canonical: "https://www.intertexe.com/press" },
};

export default function PressPage() {
  return (
    <div className="py-8 md:py-20 max-w-3xl mx-auto w-full px-4 md:px-6">
      <p
        className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-8"
        data-testid="text-press-eyebrow"
      >
        PRESS
      </p>

      <h1
        className="text-[32px] md:text-[40px] font-serif font-light leading-[1.2] text-foreground mb-6"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        data-testid="text-press-title"
      >
        The only fashion platform that verifies the fiber composition of every product it carries.
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed mb-16 max-w-2xl">
        Intertexe is a natural fiber fashion discovery platform and scanner. We verify that silk is silk,
        cashmere is cashmere, and linen is linen — before anything is listed on the platform.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16 border-t border-b border-border/30 py-12">
        <div>
          <p className="text-3xl font-light font-serif text-foreground">33,430+</p>
          <p className="text-[10px] text-muted-foreground tracking-widest mt-1 uppercase">Verified pieces</p>
        </div>
        <div>
          <p className="text-3xl font-light font-serif text-foreground">253+</p>
          <p className="text-[10px] text-muted-foreground tracking-widest mt-1 uppercase">Brands vetted</p>
        </div>
        <div>
          <p className="text-3xl font-light font-serif text-foreground">100%</p>
          <p className="text-[10px] text-muted-foreground tracking-widest mt-1 uppercase">Composition verified</p>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-6">THE STORY</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Most fashion platforms show you what brands want you to see. Intertexe shows you what the label
          actually says.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          The platform verifies the fiber composition of every product before it is listed. The iOS app
          includes a scanner that reads any clothing label in real time — pointing your camera at a care
          label or price tag returns the exact fiber breakdown, a natural fiber percentage score, and curated
          alternatives at a similar price if the piece is mostly synthetic.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Every scan teaches the platform something. Every barcode linked to a composition makes the next
          scan faster. Intertexe is building the most comprehensive fashion fiber composition database in the
          world — one that does not exist anywhere else.
        </p>
      </div>

      <div className="mb-16">
        <h2 className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-6">THE SCANNER</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Available on iOS. Point your camera at any care label or price tag. Intertexe reads the fiber
          composition instantly, tells you what percentage is natural, and shows you better natural fiber
          alternatives at a similar price if needed. The scanner works in any store, on any brand, on any
          garment in the world.
        </p>
      </div>

      <div className="border-t border-border/30 pt-12">
        <h2 className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-6">PRESS CONTACT</h2>
        <p className="text-sm text-foreground/80 mb-2">For press inquiries, interviews, and media assets:</p>
        <a
          href="mailto:press@intertexe.com"
          className="text-sm text-foreground underline underline-offset-4"
          data-testid="link-press-email"
        >
          press@intertexe.com
        </a>

        <div className="mt-8">
          <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mb-4">DOWNLOAD</p>
          <Link
            href="/intertexe-press-kit.pdf"
            className="inline-block text-[10px] tracking-[0.15em] uppercase border border-foreground px-6 py-3 text-foreground hover:bg-foreground hover:text-background transition-colors"
            data-testid="link-press-kit"
          >
            Press Kit
          </Link>
        </div>
      </div>
    </div>
  );
}
