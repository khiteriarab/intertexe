import type { FieldProvenance } from "../../../lib/enterprise/provenance";

export function ProvenanceInline({ provenance }: { provenance: FieldProvenance }) {
  return (
    <div className="ent-provenance-block">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ent-journey-eyebrow">{provenance.displayLabel}</p>
          <p className="text-[15px] text-[var(--ent-ink)] mt-1">{provenance.canonicalValue || "—"}</p>
        </div>
        {provenance.canonicalState === "approved" ? (
          <span className="ent-provenance-approved">Approved canonical</span>
        ) : (
          <span className="ent-provenance-pending">{provenance.canonicalState || "Observed"}</span>
        )}
      </div>
      {provenance.sources.length ? (
        <ul className="ent-provenance-sources mt-4 space-y-2">
          {provenance.sources.map((source) => (
            <li key={source.id} className={`ent-provenance-source ${source.isCanonical ? "is-canonical" : ""}`}>
              <span className="ent-provenance-source-label">{source.label}</span>
              {source.retrievedAt ? <span className="ent-provenance-source-date">{source.retrievedAt}</span> : null}
              {source.value && source.value !== provenance.canonicalValue ? (
                <span className="ent-provenance-source-value">{source.value}</span>
              ) : null}
              {source.isCanonical ? <span className="ent-provenance-canonical-tag">Canonical source</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--ent-muted)] mt-3">No source records linked yet.</p>
      )}
      {provenance.approvedAt ? (
        <p className="text-xs text-[var(--ent-muted-light)] mt-3">
          Approved {provenance.approvedAt}
          {provenance.approverLabel ? ` · ${provenance.approverLabel}` : ""}
        </p>
      ) : null}
    </div>
  );
}
