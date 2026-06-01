'use client';

import Link from 'next/link';
import {
  editorialFiberStory,
  editorialVerdictHeadline,
  type EditorialFiberEntry,
} from '../../lib/scanner-editorial';
const ACCENT = '#420217';
const PRIMARY_DARK = '#1C2B2A';

type ScanResultEditorialProps = {
  naturalPercent: number;
  imageUrl?: string;
  brandName?: string;
  productName?: string;
  countryOfOrigin?: string | null;
  care?: string | null;
  dppReady?: boolean;
  composition?: string;
  fiberBreakdown: EditorialFiberEntry[];
  alternatives: any[];
  priceContext?: string | null;
};

function NFPRing({
  percent,
  size = 72,
  accentColor = ACCENT,
}: {
  percent: number;
  size?: number;
  accentColor?: string;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const ringColor =
    percent >= 80 ? accentColor : percent >= 60 ? 'rgba(255,255,255,0.6)' : '#DC2626';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-[20px] font-light text-white">{percent}%</span>
        <span className="text-[9px] font-medium text-white/65">natural</span>
      </div>
    </div>
  );
}

export function ScanResultEditorial({
  naturalPercent,
  imageUrl,
  brandName,
  productName,
  countryOfOrigin,
  care,
  dppReady,
  composition,
  fiberBreakdown,
  alternatives,
  priceContext,
}: ScanResultEditorialProps) {
  const headline = editorialVerdictHeadline(naturalPercent);
  const story = editorialFiberStory(naturalPercent, composition, fiberBreakdown);
  const curated = alternatives.slice(0, 4);

  return (
    <div className="bg-white">
      {/* Product image hero */}
      {imageUrl ? (
        <div className="relative h-[320px] w-full overflow-hidden">
          <img
            src={imageUrl}
            alt={productName || brandName || 'Scanned product'}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5) 100%)' }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {brandName && (
              <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-white/80">{brandName}</p>
            )}
            {productName && (
              <p className="mt-1 font-serif text-[18px] font-light leading-snug text-white">{productName}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-[120px] w-full items-center justify-center" style={{ background: PRIMARY_DARK }}>
          <div className="space-y-1 text-center">
            {brandName && (
              <p className="text-[10px] font-normal uppercase tracking-[0.3em] text-white/50">{brandName}</p>
            )}
            <p className="text-[9px] font-normal uppercase tracking-[0.4em] text-white/20">INTERTEXE</p>
          </div>
        </div>
      )}

      {/* Verdict hero */}
      <div className="relative px-6 py-8" style={{ background: PRIMARY_DARK }}>
        <div className="absolute right-6 top-6">
          <NFPRing percent={naturalPercent} size={72} accentColor={ACCENT} />
        </div>

        <h1 className="mb-3 pr-24 font-serif text-[34px] font-light leading-tight text-white">{headline}</h1>

        {story && (
          <p className="text-[13px] font-light leading-relaxed text-white/70">{story}</p>
        )}

        {naturalPercent >= 80 && (
          <div className="mt-3 flex items-center gap-2">
            <svg className="h-3 w-3 shrink-0" style={{ color: ACCENT }} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Verified natural fiber</span>
          </div>
        )}
      </div>

      {/* Craft detail */}
      <div className="space-y-6 border-b border-gray-100 px-6 py-8">
        {countryOfOrigin && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#AAAAAA]">Made In</p>
            <p className="font-serif text-[18px] font-light text-gray-900">{countryOfOrigin.toUpperCase()}</p>
          </div>
        )}

        {fiberBreakdown.length > 0 && (
          <div className="space-y-3">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#AAAAAA]">Composition</p>
            {fiberBreakdown.map((fiber) => (
              <div key={`${fiber.fiber}-${fiber.percent}`} className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[14px] font-light text-gray-900">{fiber.fiber}</span>
                  <span
                    className="text-[14px] font-light"
                    style={{ color: fiber.isNatural ? ACCENT : '#AAAAAA' }}
                  >
                    {fiber.percent}%
                  </span>
                </div>
                <div className="h-px w-full bg-[#F5F5F3]">
                  <div
                    className="h-px"
                    style={{
                      width: `${fiber.percent}%`,
                      background: fiber.isNatural ? ACCENT : '#DDDDDD',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {care && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#AAAAAA]">Care</p>
            <p className="text-[13px] font-light leading-relaxed text-[#666666]">{care}</p>
          </div>
        )}

        {dppReady && (
          <div className="flex items-center gap-2">
            <svg className="h-2.5 w-2.5" style={{ color: ACCENT }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-[10px] font-light tracking-wide text-[#AAAAAA]">Digital Product Passport verified</span>
          </div>
        )}
      </div>

      {/* Alternatives rail */}
      {curated.length > 0 && (
        <div className="py-8">
          <div className="mb-5 px-6">
            <div className="mb-4 h-px w-full" style={{ background: ACCENT }} />
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#AAAAAA]">You might also love</p>
            {priceContext && (
              <p className="mt-1 text-[11px] font-light text-[#AAAAAA]">{priceContext}</p>
            )}
          </div>

          <div
            className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {curated.map((product) => {
              const id = String(product.id);
              const name = product.name || product.productName || '';
              const brand = product.brand_name || product.brandName || '';
              const img = product.image_url || product.imageUrl;
              const price = product.price;

              return (
                <Link key={id} href={`/product/${id}`} className="w-40 shrink-0">
                  <div className="space-y-2">
                    <div className="h-[220px] w-40 overflow-hidden bg-[#F5F5F3]">
                      {img ? (
                        <img
                          src={img}
                          alt={name}
                          className="h-full w-full object-cover object-top"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <p className="truncate text-[9px] uppercase tracking-[0.15em] text-[#AAAAAA]">{brand}</p>
                    <p className="line-clamp-2 text-[12px] font-light text-gray-900">{name}</p>
                    {price && <p className="text-[12px] text-gray-900">{price}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
