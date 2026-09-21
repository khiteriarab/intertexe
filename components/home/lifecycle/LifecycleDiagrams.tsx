/** Minimal geometric diagrams — Kessler rhythm, INTERTEXE content. */

const ink = "#2A2825";
const mute = "#9A948C";
const gold = "#C9A962";
const soft = "#F2E7D3";

export function ProductIntelligenceDiagram() {
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Fragmented inputs converging into one governed product record">
      <title>Product Intelligence</title>
      {/* Input rows */}
      {[
        { y: 48, label: "PLM", w: 92 },
        { y: 88, label: "ERP", w: 78 },
        { y: 128, label: "Supplier", w: 108 },
        { y: 168, label: "CSV", w: 70 },
        { y: 208, label: "Retail", w: 86 },
      ].map((row, i) => (
        <g key={row.label}>
          <rect x="28" y={row.y} width={row.w} height="22" rx="11" fill="none" stroke={mute} strokeWidth="1" />
          <text x="42" y={row.y + 15} fontSize="9" fill={ink} fontFamily="var(--itx-sans, sans-serif)" letterSpacing="0.06em">
            {row.label.toUpperCase()}
          </text>
          <path
            d={`M ${28 + row.w} ${row.y + 11} C ${160 + i * 4} ${row.y + 11}, 200 140, 236 140`}
            fill="none"
            stroke={i === 2 ? gold : mute}
            strokeWidth="1"
            opacity={i === 2 ? 0.95 : 0.55}
          />
          <circle cx={28 + row.w} cy={row.y + 11} r="2.2" fill={i === 2 ? gold : mute} />
        </g>
      ))}

      {/* Governed record */}
      <rect x="236" y="96" width="152" height="88" rx="4" fill="#fff" stroke={ink} strokeWidth="1.15" />
      <rect x="236" y="96" width="152" height="26" fill={ink} />
      <text x="248" y="113" fontSize="8" fill="#F7F6F3" fontFamily="var(--itx-sans, sans-serif)" letterSpacing="0.12em">
        GOVERNED RECORD
      </text>
      <text x="248" y="140" fontSize="13" fill={ink} fontFamily="var(--itx-serif, Georgia, serif)">
        Silk Midi Skirt
      </text>
      <text x="248" y="158" fontSize="9" fill={mute} fontFamily="var(--itx-sans, sans-serif)">
        96% Silk · 4% Elastane
      </text>
      <circle cx="368" cy="148" r="4" fill={soft} stroke={gold} strokeWidth="1" />
      <circle cx="368" cy="148" r="1.6" fill={gold} />
    </svg>
  );
}

export function TraceabilityComplianceDiagram() {
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Governed record linked to evidence and compliance readiness">
      <title>Traceability and Compliance</title>
      {/* Rings */}
      <circle cx="210" cy="140" r="96" fill="none" stroke={mute} strokeWidth="1" opacity="0.45" />
      <circle cx="210" cy="140" r="64" fill="none" stroke={mute} strokeWidth="1" opacity="0.55" />
      <circle cx="210" cy="140" r="34" fill="none" stroke={ink} strokeWidth="1.1" />

      {/* Center node */}
      <circle cx="210" cy="140" r="10" fill="#fff" stroke={ink} strokeWidth="1.2" />
      <circle cx="210" cy="140" r="3.5" fill={gold} />

      {/* Evidence nodes */}
      {[
        { a: -110, label: "Evidence" },
        { a: -20, label: "Origin" },
        { a: 55, label: "Custody" },
        { a: 140, label: "Ready" },
      ].map((node) => {
        const rad = (node.a * Math.PI) / 180;
        const x = 210 + Math.cos(rad) * 96;
        const y = 140 + Math.sin(rad) * 96;
        const ix = 210 + Math.cos(rad) * 34;
        const iy = 140 + Math.sin(rad) * 34;
        return (
          <g key={node.label}>
            <line x1={ix} y1={iy} x2={x} y2={y} stroke={mute} strokeWidth="1" />
            <circle cx={x} cy={y} r="5" fill="#fff" stroke={node.label === "Ready" ? gold : ink} strokeWidth="1.1" />
            <text
              x={x + (Math.cos(rad) > 0 ? 12 : -12)}
              y={y + 4}
              fontSize="9"
              fill={mute}
              fontFamily="var(--itx-sans, sans-serif)"
              textAnchor={Math.cos(rad) > 0 ? "start" : "end"}
              letterSpacing="0.04em"
            >
              {node.label}
            </text>
          </g>
        );
      })}

      {/* Stipple hint */}
      <g opacity="0.35">
        {Array.from({ length: 18 }).map((_, i) => (
          <circle key={i} cx={198 + (i % 6) * 5} cy={128 + Math.floor(i / 6) * 5} r="0.8" fill={ink} />
        ))}
      </g>
    </svg>
  );
}

export function ConnectedProductDiagram() {
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Governed record activating consumer and next-life pathways">
      <title>Connected Product</title>
      {/* Passport tile */}
      <rect x="78" y="86" width="118" height="108" rx="4" fill="#fff" stroke={ink} strokeWidth="1.15" />
      <rect x="78" y="86" width="118" height="22" fill={ink} />
      <text x="90" y="101" fontSize="8" fill="#F7F6F3" fontFamily="var(--itx-sans, sans-serif)" letterSpacing="0.12em">
        PASSPORT
      </text>
      <rect x="94" y="124" width="36" height="36" rx="2" fill="none" stroke={mute} strokeWidth="1" />
      <path d="M100 130h8v8h-8zM114 130h8v8h-8zM100 144h8v8h-8zM114 144h4v4h-4z" fill={ink} opacity="0.7" />
      <text x="140" y="140" fontSize="10" fill={ink} fontFamily="var(--itx-serif, Georgia, serif)">
        ITX-4102
      </text>
      <text x="140" y="156" fontSize="8" fill={mute} fontFamily="var(--itx-sans, sans-serif)">
        Live identity
      </text>

      {/* Arc to touchpoints */}
      <path d="M196 140 C250 140, 270 88, 318 78" fill="none" stroke={mute} strokeWidth="1" />
      <path d="M196 140 C250 140, 270 140, 318 140" fill="none" stroke={gold} strokeWidth="1.15" />
      <path d="M196 140 C250 140, 270 192, 318 202" fill="none" stroke={mute} strokeWidth="1" />

      {[
        { y: 78, label: "QR / NFC" },
        { y: 140, label: "Care · Repair" },
        { y: 202, label: "Resale · Next life" },
      ].map((item, i) => (
        <g key={item.label}>
          <circle cx="318" cy={item.y} r={i === 1 ? 5.5 : 4.5} fill="#fff" stroke={i === 1 ? gold : ink} strokeWidth="1.1" />
          <circle cx="318" cy={item.y} r="1.6" fill={i === 1 ? gold : ink} />
          <text x="332" y={item.y + 4} fontSize="9" fill={mute} fontFamily="var(--itx-sans, sans-serif)">
            {item.label}
          </text>
        </g>
      ))}

      {/* Soft outer ring */}
      <circle cx="210" cy="140" r="118" fill="none" stroke={mute} strokeWidth="1" opacity="0.25" strokeDasharray="2 6" />
    </svg>
  );
}
