import { Suspense } from "react";
import MatchesClient from "./MatchesClient";

export const metadata = {
  title: "TX Match · Better-material matches",
  robots: { index: false, follow: false },
};

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Suspense
        fallback={
          <main className="mx-auto max-w-[1280px] px-4 py-14 md:px-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111]/45">TX Match</p>
            <h1 className="font-serif mt-4 text-3xl tracking-[-0.02em] text-[#111111]">Finding matches…</h1>
            <p className="mt-3 text-sm text-[#111111]/55">Keeping the original piece in context.</p>
          </main>
        }
      >
        <MatchesClient captureId={id} />
      </Suspense>
    </div>
  );
}
