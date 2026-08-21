import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { getAppStoreOpenUrl } from "../lib/app-store";
import {
  INTERTEXE_INSTAGRAM_URL,
  INTERTEXE_TIKTOK_URL,
  type WeeklyEditSection,
} from "../lib/weekly-edit";
import {
  collectionEditTitle,
  compactFiberCopy,
  displayProductName,
  fiberDiscoverHref,
  pairProducts,
  saleSectionHeading,
  weeklyEditMaterialSpec,
} from "../lib/weekly-edit-presentation";

export type WeeklyEditEmailProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  imageUrl: string;
  url: string;
  naturalFiberPercent: number;
  composition?: string;
  isSale?: boolean;
  section?: WeeklyEditSection;
};

export interface WeeklyEditEmailProps {
  weekNumber?: number;
  products: WeeklyEditEmailProduct[];
  collectionName: string;
  collectionUrl: string;
  collectionSubline: string;
  collectionImageUrl?: string;
  fiberFact: string;
  fiberFactFiber: string;
  fiberFactHeadline?: string;
  fiberFactTraits?: string[];
  isPreview?: boolean;
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const OUTER = "#F1F1EF";
const CANVAS = "#FAFAF8";
const WELL = "#F4F4F2";
const INK = "#151515";
const SLATE = "#687078";
const RULE = "#DDDDDA";
const ACCENT = "#3D7A78";

const main = {
  backgroundColor: OUTER,
  fontFamily: SANS,
  margin: "0",
  padding: "0",
  width: "100%",
};

const container = {
  margin: "0 auto",
  padding: "40px 24px 48px",
  maxWidth: "600px",
  backgroundColor: CANVAS,
};

const wordmark = {
  fontFamily: SANS,
  fontSize: "13px",
  letterSpacing: "0.08em",
  color: INK,
  margin: "0 0 28px",
  textTransform: "uppercase" as const,
  fontWeight: 600,
};

const heading = {
  fontFamily: SERIF,
  fontSize: "30px",
  color: INK,
  fontWeight: "normal" as const,
  margin: "0 0 10px",
  lineHeight: "1.15",
  letterSpacing: "-0.01em",
};

const introText = {
  fontFamily: SANS,
  color: SLATE,
  fontSize: "14px",
  lineHeight: "1.55",
  margin: "0",
};

const kicker = {
  fontFamily: SANS,
  fontSize: "10px",
  letterSpacing: "0.2em",
  color: INK,
  textTransform: "uppercase" as const,
  margin: "0 0 10px",
};

const intelligenceKicker = {
  ...kicker,
  color: ACCENT,
};

const sectionNav = {
  fontFamily: SANS,
  fontSize: "10px",
  letterSpacing: "0.18em",
  color: SLATE,
  textTransform: "uppercase" as const,
  margin: "0 0 18px",
};

const brandText = {
  fontFamily: SANS,
  fontSize: "9px",
  letterSpacing: "0.16em",
  color: SLATE,
  textTransform: "uppercase" as const,
  margin: "10px 0 4px",
};

const productName = {
  fontFamily: SERIF,
  fontSize: "15px",
  color: INK,
  margin: "0 0 8px",
  lineHeight: "1.3",
  fontWeight: "normal" as const,
};

const heroName = {
  ...productName,
  fontSize: "20px",
  margin: "0 0 8px",
};

const productLink = {
  color: INK,
  textDecoration: "none",
};

const materialLabel = {
  fontFamily: SANS,
  fontSize: "11px",
  letterSpacing: "0.12em",
  color: INK,
  textTransform: "uppercase" as const,
  margin: "0 0 6px",
};

const priceText = {
  fontFamily: SANS,
  fontSize: "12px",
  color: SLATE,
  margin: "0",
  letterSpacing: "0.02em",
};

const wasPrice = {
  textDecoration: "line-through",
  color: SLATE,
};

const button = {
  backgroundColor: INK,
  color: "#ffffff",
  padding: "12px 22px",
  textDecoration: "none",
  fontFamily: SANS,
  fontSize: "11px",
  letterSpacing: "0.12em",
  display: "inline-block",
  borderRadius: "0px",
  textTransform: "uppercase" as const,
};

const EMAIL_ICONS = {
  tiktok: "https://www.intertexe.com/email/icon-tiktok.png",
  instagram: "https://www.intertexe.com/email/icon-instagram.png",
  app: "https://www.intertexe.com/email/icon-app.png",
} as const;

const iconColumn = {
  width: "33%",
  textAlign: "center" as const,
  backgroundColor: CANVAS,
  verticalAlign: "middle" as const,
  padding: "4px 0",
};

const iconLink = {
  display: "inline-block",
  textDecoration: "none",
  lineHeight: 0,
};

const iconImage = {
  display: "block",
  border: "0",
  outline: "none",
  margin: "0 auto",
};

const ghostButton = {
  ...button,
  backgroundColor: CANVAS,
  color: INK,
  padding: "12px 0",
  borderBottom: `1px solid ${INK}`,
};

const collectionTitle = {
  fontFamily: SERIF,
  fontSize: "26px",
  color: INK,
  fontWeight: "normal" as const,
  margin: "0 0 14px",
  letterSpacing: "-0.01em",
};

const collectionSublineText = {
  fontFamily: SANS,
  fontSize: "14px",
  color: SLATE,
  lineHeight: "1.5",
  margin: "14px 0 16px",
};

const intelligenceHeadline = {
  fontFamily: SERIF,
  fontSize: "18px",
  color: INK,
  fontWeight: "normal" as const,
  margin: "0 0 8px",
  lineHeight: "1.3",
};

const traitLine = {
  fontFamily: SANS,
  fontSize: "10px",
  letterSpacing: "0.12em",
  color: SLATE,
  textTransform: "uppercase" as const,
  margin: "0 0 10px",
};

const factText = {
  fontFamily: SANS,
  fontSize: "13px",
  color: INK,
  lineHeight: "1.55",
  margin: "0 0 16px",
};

const footer = {
  fontFamily: SANS,
  color: SLATE,
  fontSize: "11px",
  margin: "36px 0 0",
  lineHeight: "1.6",
};

const footerLink = {
  color: SLATE,
  textDecoration: "none",
};

const hr = {
  borderColor: RULE,
  margin: "28px 0",
};

function formatPrice(price: number, currency: string): string {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function openAppHref(): string {
  return getAppStoreOpenUrl("/shop", undefined, {
    cta: "email_weekly_edit",
    params: {
      utm_source: "resend",
      utm_medium: "email",
      utm_campaign: "weekly_edit",
    },
  });
}

function ProductCopy({
  product,
  nameStyle = productName,
}: {
  product: WeeklyEditEmailProduct;
  nameStyle?: typeof productName;
}) {
  const spec = weeklyEditMaterialSpec({
    composition: product.composition,
    naturalFiberPercent: product.naturalFiberPercent,
  });
  const name = displayProductName(product.name, product.brand);
  const onSale = Boolean(product.originalPrice && product.originalPrice > product.price);

  return (
    <>
      <Text style={brandText}>{product.brand}</Text>
      <Link href={product.url} style={productLink}>
        <Text style={nameStyle}>{name}</Text>
      </Link>
      {spec.label ? <Text style={materialLabel}>{spec.label}</Text> : null}
      <Text style={priceText}>
        {formatPrice(product.price, product.currency)}
        {onSale ? (
          <>
            {"  "}
            <span style={wasPrice}>{formatPrice(product.originalPrice as number, product.currency)}</span>
          </>
        ) : null}
      </Text>
    </>
  );
}

function HeroProduct({ product }: { product: WeeklyEditEmailProduct }) {
  const name = displayProductName(product.name, product.brand);
  return (
    <Section style={{ margin: "0 0 28px", backgroundColor: CANVAS }} className="we-hero we-cell">
      <Link href={product.url}>
        <Img
          src={product.imageUrl}
          alt={`${product.brand} ${name}`}
          width="560"
          height="300"
          className="we-hero-img"
          style={{
            width: "100%",
            height: "auto",
            objectFit: "cover",
            backgroundColor: WELL,
            display: "block",
          }}
        />
      </Link>
      <ProductCopy product={product} nameStyle={heroName} />
    </Section>
  );
}

function ProductCell({
  product,
  padRight,
}: {
  product: WeeklyEditEmailProduct;
  padRight: boolean;
}) {
  const name = displayProductName(product.name, product.brand);
  return (
    <Column
      className="we-grid-col"
      style={{
        width: "50%",
        verticalAlign: "top",
        paddingRight: padRight ? "10px" : "0px",
        paddingLeft: padRight ? "0px" : "10px",
        paddingBottom: "24px",
        backgroundColor: CANVAS,
      }}
    >
      <Link href={product.url}>
        <Img
          src={product.imageUrl}
          alt={`${product.brand} ${name}`}
          width="250"
          height="320"
          className="we-grid-img"
          style={{
            width: "100%",
            height: "auto",
            objectFit: "cover",
            backgroundColor: WELL,
            display: "block",
          }}
        />
      </Link>
      <ProductCopy product={product} />
    </Column>
  );
}

function ProductGrid({ products }: { products: WeeklyEditEmailProduct[] }) {
  return (
    <Section className="we-product-grid we-cell" style={{ backgroundColor: CANVAS }}>
      {pairProducts(products).map((row) => (
        <Row key={row.map((product) => product.id).join("-")}>
          {row.map((product, index) => (
            <ProductCell key={product.id} product={product} padRight={index === 0} />
          ))}
          {row.length === 1 ? (
            <Column style={{ width: "50%", backgroundColor: CANVAS }} />
          ) : null}
        </Row>
      ))}
    </Section>
  );
}

export default function WeeklyEditEmail({
  products,
  collectionName,
  collectionUrl,
  collectionSubline,
  collectionImageUrl,
  fiberFact,
  fiberFactFiber,
  fiberFactHeadline,
  fiberFactTraits,
  isPreview = false,
}: WeeklyEditEmailProps) {
  const preview = `${isPreview ? "[PREVIEW] " : ""}The Weekly Edit — pieces worth knowing`;
  const featured = products.filter(
    (product) => product.section === "shoes" || product.section === "clothing"
  );
  const saleItems = products.filter((product) => product.section === "sale");
  const unsectioned = products.filter((product) => !product.section);
  const newItems = featured.length ? featured : unsectioned;
  const hero = newItems[0];
  const gridItems = newItems.slice(1);
  const appHref = openAppHref();
  const editTitle = collectionEditTitle(collectionName);
  const traits =
    fiberFactTraits && fiberFactTraits.length > 0
      ? fiberFactTraits
      : ["NATURAL FIBER", "MATERIAL-FIRST", "VERIFIED"];
  const intelligenceTitle =
    fiberFactHeadline || `Why ${String(fiberFactFiber || "this fiber").toLowerCase()} matters`;
  const discoverHref = fiberDiscoverHref(fiberFactFiber);
  const discoverLabel = `Discover ${fiberFactFiber || "the fiber"} →`;

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <style>{`
          :root { color-scheme: light only; }
          html, body {
            background-color: ${OUTER} !important;
            color-scheme: light only;
          }
          .we-grid-img, .we-hero-img, .we-collection-img {
            width: 100% !important;
            height: auto !important;
            background-color: ${WELL} !important;
          }
          .we-grid-col {
            width: 50% !important;
            max-width: 50% !important;
            background-color: ${CANVAS} !important;
          }
          .we-outer { background-color: ${OUTER} !important; }
          .we-canvas, .we-cell { background-color: ${CANVAS} !important; }
          @media (prefers-color-scheme: dark) {
            html, body, .we-outer {
              background-color: ${OUTER} !important;
            }
            .we-canvas, .we-cell, .we-grid-col {
              background-color: ${CANVAS} !important;
            }
            .we-grid-img, .we-hero-img, .we-collection-img {
              background-color: ${WELL} !important;
            }
          }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="we-outer" style={main}>
        <Container className="we-canvas" style={container}>
          {isPreview ? (
            <Section style={{ margin: "0 0 24px", backgroundColor: CANVAS }} className="we-cell">
              <Text
                style={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  color: SLATE,
                  margin: "0",
                  textTransform: "uppercase" as const,
                }}
              >
                Preview — subscriber send Friday 10:00 AM Eastern / 4:00 PM Barcelona. Reply to request
                changes.
              </Text>
            </Section>
          ) : null}

          <Section className="we-cell" style={{ margin: "0 0 28px", backgroundColor: CANVAS }}>
            <Text style={wordmark}>INTERTEXE</Text>
          </Section>

          <Section className="we-cell" style={{ backgroundColor: CANVAS }}>
          <Heading as="h1" style={heading}>
            The Weekly Edit
          </Heading>
          <Text style={introText}>
            Pieces worth buying now, selected through a material-first lens.
          </Text>
          </Section>

          <Hr style={{ ...hr, margin: "24px 0 28px" }} />

          <Text style={kicker}>The Edit</Text>

          {hero ? (
            <>
              <Text style={sectionNav}>New to the edit</Text>
              <HeroProduct product={hero} />
              {gridItems.length ? <ProductGrid products={gridItems} /> : null}
            </>
          ) : null}

          <Hr style={hr} />

          <Section style={{ margin: "0 0 4px", backgroundColor: CANVAS }} className="we-cell">
            <Text style={collectionTitle}>{editTitle}</Text>
            {collectionImageUrl ? (
              <Link href={collectionUrl}>
                <Img
                  src={collectionImageUrl}
                  alt={editTitle}
                  width="560"
                  height="300"
                  className="we-collection-img"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "cover",
                    backgroundColor: WELL,
                  }}
                />
              </Link>
            ) : null}
            <Text style={collectionSublineText}>{collectionSubline}</Text>
            <Button href={collectionUrl} style={ghostButton}>
              Shop the edit →
            </Button>
          </Section>

          {saleItems.length ? (
            <>
              <Hr style={hr} />
              <Text style={sectionNav}>{saleSectionHeading(saleItems)}</Text>
              <ProductGrid products={saleItems} />
            </>
          ) : null}

          <Hr style={hr} />

          <Section className="we-cell" style={{ backgroundColor: CANVAS }}>
            <Text style={intelligenceKicker}>Material intelligence</Text>
            <Text style={intelligenceHeadline}>{intelligenceTitle.replace(/\.$/, "")}.</Text>
            <Text style={traitLine}>{traits.join(" · ")}</Text>
            <Text style={factText}>{compactFiberCopy(fiberFact)}</Text>
            <Button href={discoverHref} style={ghostButton}>
              {discoverLabel}
            </Button>
          </Section>

          <Hr style={hr} />

          <Section className="we-cell" style={{ backgroundColor: CANVAS, textAlign: "center" }}>
            <Row>
              <Column style={iconColumn}>
                <Link href={INTERTEXE_TIKTOK_URL} style={iconLink}>
                  <Img
                    src={EMAIL_ICONS.tiktok}
                    alt="TikTok"
                    width="28"
                    height="28"
                    style={iconImage}
                  />
                </Link>
              </Column>
              <Column style={iconColumn}>
                <Link href={INTERTEXE_INSTAGRAM_URL} style={iconLink}>
                  <Img
                    src={EMAIL_ICONS.instagram}
                    alt="Instagram"
                    width="28"
                    height="28"
                    style={iconImage}
                  />
                </Link>
              </Column>
              <Column style={iconColumn}>
                <Link href={appHref} style={iconLink}>
                  <Img
                    src={EMAIL_ICONS.app}
                    alt="App"
                    width="28"
                    height="28"
                    style={iconImage}
                  />
                </Link>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section className="we-cell" style={{ backgroundColor: CANVAS }}>
          <Text style={footer}>
            You are receiving The Weekly Edit because you joined Intertexe.{" "}
            <Link href="https://www.intertexe.com/account" style={footerLink}>
              Manage preferences
            </Link>
            {" · "}
            <Link href="https://www.intertexe.com" style={footerLink}>
              intertexe.com
            </Link>
            {" · "}
            <Link href="mailto:info@intertexe.com" style={footerLink}>
              info@intertexe.com
            </Link>
          </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
