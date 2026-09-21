/** Restrained geometric stage diagrams — Kessler rhythm, INTERTEXE lifecycle logic. */

const ink = "#2A2825";
const mute = "#9A948C";
const gold = "#C9A962";
const soft = "#F2E7D3";

function RecordNode({ x, y, label = "Record" }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <rect x={x - 36} y={y - 18} width="72" height="36" rx="3" fill="#fff" stroke={ink} strokeWidth="1.15" />
      <text
        x={x}
        y={y + 4}
        fontSize="9"
        fill={ink}
        fontFamily="var(--itx-sans, sans-serif)"
        textAnchor="middle"
        letterSpacing="0.08em"
      >
        {label.toUpperCase()}
      </text>
    </g>
  );
}

/** 01 — source strands entering the product record */
export function SourceMakeVisual() {
  const sources = [
    { y: 56, label: "Material", w: 78 },
    { y: 104, label: "Supplier", w: 86 },
    { y: 152, label: "Manufacturing", w: 118 },
    { y: 200, label: "Style + BOM", w: 96 },
  ];
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Source strands entering one product record">
      <title>Source & Make</title>
      {sources.map((row, i) => (
        <g key={row.label}>
          <rect x="24" y={row.y} width={row.w} height="20" rx="10" fill="none" stroke={mute} strokeWidth="1" />
          <text x="36" y={row.y + 14} fontSize="8.5" fill={ink} fontFamily="var(--itx-sans, sans-serif)" letterSpacing="0.05em">
            {row.label}
          </text>
          <path
            d={`M ${24 + row.w} ${row.y + 10} C ${170 + i * 6} ${row.y + 10}, 230 140, 268 140`}
            fill="none"
            stroke={i === 1 ? gold : mute}
            strokeWidth="1"
            opacity={i === 1 ? 0.95 : 0.55}
          />
          <circle cx={24 + row.w} cy={row.y + 10} r="2" fill={i === 1 ? gold : mute} />
        </g>
      ))}
      <RecordNode x={320} y={140} />
      <circle cx="284" cy="140" r="2.4" fill={gold} />
    </svg>
  );
}

/** 02 — fragmented strokes aligning into one record */
export function CleanConnectVisual() {
  const leftY = [58, 88, 118, 148, 178, 208];
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Fragmented inputs becoming one governed product record">
      <title>Clean & Connect</title>
      {leftY.map((y, i) => (
        <g key={y}>
          <line
            x1={28 + (i % 3) * 8}
            y1={y}
            x2={120 + (i % 2) * 18}
            y2={y + (i % 2 === 0 ? -6 : 8)}
            stroke={mute}
            strokeWidth="1"
            opacity={0.45 + i * 0.05}
          />
          <circle cx={28 + (i % 3) * 8} cy={y} r="1.6" fill={mute} />
        </g>
      ))}
      {[96, 120, 144, 168].map((y, i) => (
        <line key={y} x1="148" y1={y} x2="230" y2={118 + i * 12} stroke={i === 2 ? gold : mute} strokeWidth="1" opacity={0.75} />
      ))}
      <g>
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={238}
            y={108 + i * 14}
            width={72 - i * 4}
            height="8"
            rx="1.5"
            fill={i === 1 ? soft : "none"}
            stroke={i === 1 ? gold : ink}
            strokeWidth="1"
          />
        ))}
      </g>
      <text x="238" y="96" fontSize="8" fill={mute} fontFamily="var(--itx-sans, sans-serif)" letterSpacing="0.1em">
        GOVERNED RECORD
      </text>
      <circle cx="330" cy="140" r="3" fill={gold} />
    </svg>
  );
}

/** 03 — evidence nodes linked to the record */
export function TraceProveVisual() {
  const nodes = [
    { x: 72, y: 72, label: "Evidence" },
    { x: 80, y: 200, label: "Provenance" },
    { x: 200, y: 52, label: "Custody" },
  ];
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Claims linked to evidence around the product record">
      <title>Trace & Prove</title>
      <RecordNode x={250} y={150} />
      {nodes.map((node, i) => (
        <g key={node.label}>
          <line x1={node.x} y1={node.y} x2={214} y2={150} stroke={i === 0 ? gold : mute} strokeWidth="1" />
          <circle cx={node.x} cy={node.y} r="5" fill="#fff" stroke={i === 0 ? gold : ink} strokeWidth="1.1" />
          <circle cx={node.x} cy={node.y} r="1.6" fill={i === 0 ? gold : ink} />
          <text
            x={node.x + (node.x < 160 ? -10 : 10)}
            y={node.y - 12}
            fontSize="8.5"
            fill={mute}
            fontFamily="var(--itx-sans, sans-serif)"
            textAnchor={node.x < 160 ? "end" : "start"}
          >
            {node.label}
          </text>
        </g>
      ))}
      <text x="250" y="210" fontSize="8" fill={mute} fontFamily="var(--itx-sans, sans-serif)" textAnchor="middle" letterSpacing="0.06em">
        Claims linked to evidence
      </text>
    </svg>
  );
}

