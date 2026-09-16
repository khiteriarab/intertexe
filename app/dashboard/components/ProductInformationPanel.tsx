import { resolvePilotFixture } from "../../../lib/enterprise/pilot-product-media";
import { formatProductTypeLabel } from "../../../lib/enterprise/product-type-label";
import {
  formatMassFromGrams,
  parseMassInputToGrams,
  type MassUnitSystem,
} from "../../../lib/enterprise/org-preferences";
import { entLabelClass } from "./EnterpriseUi";

type ProductInfo = {
  name: string;
  sku: string | null;
  styleCode: string | null;
  category: string | null;
  identifiers: Array<{ identifier_type: string; identifier_value: string }>;
  composition: string | null;
  countryOfOrigin: string | null;
  brand: string | null;
  weight: string | null;
};

function fieldValue(fields: Array<{ field_key: string; normalized_value?: string | null; original_value?: string | null }>, key: string) {
  const row = fields.find((f) => f.field_key === key);
  return row?.normalized_value || row?.original_value || null;
}

function resolveProductWeightGrams(
  fields: Array<{ field_key: string; normalized_value?: string | null; original_value?: string | null }>,
  sku: string | null | undefined,
  styleCode: string | null | undefined
): number | null {
  const fromField =
    fieldValue(fields, "product_weight") ||
    fieldValue(fields, "weight") ||
    fieldValue(fields, "net_weight");
  if (fromField) {
    const parsed = parseMassInputToGrams(fromField);
    if (parsed != null) return parsed;
  }

  const pilot = resolvePilotFixture(sku, styleCode);
  if (pilot && "weight_g" in pilot && pilot.weight_g != null) {
    return Number(pilot.weight_g);
  }

  return null;
}

export function productInfoFromRecord(
  record: {
    product: {
      name?: string | null;
      sku?: string | null;
      style_code?: string | null;
      category?: string | null;
    };
    fields: Array<{ field_key: string; normalized_value?: string | null; original_value?: string | null }>;
    identifiers: Array<{ identifier_type: string; identifier_value: string }>;
    brand?: string | null;
  },
  massUnit: MassUnitSystem = "metric"
): ProductInfo {
  const grams = resolveProductWeightGrams(record.fields, record.product.sku, record.product.style_code);
  return {
    name: String(record.product.name || "Product"),
    sku: record.product.sku || null,
    styleCode: record.product.style_code || null,
    category: formatProductTypeLabel(record.product.category),
    identifiers: record.identifiers,
    composition: fieldValue(record.fields, "composition"),
    countryOfOrigin:
      fieldValue(record.fields, "manufacturing_country") || fieldValue(record.fields, "country_of_origin"),
    brand: record.brand || fieldValue(record.fields, "brand"),
    weight: formatMassFromGrams(grams, massUnit),
  };
}

export function ProductInformationPanel({ info }: { info: ProductInfo }) {
  const gtin = info.identifiers.find((row) => row.identifier_type === "gtin")?.identifier_value;
  const certifications = info.identifiers
    .filter((row) => row.identifier_type !== "gtin" && row.identifier_type !== "sku")
    .slice(0, 3);

  return (
    <section className="ent-product-information">
      <h2 className="ent-product-information-title">Product information</h2>
      <dl className="ent-product-information-grid">
        <div>
          <dt className={entLabelClass}>Collection</dt>
          <dd className="ent-product-information-value">{info.styleCode || "—"}</dd>
        </div>
        <div>
          <dt className={entLabelClass}>Product type</dt>
          <dd>
            {info.category ? (
              <span className="ent-product-type-pill">{info.category}</span>
            ) : (
              <span className="ent-product-information-value">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className={entLabelClass}>Product reference</dt>
          <dd className="ent-product-information-value">{info.sku || "—"}</dd>
        </div>
        <div>
          <dt className={entLabelClass}>Brand</dt>
          <dd className="ent-product-information-value">{info.brand || "—"}</dd>
        </div>
        <div>
          <dt className={entLabelClass}>Product weight</dt>
          <dd className="ent-product-information-value">{info.weight || "—"}</dd>
        </div>
        <div>
          <dt className={entLabelClass}>Country of origin</dt>
          <dd className="ent-product-information-value">{info.countryOfOrigin || "—"}</dd>
        </div>
        <div>
          <dt className={entLabelClass}>Identifiers</dt>
          <dd className="ent-product-information-value">{gtin ? `GTIN ${gtin}` : "—"}</dd>
        </div>
      </dl>

      {info.composition ? (
        <div className="ent-product-materials-block">
          <p className={entLabelClass}>Main materials</p>
          <p className="ent-product-materials-value">{info.composition}</p>
        </div>
      ) : null}

      {certifications.length ? (
        <div className="ent-product-certifications">
          <p className={entLabelClass}>Product certifications</p>
          <ul className="ent-product-certification-list">
            {certifications.map((row) => (
              <li key={`${row.identifier_type}-${row.identifier_value}`} className="ent-product-certification-pill">
                {row.identifier_type}: {row.identifier_value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
