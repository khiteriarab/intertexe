"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type ProductLinkProps = ComponentProps<typeof Link>;

/**
 * Product link inside horizontal rails — does not block touch scrolling.
 * (Avoid stopPropagation on touch/pointer; CSS touch-action: pan-x on rail cards handles swipe vs tap.)
 */
export function ProductLink({ ...props }: ProductLinkProps) {
  return <Link {...props} draggable={false} data-rail-card />;
}
