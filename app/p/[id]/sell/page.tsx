import { resolvePublicPassport } from "../../../../lib/enterprise/public-resolver";
import { providerSummaries } from "../../../../lib/resale/providers";
import ResaleSellClient from "./ResaleSellClient";

export const dynamic = "force-dynamic";

export default async function ResaleSellPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await resolvePublicPassport(id);
  if (!view.found || !view.consumer) {
    return (
      <main className="min-h-screen bg-[#f6f5f3] flex items-center justify-center px-6">
        <p className="text-sm text-black/55">Passport not found.</p>
      </main>
    );
  }

  return (
    <ResaleSellClient
      publicId={id}
      content={view.consumer}
      providers={providerSummaries()}
    />
  );
}
