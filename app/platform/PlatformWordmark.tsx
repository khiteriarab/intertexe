import Link from "next/link";
import { BrandWordmark } from "../components/BrandWordmark";
import { marketingPath } from "../../lib/enterprise-marketing/paths";

/** Canonical INTERTEXE lockup on enterprise marketing routes — INTER regular, TEXE bold. */
export function PlatformWordmark({
  className = "",
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Link href={marketingPath()} className="inline-flex shrink-0" aria-label="INTERTEXE for brands home">
      <BrandWordmark size={size} className={className} />
    </Link>
  );
}
