"use client";

import Link from "next/link";
import { SERIF } from "../../../app/platform/platform-ui";
import {
  LIFECYCLE_HEADER,
  LIFECYCLE_STAGES,
  type LifecycleStage,
  type LifecycleVisualType,
} from "./lifecycle-data";
import {
  CheckPrepareVisual,
  CleanConnectVisual,
  PassportPublishVisual,
  RepairRecirculateVisual,
  SourceMakeVisual,
  TraceProveVisual,
  UseLearnVisual,
} from "./LifecycleStageVisuals";
import styles from "./HomepageLifecycleSection.module.css";

function StageVisual({ type }: { type: LifecycleVisualType }) {
  switch (type) {
    case "source":
      return <SourceMakeVisual />;
    case "clean":
      return <CleanConnectVisual />;
    case "trace":
      return <TraceProveVisual />;
    case "prepare":
      return <CheckPrepareVisual />;
    case "publish":
      return <PassportPublishVisual />;
    case "learn":
      return <UseLearnVisual />;
    case "recirculate":
      return <RepairRecirculateVisual />;
  }
}

function LifecycleHeader() {
  const { eyebrow, headlineLines, body, primaryCta, secondaryCta, topRightCta } = LIFECYCLE_HEADER;

  return (
    <header className={styles.intro}>
      <div className={styles.introCopy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id="homepage-lifecycle-heading" className={styles.headline} style={SERIF}>
          {headlineLines[0]}
          <br />
          {headlineLines[1]}
        </h2>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          <Link href={primaryCta.href} className={styles.primaryCta}>
            {primaryCta.label}
            <span aria-hidden>→</span>
          </Link>
          <Link href={secondaryCta.href} className={styles.secondaryCta}>
            {secondaryCta.label}
          </Link>
        </div>
      </div>

      <div className={styles.introAside}>
        <Link href={topRightCta.href} className={styles.seeItLive}>
          {topRightCta.label}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </header>
  );
}

function LifecycleStageBlock({ stage, index }: { stage: LifecycleStage; index: number }) {
  const textFirst = stage.align === "left";
  const headingId = `lifecycle-stage-${stage.id}`;
  const copy = (
    <div className={styles.rowCopy}>
      <p className={styles.stageNumber}>{stage.number}</p>
      <h3 id={headingId} className={styles.rowTitle} style={SERIF}>
        {stage.title}
      </h3>
      <p className={styles.rowSubtitle}>{stage.subtitle}</p>
      <p className={styles.rowBody}>{stage.description}</p>
      <ul className={styles.tags}>
        {stage.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </div>
  );

  const diagram = (
    <div className={styles.rowDiagram}>
      <StageVisual type={stage.visualType} />
    </div>
  );

  return (
    <article className={styles.row} data-align={stage.align} aria-labelledby={headingId}>
      <div className={styles.rowSide}>{textFirst ? copy : diagram}</div>
      <div className={styles.spineSlot} aria-hidden>
        <span className={`${styles.spineNode} ${index % 2 === 1 ? styles.spineNodeAccent : ""}`} />
      </div>
      <div className={styles.rowSide}>{textFirst ? diagram : copy}</div>
    </article>
  );
}

/**
 * Homepage product-lifecycle explainer — Kessler visual rhythm,
 * exact seven INTERTEXE stages. Attio pin-scroll lives on /brands/demo only.
 */
export function HomepageLifecycleSection() {
  return (
    <section className={styles.section} id="product-lifecycle" aria-labelledby="homepage-lifecycle-heading">
      <div className={styles.shell}>
        <LifecycleHeader />

        <div className={styles.rows}>
          <div className={styles.spine} aria-hidden />
          {LIFECYCLE_STAGES.map((stage, index) => (
            <LifecycleStageBlock key={stage.id} stage={stage} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomepageLifecycleSection;
