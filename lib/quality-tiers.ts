export type QualityTier = 'exceptional' | 'excellent' | 'good' | 'caution' | 'under-review';

export interface TierInfo {
  tier: QualityTier;
  label: string;
  shortLabel: string;
  verdict: string;
  description: string;
  buyingAdvice: string;
}

export function getQualityTier(naturalFiberPercent: number | null | undefined): TierInfo {
  if (naturalFiberPercent == null) {
    return {
      tier: 'under-review',
      label: 'Under Review',
      shortLabel: 'Review',
      verdict: 'Pending Assessment',
      description: 'Our editorial team is currently evaluating this brand\'s material composition.',
      buyingAdvice: 'Check the fabric label before purchasing. We\'ll have a full assessment soon.',
    };
  }
  if (naturalFiberPercent >= 90) {
    return {
      tier: 'exceptional',
      label: 'Exceptional',
      shortLabel: 'Exceptional',
      verdict: 'INTERTEXE Approved',
      description: 'Outstanding commitment to natural materials. This brand represents the highest standard of material integrity.',
      buyingAdvice: 'Buy with confidence. This brand consistently delivers exceptional material quality.',
    };
  }
  if (naturalFiberPercent >= 70) {
    return {
      tier: 'excellent',
      label: 'Excellent',
      shortLabel: 'Excellent',
      verdict: 'Recommended',
      description: 'Strong emphasis on natural fibers with minimal synthetic content. A reliable choice for quality-conscious buyers.',
      buyingAdvice: 'A strong choice. Check individual garment labels for specific fiber content.',
    };
  }
  if (naturalFiberPercent >= 50) {
    return {
      tier: 'good',
      label: 'Good',
      shortLabel: 'Good',
      verdict: 'Selective Buy',
      description: 'A balanced approach to materials. Some pieces will meet our standards, others may not.',
      buyingAdvice: 'Be selective. Stick to their natural fiber pieces and always read the label.',
    };
  }
  return {
    tier: 'caution',
    label: 'Caution',
    shortLabel: 'Caution',
    verdict: 'Proceed with Caution',
    description: 'Higher proportion of synthetic materials. Individual pieces may still offer quality, but the overall approach leans synthetic.',
    buyingAdvice: 'Read every label carefully. Look for their natural fiber offerings specifically.',
  };
}

export function getTierColor(tier: QualityTier): string {
  switch (tier) {
    case 'exceptional': return 'bg-foreground text-background';
    case 'excellent': return 'bg-foreground/80 text-background';
    case 'good': return 'border border-foreground/40 text-foreground';
    case 'caution': return 'border border-orange-400/60 text-orange-700';
    case 'under-review': return 'border border-border/60 text-muted-foreground';
  }
}

export function getTierAccent(tier: QualityTier): string {
  switch (tier) {
    case 'exceptional': return 'border-foreground';
    case 'excellent': return 'border-foreground/60';
    case 'good': return 'border-foreground/30';
    case 'caution': return 'border-orange-400/40';
    case 'under-review': return 'border-border/40';
  }
}
