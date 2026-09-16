import { resolvePilotFixture } from "../../../lib/enterprise/pilot-product-media";
import { formatProductTypeLabel } from "../../../lib/enterprise/product-type-label";
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

function formatProductWeight(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/g$|kg$/i.test(raw)) return raw;
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 0) return `${Math.round(num)}g`;
  return raw;
}

function resolveProductWeight(
  fields: Array<{ field_key: string; normalized_value?: string | null; original_value?: string | null }>,
  sku: string | null | undefined,
  styleCode: string | null | undefined
): string | null {
  const fromField =
    fieldValue(fields, "product_weight") ||
    fieldValue(fields, "weight") ||
    fieldValue(fields, "net_weight");
  if (fromField) return formatProductWeight(fromField);

  const pilot = resolvePilotFixture(sku, styleCode);
  if (pilot && "weight_g" in pilot && pilot.weight_g != null) {
    return formatProductWeight(pilot.weight_g);
  }

  return null;
}

export function productInfoFromRecord(record: {
  product: {
    name?: string | null;
    sku?: string | null;
    style_code?: string | null;
    category?: string | null;
  };
  fields: Array<{ field_key: string; normalized_value?: string | null; original_value?: string | null }>;
  identifiers: Array<{ identifier_type: string; identifier_value: string }>;
  brand?: string | null;
}): ProductInfo {
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
    weight: resolveProductWeight(record.fields, record.product.sku, record.product.style_code),
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
