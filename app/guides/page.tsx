import type { Metadata } from "next";
import Link from "next/link";
import { GUIDE_PAGES, indexableGuides } from "../../lib/seo-guides";

export const metadata: Metadata = {
  title: "Material Guides",
  description:
    "INTERTEXE editorial guides to fabric composition, seasonal dressing, and how to compare price with material quality.",
  alternates: { canonical: "https://www.intertexe.com/guides" },
};

export default function GuidesHubPage() {
  const live = indexableGuides();
  const upcoming = GUIDE_PAGES.filter((g) => !live.some((l) => l.slug === g.slug));

  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 px-4">
      <header className="flex flex-col gap-4">
        <nav className="text-xs text-muted-foreground flex gap-2">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground">Guides</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-serif">Material guides</h1>
        <p className="text-base text-foreground/75 leading-relaxed">
          Editorially approved pages only. INTERTEXE does not publish every filter combination in the catalog.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        {live.map((guide) => (
          <Link key={guide.slug} href={`/guides/${guide.slug}`} className="border-b border-border/40 pb-6 hover:text-muted-foreground">
            <h2 className="text-xl font-serif text-foreground">{guide.h1}</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{guide.description}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">
              Reviewed {guide.lastReviewed}
            </p>
          </Link>
        ))}
      </section>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Coming next</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {upcoming.map((guide) => (
              <li key={guide.slug}>
                {guide.title} · from {guide.publishAfter}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
