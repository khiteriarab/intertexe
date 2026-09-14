import type { TemplateProps } from "./shared";
import { PassportShell } from "./shared";
import {
  EditorialJourneyTimeline,
  EditorialMaterialsCard,
  EditorialMissionStrip,
  EditorialNextLifeCards,
  EditorialPassportFooter,
  EditorialPassportHeader,
  EditorialProductHero,
  EditorialProductIntro,
  EditorialScoresSection,
  EditorialVerificationBadges,
} from "./editorial-blocks";

/** Editorial — mobile-first DPP layout: hero, verification, materials, journey, next life. */
export function EditorialPassportTemplate(props: TemplateProps) {
  const { content, experience, publicId } = props;

  return (
    <PassportShell {...props} hideDefaultHeader>
      <EditorialPassportHeader />
      <EditorialProductHero content={content} experience={experience} />
      <EditorialProductIntro content={content} experience={experience} publicId={publicId} />
      <EditorialVerificationBadges content={content} />
      <EditorialMissionStrip />
      <EditorialMaterialsCard content={content} />
      <EditorialJourneyTimeline content={content} />
      <EditorialScoresSection content={content} />
      <EditorialNextLifeCards content={content} />
      <EditorialPassportFooter />
    </PassportShell>
  );
}
