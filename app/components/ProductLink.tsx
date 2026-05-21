"use client";

import Link from "next/link";
import type { ComponentProps, PointerEvent } from "react";

type ProductLinkProps = ComponentProps<typeof Link>;

/**
 * Product navigation link that works inside horizontal scroll rails.
 * Stops the scroll container from capturing the first tap as a pan gesture.
 */
export function ProductLink({ onPointerDown, ...props }: ProductLinkProps) {
  const handlePointerDown = (e: PointerEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    onPointerDown?.(e);
  };

  return <Link {...props} onPointerDown={handlePointerDown} draggable={false} />;
}
