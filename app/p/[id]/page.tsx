import type { Metadata } from "next";
import Link from "next/link";
import { resolvePublicPassport } from "../../../lib/enterprise/public-resolver";
import EmailProductOpenClient from "./EmailProductOpenClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const view = await resolvePublicPassport(id);
  if (view.found || id.startsWith("itx_")) {
    return {
      title: view.found ? "Product passport" : "Passport not available",
      robots: { index: false, follow: false },
      description: `INTERTEXE Digital Product Passport ${id}`,
    };
  }
  return {
    title: "Opening this piece in INTERTEXE",
    robots: { index: false, follow: false },
  };
}

export default async function PublicIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = await resolvePublicPassport(id, { recordScan: true });

  if (view.found) {
    return (
      <main className="min-h-screen bg-[#f6f5f3] px-4 py-10">
        <div className="max-w-lg mx-auto bg-white border border-black/10 rounded-2xl p-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-black/45">Digital Product Passport</p>
          <h1 className="text-2xl font-medium mt-2">{view.productName || "Product"}</h1>
          <p className="text-xs font-mono text-black/45 mt-2 break-all">{view.publicId}</p>
          {view.versionNumber ? (
            <p className="text-sm text-black/55 mt-4">Published version {view.versionNumber}</p>
          ) : null}
          {Array.isArray(view.snapshot?.fields) && view.snapshot.fields.length > 0 ? (
            <dl className="mt-6 space-y-3 text-sm">
              {(view.snapshot.fields as Array<{ key?: string; value?: string }>).map((field, index) => (
                <div key={`${field.key || "field"}-${index}`}>
                  <dt className="text-[10px] tracking-[0.14em] uppercase text-black/45">{field.key}</dt>
                  <dd className="mt-1">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <Link
            href={`/p/${view.publicId}/json`}
            className="inline-block mt-6 text-xs tracking-widest uppercase underline"
          >
            Machine-readable record
          </Link>
        </div>
      </main>
    );
  }

  if (id.startsWith("itx_")) {
    return (
      <main className="min-h-screen bg-[#f6f5f3] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-[10px] tracking-[0.22em] uppercase text-black/45">INTERTEXE</p>
          <h1 className="text-2xl font-medium mt-3">Passport not available</h1>
          <p className="text-sm text-black/55 mt-3">
            This identifier does not resolve to a published Digital Product Passport.
          </p>
          <Link href="/" className="inline-block mt-6 text-xs tracking-widest uppercase underline">
            Return home
          </Link>
        </div>
      </main>
    );
  }

  return <EmailProductOpenClient productId={id} />;
}
