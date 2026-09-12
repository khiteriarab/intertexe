import type { TemplateProps } from "./shared";
import {
  CareBlock,
  MaterialsBlock,
  NextLifeBlock,
  PassportShell,
  ProductHero,
  ProductTitleBlock,
} from "./shared";

/** Circular — care, repair, resale, end-of-life emphasized. */
export function CircularPassportTemplate(props: TemplateProps) {
  const { content } = props;
  return (
    <PassportShell {...props}>
      <ProductHero content={content} large={false} />
      <ProductTitleBlock content={content} />
      <CareBlock content={content} />
      <NextLifeBlock content={content} />
      <MaterialsBlock content={content} />
    </PassportShell>
  );
}
