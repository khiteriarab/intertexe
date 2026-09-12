import type { Metadata } from "next";
import Link from "next/link";
import { resolvePublicPassport } from "../../../lib/enterprise/public-resolver";
import EmailProductOpenClient from "./EmailProductOpenClient";
import { PassportExperienceRenderer } from "../components/PassportExperienceRenderer";
import { DEFAULT_EXPERIENCE } from "../../../lib/enterprise/passport-experience";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c: carrierId } = await searchParams;
  const view = await resolvePublicPassport(id, { recordScan: true, carrierId: carrierId || undefined });

  if (view.found && view.consumer) {
    const experience = view.experience || {
      id: "",
      organizationId: "",
      productId: "",
      ...DEFAULT_EXPERIENCE,
    };
    return (
      <PassportExperienceRenderer
        content={view.consumer}
        experience={experience}
        publicId={view.publicId}
        versionNumber={view.versionNumber}
      />
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
