import Link from "next/link";
import { BrandWordmark } from "../components/BrandWordmark";

/** Canonical INTERTEXE lockup on platform routes — INTER regular, TEXE bold. */
export function PlatformWordmark({
  className = "",
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Link href="/platform" className="inline-flex shrink-0" aria-label="INTERTEXE platform home">
      <BrandWordmark size={size} className={className} />
    </Link>
  );
}
