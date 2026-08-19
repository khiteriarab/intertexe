import { redirect } from "next/navigation";
import { accountRedirectFromSearch } from "../../lib/auth-return-path";

export const metadata = {
  title: "Sign in | INTERTEXE",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(accountRedirectFromSearch(await searchParams, "login"));
}
