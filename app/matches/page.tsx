import Link from "next/link";

export const metadata = {
  title: "TX Match · Better-material matches",
  robots: { index: false, follow: false },
};

export default function MatchesIndexPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-20 md:px-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111]/45">TX Match</p>
      <h1 className="font-serif mt-4 text-3xl tracking-[-0.02em] text-[#111111]">
        Open a match set from the extension
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#111111]/60">
        Each piece has its own match link. Use INTERTEXE: Fabric Scanner on a product page, then
        open See better-material matches.
      </p>
      <p className="mt-6">
        <Link href="/" className="text-sm text-[#1D4734] underline-offset-4 hover:underline">
          Back to INTERTEXE
        </Link>
      </p>
    </main>
  );
}
