import { redirect } from "next/navigation";
import { marketingPath } from "../../../../lib/enterprise-marketing/paths";

type PageProps = { params: Promise<{ slug: string }> };

/** Placeholder story URLs redirect until real case studies publish Fall 2026. */
export default async function SuccessStoryDetailPage({ params }: PageProps) {
  await params;
  redirect(marketingPath("success-stories"));
}