/** 04 — Incomplete → Review → Resolved → Ready */
export function CheckPrepareVisual() {
  const steps = [
    { x: 56, label: "Incomplete", state: "empty" as const },
    { x: 148, label: "Review", state: "ring" as const },
    { x: 240, label: "Resolved", state: "check" as const },
    { x: 332, label: "Ready", state: "ready" as const },
  ];
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Readiness progressing from incomplete to ready">
      <title>Check & Prepare</title>
      <line x1="68" y1="130" x2="352" y2="130" stroke={mute} strokeWidth="1" />
      {steps.map((step) => (
        <g key={step.label}>
          <circle
            cx={step.x}
            cy="130"
            r="11"
            fill="#fff"
            stroke={step.state === "ready" ? gold : ink}
            strokeWidth="1.15"
          />
          {step.state === "ring" && <circle cx={step.x} cy="130" r="5" fill="none" stroke={mute} strokeWidth="1" />}
          {step.state === "check" && (
            <path d={`M${step.x - 4} 130 l3 3 6-7`} fill="none" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
          )}
          {step.state === "ready" && <circle cx={step.x} cy="130" r="4" fill={gold} />}
          <text
            x={step.x}
            y="162"
            fontSize="8.5"
            fill={mute}
            fontFamily="var(--itx-sans, sans-serif)"
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            {step.label}
          </text>
        </g>
      ))}
      <text x="210" y="210" fontSize="8" fill={mute} fontFamily="var(--itx-sans, sans-serif)" textAnchor="middle" letterSpacing="0.08em">
        DPP READINESS
      </text>
    </svg>
  );
}

/** 05 — record branching outward to channels */
export function PassportPublishVisual() {
  const ends = [
    { x: 330, y: 58, label: "QR" },
    { x: 360, y: 118, label: "Web" },
    { x: 360, y: 178, label: "API" },
    { x: 330, y: 228, label: "Retail" },
  ];
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Governed identity distributed across channels">
      <title>Passport & Publish</title>
      <RecordNode x={110} y={140} label="Passport" />
      {ends.map((end, i) => (
        <g key={end.label}>
          <path
            d={`M146 140 C220 140, 250 ${end.y}, ${end.x - 14} ${end.y}`}
            fill="none"
            stroke={i === 1 ? gold : mute}
            strokeWidth="1"
          />
          <circle cx={end.x} cy={end.y} r="4.5" fill="#fff" stroke={i === 1 ? gold : ink} strokeWidth="1.1" />
          <circle cx={end.x} cy={end.y} r="1.5" fill={i === 1 ? gold : ink} />
          <text x={end.x + 12} y={end.y + 3} fontSize="9" fill={mute} fontFamily="var(--itx-sans, sans-serif)">
            {end.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** 06 — signals returning inward to the record */
export function UseLearnVisual() {
  const signals = [
    { x: 340, y: 64, label: "Analytics" },
    { x: 360, y: 130, label: "Engagement" },
    { x: 340, y: 196, label: "Scan Activity" },
  ];
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Usage signals returning into the product record">
      <title>Use & Learn</title>
      <RecordNode x={100} y={140} />
      {signals.map((sig, i) => (
        <g key={sig.label}>
          <path
            d={`M${sig.x - 18} ${sig.y} C250 ${sig.y}, 210 140, 136 140`}
            fill="none"
            stroke={i === 1 ? gold : mute}
            strokeWidth="1"
            strokeDasharray={i === 0 ? "3 3" : undefined}
          />
          <circle cx={sig.x} cy={sig.y} r="3.5" fill={i === 1 ? gold : soft} stroke={i === 1 ? gold : mute} strokeWidth="1" />
          <text x={sig.x + 10} y={sig.y + 3} fontSize="8.5" fill={mute} fontFamily="var(--itx-sans, sans-serif)">
            {sig.label}
          </text>
        </g>
      ))}
      {/* Tiny benchmark bars */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={54 + i * 8} y={198 - (i + 1) * 7} width="5" height={(i + 1) * 7} fill={i === 3 ? gold : mute} opacity={0.55 + i * 0.1} />
      ))}
      <text x="54" y="220" fontSize="8" fill={mute} fontFamily="var(--itx-sans, sans-serif)" letterSpacing="0.06em">
        Material Benchmark
      </text>
    </svg>
  );
}

/** 07 — elegant partial loop for next-life pathways */
export function RepairRecirculateVisual() {
  const labels = [
    { a: -40, label: "Repair" },
    { a: 50, label: "Resale" },
    { a: 140, label: "Reuse" },
  ];
  return (
    <svg viewBox="0 0 420 280" className="hlc-diagram" role="img" aria-label="Product record continuing through repair, resale and reuse">
      <title>Repair & Recirculate</title>
      <RecordNode x={210} y={140} />
      <path
        d="M250 118 A78 78 0 1 1 168 188"
        fill="none"
        stroke={gold}
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path d="M162 196 l6 -2 -2 -6" fill="none" stroke={gold} strokeWidth="1.15" strokeLinecap="round" />
      {labels.map((item) => {
        const rad = (item.a * Math.PI) / 180;
        const x = 210 + Math.cos(rad) * 96;
        const y = 140 + Math.sin(rad) * 96;
        return (
          <g key={item.label}>
            <circle cx={x} cy={y} r="4.5" fill="#fff" stroke={ink} strokeWidth="1.1" />
            <circle cx={x} cy={y} r="1.5" fill={ink} />
            <text
              x={x + (Math.cos(rad) > 0 ? 12 : -12)}
              y={y + 4}
              fontSize="9"
              fill={mute}
              fontFamily="var(--itx-sans, sans-serif)"
              textAnchor={Math.cos(rad) > 0 ? "start" : "end"}
            >
              {item.label}
            </text>
          </g>
        );
      })}
      <text x="128" y="64" fontSize="8" fill={mute} fontFamily="var(--itx-sans, sans-serif)">
        Care
      </text>
      <text x="268" y="230" fontSize="8" fill={mute} fontFamily="var(--itx-sans, sans-serif)">
        End of Life
      </text>
    </svg>
  );
}
