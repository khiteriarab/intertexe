import { getAppStoreOpenUrl, getAppStoreUrl } from "./app-store";
import { LIFECYCLE_BRANCHES, type LifecycleBranch } from "./email-constants";

export type LifecycleCopy = {
  branch: LifecycleBranch;
  subject: string;
  preview: string;
  hook: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  closing?: string;
};

const SITE = "https://www.intertexe.com";

function reviewUrl(): string {
  return `${getAppStoreUrl()}?action=write-review`;
}

/** One message + one CTA per behavior branch. */
export function copyForLifecycleBranch(
  branch: LifecycleBranch,
  firstName?: string | null
): LifecycleCopy {
  const name = (firstName || "").trim();
  const hi = name ? `Hi ${name},` : "Hi,";

  switch (branch) {
    case LIFECYCLE_BRANCHES.DAY4_NO_SCAN:
      return {
        branch,
        subject: "Try the part that changes how you shop",
        preview: "Scan a clothing label. See what it’s made of.",
        hook: `${hi}\n\nYou downloaded INTERTEXE. Now try the part that changes how you shop.`,
        body: "Shopping in person? Point your camera at a clothing label. INTERTEXE shows what it’s actually made of — and better-fabric alternatives in your budget.",
        ctaLabel: "Scan something",
        ctaUrl: `${SITE}/scanner`,
      };
    case LIFECYCLE_BRANCHES.DAY4_HAS_SCAN:
      return {
        branch,
        subject: "You’ve seen the label. Find the better version",
        preview: "Compare fabric, style, and price.",
        hook: `${hi}\n\nYou’ve seen the label. Here’s how to find the better version.`,
        body: "After a scan, INTERTEXE surfaces similar pieces based on fabric, style, color, silhouette, and price — so you can choose with material intelligence, not guesswork.",
        ctaLabel: "Find alternatives",
        ctaUrl: `${SITE}/scanner`,
      };
    case LIFECYCLE_BRANCHES.DAY10_FAVORITES:
      return {
        branch,
        subject: "Don’t stop at the label",
        preview: "Your saved pieces are waiting.",
        hook: `${hi}\n\nFound something you love? Don’t stop at the label.`,
        body: "Your saved pieces are in INTERTEXE. Come back to compare fabric quality, watch prices, and keep shopping with materials in mind.",
        ctaLabel: "View saved pieces",
        ctaUrl: `${SITE}/account`,
      };
    case LIFECYCLE_BRANCHES.DAY10_TX_MATCH:
      return {
        branch,
        subject: "Go deeper with matching",
        preview: "You found a match. Here’s what’s next.",
        hook: `${hi}\n\nYou found a match. Here’s how to go deeper.`,
        body: "TX Match is only the start. Open your matches, compare composition and price, and save the pieces worth wearing.",
        ctaLabel: "Open your matches",
        ctaUrl: `${SITE}/account`,
      };
    case LIFECYCLE_BRANCHES.DAY10_INACTIVE:
      return {
        branch,
        subject: "The easiest way to use INTERTEXE",
        preview: "One action. Start with a scan.",
        hook: `${hi}\n\nHere’s the easiest way to use INTERTEXE.`,
        body: "Open the app, scan one clothing label, and see what it’s made of. That’s the whole idea — materials first, then better alternatives.",
        ctaLabel: "Scan something",
        ctaUrl: `${SITE}/scanner`,
      };
    case LIFECYCLE_BRANCHES.DAY25_ACTIVE_REVIEW:
      return {
        branch,
        subject: "You’ve put INTERTEXE to work 🤍",
        preview: "If it’s helping you shop differently, a quick review means a lot.",
        hook: `${hi}\n\nYou’ve officially put INTERTEXE to work 🤍`,
        body: "If it’s helping you shop differently, a quick App Store review would mean a lot. It helps other people who care about what their clothes are made of find us.",
        ctaLabel: "Leave a review",
        ctaUrl: reviewUrl(),
        closing: "Thank you — Khiteri",
      };
    case LIFECYCLE_BRANCHES.DAY25_INACTIVE_WINBACK:
      return {
        branch,
        subject: "What got in the way?",
        preview: "No pressure — just a reason to come back.",
        hook: `${hi}\n\nWhat got in the way?`,
        body: "If INTERTEXE didn’t click yet, that’s useful to know. The simplest next step is one scan — or reply to this email and tell me what would make it useful.",
        ctaLabel: "Open INTERTEXE",
        ctaUrl: getAppStoreOpenUrl("/scanner"),
        closing: "I read the replies. — Khiteri",
      };
    case LIFECYCLE_BRANCHES.DAY25_FEEDBACK:
      return {
        branch,
        subject: "We want scanning to work better for you",
        preview: "Reply anytime — I read every response.",
        hook: `${hi}\n\nIt looks like a scan didn’t go as expected.`,
        body: "I’d genuinely like to know what happened. Just reply to this email with a photo or a short note — I read the responses and use them to improve INTERTEXE.",
        ctaLabel: "Reply to Khiteri",
        ctaUrl: "mailto:info@intertexe.com?subject=Scan%20feedback",
        closing: "Thank you — Khiteri, Founder",
      };
    default: {
      const _exhaustive: never = branch;
      throw new Error(`Unknown lifecycle branch: ${_exhaustive}`);
    }
  }
}
