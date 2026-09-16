import { redirect } from "next/navigation";

export default async function RegulationsRedirectPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  redirect(`/dashboard/${organization}/impact`);
}
