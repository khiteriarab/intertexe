import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface SaleAlertEmailProps {
  productName: string;
  brandName: string;
  originalPrice: number | null;
  salePrice: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  naturalFiberPercent: number;
}

export default function SaleAlertEmail({
  productName,
  brandName,
  originalPrice,
  salePrice,
  currency,
  imageUrl,
  productUrl,
  naturalFiberPercent,
}: SaleAlertEmailProps) {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return (
    <Html>
      <Head />
      <Preview>A sale on INTERTEXE</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandName}>INTERTEXE</Text>
          </Section>
          <Hr style={styles.divider} />
          <Section style={styles.section}>
            <Text style={styles.label}>SALE</Text>
            <Heading style={styles.heading}>A sale on INTERTEXE.</Heading>
          </Section>
          <Section style={{ padding: "0 40px 40px" }}>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ width: "140px", verticalAlign: "top" }}>
                    {imageUrl ? (
                      <Img
                        src={imageUrl}
                        width="130"
                        height="173"
                        alt={productName}
                        style={{ objectFit: "cover", display: "block" }}
                      />
                    ) : null}
                  </td>
                  <td style={{ paddingLeft: "20px", verticalAlign: "top" }}>
                    <Text style={styles.productBrand}>{String(brandName || "").toUpperCase()}</Text>
                    <Text style={styles.productName}>{productName}</Text>
                    <Text style={styles.nfp}>{Math.round(naturalFiberPercent || 0)}% natural fiber</Text>
                    <Text style={styles.priceNew}>
                      {symbol}
                      {Math.round(salePrice).toLocaleString()}
                    </Text>
                    {originalPrice && originalPrice > salePrice ? (
                      <Text style={styles.priceOld}>
                        {symbol}
                        {Math.round(originalPrice).toLocaleString()}
                      </Text>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
            <Section style={{ paddingTop: "24px" }}>
              <Link href={productUrl} style={styles.button}>
                View on INTERTEXE
              </Link>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  main: { backgroundColor: "#FAFAF8", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  container: { margin: "0 auto", maxWidth: "560px", backgroundColor: "#FFFFFF" },
  header: { textAlign: "center" as const, padding: "36px 40px 28px" },
  brandName: { fontSize: "12px", letterSpacing: "6px", color: "#1C2B2A", fontWeight: "300", margin: "0" },
  divider: { borderColor: "#F2F2F2", margin: "0" },
  section: { padding: "40px 40px 16px" },
  label: { fontSize: "9px", letterSpacing: "3px", color: "#AAAAAA", margin: "0 0 16px" },
  heading: {
    fontFamily: "Georgia, serif",
    fontSize: "26px",
    fontWeight: "300",
    color: "#1C2B2A",
    lineHeight: "1.3",
    margin: "0",
  },
  productBrand: { fontSize: "10px", letterSpacing: "2px", color: "#888", margin: "0 0 6px" },
  productName: { fontSize: "16px", color: "#1C2B2A", margin: "0 0 8px", fontWeight: "400" },
  nfp: { fontSize: "12px", color: "#666", margin: "0 0 10px" },
  priceNew: { fontSize: "18px", color: "#1C2B2A", margin: "0" },
  priceOld: { fontSize: "13px", color: "#999", textDecoration: "line-through", margin: "4px 0 0" },
  button: {
    display: "inline-block",
    backgroundColor: "#1d4734",
    color: "#fff",
    padding: "12px 20px",
    textDecoration: "none",
    fontSize: "11px",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
  },
};
