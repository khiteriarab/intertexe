import { redirect } from "next/navigation";

export const metadata = {
  title: "TX Matches",
  robots: { index: false, follow: false },
};

export default async function CaptureOpenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/matches/${encodeURIComponent(id)}`);
}
