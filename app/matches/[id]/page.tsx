import { Suspense } from "react";
import MatchesClient from "./MatchesClient";

export const metadata = {
  title: "Better-material matches",
  robots: { index: false, follow: false },
};

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      <Suspense
        fallback={
          <main className="mx-auto max-w-6xl px-4 py-12">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#191816]">INTERTEXE</p>
            <h1 className="mt-6 font-serif text-3xl text-[#191816]">Loading matches…</h1>
            <p className="mt-2 text-sm text-[#746F68]">Finding better-material alternatives.</p>
          </main>
        }
      >
        <MatchesClient captureId={id} />
      </Suspense>
    </div>
  );
}
