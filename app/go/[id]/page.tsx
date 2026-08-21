import type { Metadata } from "next";
import EmailProductOpenClient from "../../p/[id]/EmailProductOpenClient";

export const metadata: Metadata = {
  title: "Opening this piece in INTERTEXE",
  robots: { index: false, follow: false },
};

export default async function EmailProductGoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmailProductOpenClient productId={id} />;
}
