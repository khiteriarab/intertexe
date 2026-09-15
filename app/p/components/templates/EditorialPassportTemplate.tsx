import type { TemplateProps } from "./shared";
import { PassportShell } from "./shared";
import {
  EditorialCareSection,
  EditorialDonateSection,
  EditorialJourneyTimeline,
  EditorialMaterialsCard,
  EditorialMissionStrip,
  EditorialNextLifeCards,
  EditorialPassportFooter,
  EditorialPassportHeader,
  EditorialProductHero,
  EditorialProductIntro,
  EditorialRecycleSection,
  EditorialScoresSection,
  EditorialVerificationBadges,
} from "./editorial-blocks";

/** Editorial — mobile-first DPP layout: hero, verification, materials, journey, next life. */
export function EditorialPassportTemplate(props: TemplateProps) {
  const { content, experience, publicId, versionNumber } = props;

  return (
    <PassportShell {...props} hideDefaultHeader>
      <EditorialPassportHeader />
      <EditorialProductHero content={content} experience={experience} />
      <EditorialProductIntro content={content} experience={experience} publicId={publicId} />
      <EditorialVerificationBadges content={content} />
      <EditorialMissionStrip content={content} />
      <EditorialMaterialsCard content={content} />
      <EditorialJourneyTimeline content={content} />
      <EditorialScoresSection content={content} />
      <EditorialNextLifeCards content={content} />
      <EditorialCareSection content={content} />
      <EditorialDonateSection content={content} />
      <EditorialRecycleSection content={content} />
      <EditorialPassportFooter content={content} publicId={publicId} versionNumber={versionNumber} />
    </PassportShell>
  );
}
