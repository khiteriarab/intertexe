import { redirect } from "next/navigation";

export const metadata = {
  title: "Inspiration · INTERTEXE",
  robots: { index: false, follow: false },
};

export default async function InspirationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/matches/${encodeURIComponent(id)}`);
}
