import Image from "next/image";
import styles from "./HomepageHeroLifecycleBridge.module.css";

/**
 * Cinematic bridge between the dark platform hero and the light
 * PRODUCT LIFECYCLE section — physical product → governed workspace.
 */
export function HomepageHeroLifecycleBridge() {
  return (
    <section className={styles.section} aria-label="From garment to governed product record">
      <div className={styles.shell}>
        <p className={styles.eyebrow}>Product intelligence</p>
        <p className={styles.line}>
          The physical product becomes a living record — source, compliance, passport, and next life in one place.
        </p>
        <figure className={styles.figure}>
          <Image
            src="/platform/hero-lifecycle-bridge.png"
            alt="INTERTEXE workspace and product lifecycle map connected to a garment — from physical product to governed digital record."
            width={1672}
            height={941}
            className={styles.image}
            sizes="(max-width: 899px) 100vw, min(1320px, 92vw)"
            priority={false}
          />
        </figure>
      </div>
      <div className={styles.fade} aria-hidden />
    </section>
  );
}

export default HomepageHeroLifecycleBridge;
