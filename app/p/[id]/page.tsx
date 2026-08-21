import type { Metadata } from "next";
import EmailProductOpenClient from "./EmailProductOpenClient";

export const metadata: Metadata = {
  title: "Opening the piece",
  robots: { index: false, follow: false },
};

export default async function EmailProductOpenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmailProductOpenClient productId={id} />;
}
