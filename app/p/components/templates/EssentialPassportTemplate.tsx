import type { TemplateProps } from "./shared";
import {
  CareBlock,
  MaterialsBlock,
  NextLifeBlock,
  PassportShell,
  ProductHero,
  ProductTitleBlock,
} from "./shared";

/** Essential — clean product facts first. */
export function EssentialPassportTemplate(props: TemplateProps) {
  const { content } = props;
  return (
    <PassportShell {...props}>
      <ProductTitleBlock content={content} />
      <MaterialsBlock content={content} />
      {content.manufacturingCountry ? (
        <section className="itx-passport-section">
          <h2 className="itx-passport-section-title">Origin</h2>
          <p className="text-sm">{content.manufacturingCountry}</p>
        </section>
      ) : null}
      <ProductHero content={content} large={false} />
      <CareBlock content={content} />
      <NextLifeBlock content={content} />
    </PassportShell>
  );
}
