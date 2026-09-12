import type { TemplateProps } from "./shared";
import {
  CareBlock,
  JourneyBlock,
  MaterialsBlock,
  PassportShell,
  ProductHero,
  ProductTitleBlock,
} from "./shared";

/** Trace — lifecycle and provenance first. */
export function TracePassportTemplate(props: TemplateProps) {
  const { content } = props;
  return (
    <PassportShell {...props}>
      <ProductTitleBlock content={content} />
      <JourneyBlock content={content} />
      <MaterialsBlock content={content} />
      {content.manufacturingCountry || content.manufacturer ? (
        <section className="itx-passport-section">
          <h2 className="itx-passport-section-title">Made</h2>
          <dl className="text-sm space-y-2">
            {content.manufacturer ? (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--pp-muted-light,#9a948c)]">Manufacturer</dt>
                <dd>{content.manufacturer}</dd>
              </div>
            ) : null}
            {content.manufacturingCountry ? (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--pp-muted-light,#9a948c)]">Country</dt>
                <dd>{content.manufacturingCountry}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
      <ProductHero content={content} large={false} />
      <CareBlock content={content} />
    </PassportShell>
  );
}
