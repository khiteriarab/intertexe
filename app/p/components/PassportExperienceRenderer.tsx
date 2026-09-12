import type { ConsumerPassportContent } from "../../../lib/enterprise/public-passport-content";
import type { PassportExperienceConfig } from "../../../lib/enterprise/passport-experience";
import { CircularPassportTemplate } from "./templates/CircularPassportTemplate";
import { EditorialPassportTemplate } from "./templates/EditorialPassportTemplate";
import { EssentialPassportTemplate } from "./templates/EssentialPassportTemplate";
import { TracePassportTemplate } from "./templates/TracePassportTemplate";

export function PassportExperienceRenderer({
  content,
  experience,
  publicId,
  versionNumber,
  preview = false,
  compact = false,
}: {
  content: ConsumerPassportContent;
  experience: PassportExperienceConfig;
  publicId: string;
  versionNumber?: number;
  preview?: boolean;
  compact?: boolean;
}) {
  const heroImage = experience.branding.heroImageUrl || content.imageUrl;
  const enriched = { ...content, imageUrl: heroImage };

  const props = {
    content: enriched,
    experience,
    publicId,
    versionNumber,
    preview,
    compact,
  };

  switch (experience.template) {
    case "essential":
      return <EssentialPassportTemplate {...props} />;
    case "trace":
      return <TracePassportTemplate {...props} />;
    case "circular":
      return <CircularPassportTemplate {...props} />;
    case "editorial":
    default:
      return <EditorialPassportTemplate {...props} />;
  }
}
