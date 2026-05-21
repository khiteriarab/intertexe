"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent, PointerEvent, TouchEvent } from "react";

type ProductLinkProps = ComponentProps<typeof Link>;

function stopBubble<T extends { stopPropagation: () => void }>(e: T, handler?: (e: T) => void) {
  e.stopPropagation();
  handler?.(e);
}

/**
 * Product navigation link that works inside horizontal scroll rails.
 * Stops the scroll container from capturing taps as pan gestures.
 */
export function ProductLink({ onPointerDown, onClick, onTouchStart, ...props }: ProductLinkProps) {
  return (
    <Link
      {...props}
      draggable={false}
      onPointerDown={(e) => stopBubble(e, onPointerDown)}
      onTouchStart={(e) => stopBubble(e, onTouchStart)}
      onClick={(e) => stopBubble(e, onClick)}
    />
  );
}
