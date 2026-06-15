export const LINING_INDICATORS = [
  'lining', 'liner',
  'doublure', 'doublage',
  'forro', 'forra',
  'fodera',
  'futter', 'futterstoff',
  'voering',
  'podloga', 'podszewka',
  'fodring', 'vuori',
  '里料', '裏地', '内里', '안감',
  'eptoincrustaciones',
  'incrustation', 'incrustations',
  'exclusif', 'ausgenommen',
];

export const CERTIFICATION_PREFIXES = [
  'gots certified', 'gots', 'grs certified', 'grs',
  'bci', 'rws', 'rwp', 'responsible wool standard',
  'organic', 'bio', 'biologisch', 'biologique', 'biologico',
  'recycled', 'recyclé', 'reciclado', 'riciclato', 'recycelt',
  'certified', 'certifié', 'certificado', 'zertifiziert',
  'fairtrade', 'fair trade', 'oeko-tex', 'oekotex',
  'better cotton', 'bci cotton',
  'approximately', 'approx', 'circa', 'ungefähr',
  'minimum', 'up to', 'hasta', 'jusqu',
];

export const EXCLUSION_PHRASES = [
  'exclusive of decoration', 'exclusive of trimmings',
  'sauf incrustation', 'sauf broderie', 'sauf isse',
  'tranne incrostazioni', 'tranne incrostan',
  'uden dekoration', 'ingen dekoration',
  'kecuali', 'behalve versieringen',
  'ausgenommen verzierungen',
  'opdruk', 'lac opdruk',
  'eptoincrustaciones sauf isse',
];

export type LabelPreprocessResult = {
  processedText: string;
  isLiningOnly: boolean;
  hasExclusionNote: boolean;
  warnings: string[];
};

export type ShellLiningSplit = {
  shell: string;
  lining: string | null;
};

export function splitShellAndLining(text: string): ShellLiningSplit {
  const lines = text.split('\n');
  const liningIndex = lines.findIndex((line) =>
    LINING_INDICATORS.some((header) => line.toLowerCase().includes(header))
  );

  if (liningIndex > 0) {
    return {
      shell: lines.slice(0, liningIndex).join('\n'),
      lining: lines.slice(liningIndex).join('\n'),
    };
  }

  if (liningIndex === 0) {
    return { shell: '', lining: text };
  }

  return { shell: text, lining: null };
}

export function extractShellComposition(labelText: string): {
  shellText: string;
  isLiningOnly: boolean;
} {
  const { shell, lining } = splitShellAndLining(labelText);
  const shellText = shell.trim();
  if (!shellText && lining) {
    return { shellText: '', isLiningOnly: true };
  }
  if (shellText) {
    return { shellText, isLiningOnly: false };
  }
  return { shellText: labelText, isLiningOnly: false };
}

export function stripCertificationPrefixes(text: string): string {
  let cleaned = text;
  for (const prefix of CERTIFICATION_PREFIXES) {
    cleaned = cleaned.replace(new RegExp(prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'gi'), '');
  }
  return cleaned;
}

export function stripExclusionText(text: string): string {
  let cleaned = text;
  for (const phrase of EXCLUSION_PHRASES) {
    cleaned = cleaned.replace(
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\\n]*', 'gi'),
      ''
    );
  }
  return cleaned;
}

export function normalizePercentageFormats(text: string): string {
  let cleaned = text;

  cleaned = cleaned.replace(/(\d+),(\d+)\s*%/g, '$1.$2%');
  cleaned = cleaned.replace(/(\d+)\s+%/g, '$1%');
  cleaned = cleaned.replace(/(\d+)-(\d+)\s*%/g, (_match, a, b) => {
    const midpoint = Math.round((parseInt(a, 10) + parseInt(b, 10)) / 2);
    return `${midpoint}%`;
  });

  cleaned = cleaned.replace(/ART\.\s*:?\s*[\d/]+/gi, '');
  cleaned = cleaned.replace(/\b\d{6,}\b/g, '');
  cleaned = cleaned.replace(/MADE IN [A-Z\s]+/gi, '');
  cleaned = cleaned.replace(/FABRICADO EN [A-Z\s]+/gi, '');
  cleaned = cleaned.replace(/FABRIQUÉ EN [A-Z\s]+/gi, '');
  cleaned = cleaned.replace(/HERGESTELLT IN [A-Z\s]+/gi, '');
  cleaned = cleaned.replace(/HECHO EN [A-Z\s]+/gi, '');
  cleaned = cleaned.replace(/PRODUIT EN [A-Z\s]+/gi, '');
  cleaned = cleaned.replace(/PRODOTTO IN [A-Z\s]+/gi, '');
  cleaned = cleaned.replace(/\d+\s*°[CF]?/g, '');
  cleaned = cleaned.replace(/\b(XS|S|M|L|XL|XXL|XXXL)\b/g, '');
  cleaned = cleaned.replace(/\bSIZE\s*\d+/gi, '');

  return cleaned;
}

export function preprocessLabel(rawText: string): LabelPreprocessResult {
  const warnings: string[] = [];

  const { shellText, isLiningOnly } = extractShellComposition(rawText);
  if (isLiningOnly) {
    return {
      processedText: '',
      isLiningOnly: true,
      hasExclusionNote: false,
      warnings: ['lining_label'],
    };
  }

  let text = shellText;
  text = stripCertificationPrefixes(text);

  const hasExclusionNote = EXCLUSION_PHRASES.some((p) =>
    text.toLowerCase().includes(p)
  );
  if (hasExclusionNote) warnings.push('exclusive_of_decoration');
  text = stripExclusionText(text);
  text = normalizePercentageFormats(text);

  const percentages = (text.match(/\d+\.?\d*\s*%/g) || []).map((p) =>
    parseFloat(p.replace('%', '').trim())
  );
  const total = percentages.reduce((sum, p) => sum + p, 0);

  if (total > 105) warnings.push('percentages_exceed_100');
  if (total < 80 && percentages.length > 0) {
    warnings.push('percentages_below_80_may_be_partial');
  }

  return {
    processedText: text,
    isLiningOnly: false,
    hasExclusionNote,
    warnings,
  };
}
