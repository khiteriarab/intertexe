import type { Metadata } from "next";
import { PlatformChrome } from "../../PlatformChrome";
import { ProductLifecycleMap } from "../_lifecycle-v2/ProductLifecycleMap";

export const metadata: Metadata = {
  title: "Lifecycle map prototype (internal)",
  robots: { index: false, follow: false },
};

/** Isolated prototype — compare without replacing live See it live. */
export default function LifecycleWireframePage() {
  return (
    <PlatformChrome active="demo">
      <p
        style={{
          margin: 0,
          padding: "0.55rem 1rem",
          background: "#101312",
          color: "#f5f3ef",
          fontFamily: "var(--itx-sans, sans-serif)",
          fontSize: "0.625rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Prototype · map + record + micro-visuals + Follow the Record · walkthrough animation deferred · live page
        unchanged · also /platform/demo?map=v2
      </p>
      <ProductLifecycleMap />
    </PlatformChrome>
  );
}
