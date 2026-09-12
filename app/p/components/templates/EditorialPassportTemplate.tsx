import type { TemplateProps } from "./shared";
import {
  CareBlock,
  JourneyBlock,
  MaterialsBlock,
  NextLifeBlock,
  PassportShell,
  ProductHero,
  ProductTitleBlock,
} from "./shared";

/** Editorial — large imagery, storytelling, origin journey. Luxury/fashion. */
export function EditorialPassportTemplate(props: TemplateProps) {
  const { content, experience } = props;
  return (
    <PassportShell {...props}>
      <ProductHero content={content} large />
      <ProductTitleBlock content={content} />
      {experience.branding.editorialCopy ? (
        <p className="mt-4 text-sm leading-relaxed text-[var(--pp-muted,#6b6560)] italic">
          {experience.branding.editorialCopy}
        </p>
      ) : null}
      <MaterialsBlock content={content} />
      <JourneyBlock content={content} />
      <CareBlock content={content} />
      <NextLifeBlock content={content} />
    </PassportShell>
  );
}
