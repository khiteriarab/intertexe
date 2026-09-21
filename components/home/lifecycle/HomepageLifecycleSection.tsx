"use client";

import Link from "next/link";
import { SERIF } from "../../../app/platform/platform-ui";
import { LIFECYCLE_ROWS, type LifecycleDiagramType, type LifecycleRow } from "./lifecycle-data";
import {
  ConnectedProductDiagram,
  ProductIntelligenceDiagram,
  TraceabilityComplianceDiagram,
} from "./LifecycleDiagrams";
import styles from "./HomepageLifecycleSection.module.css";

function Diagram({ type }: { type: LifecycleDiagramType }) {
  switch (type) {
    case "intelligence":
      return <ProductIntelligenceDiagram />;
    case "traceability":
      return <TraceabilityComplianceDiagram />;
    case "connected":
      return <ConnectedProductDiagram />;
  }
}

function LifecycleRowBlock({ row, index }: { row: LifecycleRow; index: number }) {
  const textFirst = row.align === "left";
  const text = (
    <div className={styles.rowCopy}>
      <h3 className={styles.rowTitle}>{row.title}</h3>
      <p className={styles.rowSubtitle}>{row.subtitle}</p>
      <p className={styles.rowBody}>{row.description}</p>
      <ul className={styles.tags}>
        {row.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <Link href={row.href} className={styles.rowCta}>
        {row.cta}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );

  const diagram = (
    <div className={styles.rowDiagram}>
      <Diagram type={row.diagramType} />
    </div>
  );

  return (
    <div className={styles.row} data-align={row.align}>
      <div className={styles.rowSide}>{textFirst ? text : diagram}</div>
      <div className={styles.spineSlot} aria-hidden>
        <span className={`${styles.spineNode} ${index === 1 ? styles.spineNodeAccent : ""}`} />
      </div>
      <div className={styles.rowSide}>{textFirst ? diagram : text}</div>
    </div>
  );
}

/**
 * Homepage product-lifecycle explainer — Kessler rhythm:
 * white editorial intro + three alternating solution rows on a quiet vertical spine.
 */
export function HomepageLifecycleSection() {
  return (
    <section className={styles.section} id="product-lifecycle" aria-labelledby="homepage-lifecycle-heading">
      <div className={styles.shell}>
        <header className={styles.intro}>
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>Product lifecycle</p>
            <h2 id="homepage-lifecycle-heading" className={styles.headline} style={SERIF}>
              From material
              <br />
              to next life.
            </h2>
            <p className={styles.body}>
              INTERTEXE connects fragmented product information from sourcing and manufacturing through product data,
              traceability, compliance, and Digital Product Passports — then keeps that governed record useful through
              use, repair, resale, and end-of-life.
            </p>
            <div className={styles.actions}>
              <Link href="/brands/demo" className={styles.primaryCta}>
                See a live product
                <span aria-hidden>→</span>
              </Link>
              <Link href="/brands/solutions" className={styles.secondaryCta}>
                Explore how teams use it
              </Link>
            </div>
          </div>

          <div className={styles.introAside}>
            <Link href="/brands/demo" className={styles.seeItLive}>
              See it live
              <span aria-hidden>→</span>
            </Link>
          </div>
        </header>

        <div className={styles.rows}>
          <div className={styles.spine} aria-hidden />
          {LIFECYCLE_ROWS.map((row, index) => (
            <LifecycleRowBlock key={row.id} row={row} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomepageLifecycleSection;
