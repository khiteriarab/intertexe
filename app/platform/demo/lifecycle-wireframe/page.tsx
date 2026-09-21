import type { Metadata } from "next";
import { PlatformChrome } from "../../PlatformChrome";
import { LifecycleComposeWireframe } from "../_lifecycle-v2/LifecycleComposeWireframe";

export const metadata: Metadata = {
  title: "Lifecycle compose wireframe (internal)",
  robots: { index: false, follow: false },
};

/** Isolated review surface — not linked from production See it live. */
export default function LifecycleWireframePage() {
  return (
    <PlatformChrome active="demo">
      <LifecycleComposeWireframe />
    </PlatformChrome>
  );
}
