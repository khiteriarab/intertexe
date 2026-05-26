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

export type WeeklyEditEmailProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  url: string;
  naturalFiberPercent: number;
};

export interface WeeklyEditEmailProps {
  weekNumber?: number;
  products: WeeklyEditEmailProduct[];
  collectionName: string;
  collectionUrl: string;
  collectionSubline: string;
  fiberFact: string;
  fiberFactFiber: string;
  isPreview?: boolean;
}

const main = {
  backgroundColor: "#F8FAF9",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const container = {
  margin: "0 auto",
  padding: "48px 32px",
  maxWidth: "580px",
};

const kicker = {
  fontSize: "11px",
  letterSpacing: "0.2em",
  color: "#0D9488",
  margin: "0 0 32px",
  textTransform: "uppercase" as const,
};

const heading = {
  fontSize: "28px",
  color: "#1C2B2A",
  fontWeight: "normal" as const,
  margin: "0 0 12px",
  lineHeight: "1.25",
};

const introText = {
  color: "#64748B",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 32px",
};

const sectionLabel = {
  fontSize: "10px",
  letterSpacing: "0.18em",
  color: "#64748B",
  textTransform: "uppercase" as const,
  margin: "0 0 16px",
};

const productRow = {
  marginBottom: "24px",
};

const productImage = {
  width: "100px",
  height: "130px",
  objectFit: "cover" as const,
  backgroundColor: "#F1F5F9",
};

const brandText = {
  fontSize: "9px",
  letterSpacing: "0.14em",
  color: "#64748B",
  textTransform: "uppercase" as const,
  margin: "0 0 4px",
};

const productName = {
  fontSize: "15px",
  color: "#1C2B2A",
  margin: "0 0 8px",
  lineHeight: "1.35",
};

const productMeta = {
  fontSize: "13px",
  color: "#64748B",
  margin: "0",
};

const productLink = {
  color: "#1C2B2A",
  textDecoration: "none",
};

const collectionBox = {
  backgroundColor: "#ffffff",
  border: "1px solid #E2E8F0",
  padding: "24px",
  margin: "32px 0",
};

const collectionTitle = {
  fontSize: "20px",
  color: "#1C2B2A",
  fontWeight: "normal" as const,
  margin: "0 0 8px",
};

const collectionSublineText = {
  fontSize: "14px",
  color: "#64748B",
  lineHeight: "1.55",
  margin: "0 0 16px",
};

const factBox = {
  backgroundColor: "#ffffff",
  borderLeft: "3px solid #0D9488",
  padding: "20px 24px",
  margin: "32px 0",
};

const factFiber = {
  fontSize: "10px",
  letterSpacing: "0.15em",
  color: "#0D9488",
  textTransform: "uppercase" as const,
  margin: "0 0 10px",
};

const factText = {
  fontSize: "14px",
  color: "#1C2B2A",
  lineHeight: "1.6",
  margin: "0",
};

const button = {
  backgroundColor: "#1C2B2A",
  color: "#ffffff",
  padding: "14px 28px",
  textDecoration: "none",
  fontSize: "13px",
  letterSpacing: "0.1em",
  display: "inline-block",
};

const footer = {
  color: "#94A3B8",
  fontSize: "11px",
  margin: "48px 0 0",
  letterSpacing: "0.05em",
};

const footerLink = {
  color: "#94A3B8",
  textDecoration: "none",
};

const hr = {
  borderColor: "#E2E8F0",
  margin: "32px 0",
};

function formatPrice(price: number, currency: string): string {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function WeeklyEditEmail({
  weekNumber,
  products,
  collectionName,
  collectionUrl,
  collectionSubline,
  fiberFact,
  fiberFactFiber,
  isPreview = false,
}: WeeklyEditEmailProps) {
  const preview = `${isPreview ? "[PREVIEW — APPROVE BY MIDNIGHT] " : ""}The Intertexe Edit — ${collectionName} and ${products.length} verified pieces`;
  const editLabel =
    typeof weekNumber === "number" ? `Week ${weekNumber}` : "This week";

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {isPreview ? (
            <Section
              style={{
                backgroundColor: "#FEF3C7",
                padding: "12px 20px",
              }}
            >
              <Text
                style={{
                  fontSize: "11px",
                  color: "#92400E",
                  margin: "0",
                  textAlign: "center",
                }}
              >
                THURSDAY PREVIEW — This email sends Friday at 9am unless you flag an issue. Reply to
                this email to request changes.
              </Text>
            </Section>
          ) : null}
          <Text style={kicker}>INTERTEXE · THE MATERIAL STANDARD</Text>

          <Heading as="h1" style={heading}>
            The Weekly Edit
          </Heading>

          <Text style={introText}>
            {editLabel}: eight verified natural-fiber pieces we love right now —
            new arrivals, buying context, and price drops worth your attention.
          </Text>

          <Text style={sectionLabel}>This week&apos;s picks</Text>

          {products.map((product) => (
            <Section key={product.id} style={productRow}>
              <Row>
                <Column style={{ width: "100px", verticalAlign: "top" }}>
                  <Link href={product.url}>
                    <Img
                      src={product.imageUrl}
                      alt={`${product.brand} ${product.name}`}
                      width="100"
                      height="130"
                      style={productImage}
                    />
                  </Link>
                </Column>
                <Column style={{ paddingLeft: "16px", verticalAlign: "top" }}>
                  <Text style={brandText}>{product.brand}</Text>
                  <Link href={product.url} style={productLink}>
                    <Text style={productName}>{product.name}</Text>
                  </Link>
                  <Text style={productMeta}>
                    {formatPrice(product.price, product.currency)}
                    {" · "}
                    {product.naturalFiberPercent}% natural fiber
                  </Text>
                </Column>
              </Row>
            </Section>
          ))}

          <Section style={collectionBox}>
            <Text style={sectionLabel}>Collection spotlight</Text>
            <Text style={collectionTitle}>{collectionName}</Text>
            <Text style={collectionSublineText}>{collectionSubline}</Text>
            <Button href={collectionUrl} style={button}>
              VIEW COLLECTION
            </Button>
          </Section>

          <Section style={factBox}>
            <Text style={factFiber}>Fiber fact · {fiberFactFiber}</Text>
            <Text style={factText}>{fiberFact}</Text>
          </Section>

          <Section style={{ margin: "0 0 8px" }}>
            <Button href="https://www.intertexe.com/shop" style={button}>
              SHOP ALL VERIFIED PIECES
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You are receiving The Weekly Edit because you joined Intertexe.
            {" "}
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
        </Container>
      </Body>
    </Html>
  );
}
