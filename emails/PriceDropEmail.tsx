import * as React from 'react'

type PriceDropEmailProps = {
  firstName: string
  productName: string
  brandName: string
  originalPrice: number
  newPrice: number
  currency: string
  imageUrl: string
  productUrl: string
  naturalFiberPercent: number
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

export default function PriceDropEmail(props: PriceDropEmailProps) {
  const {
    firstName,
    productName,
    brandName,
    originalPrice,
    newPrice,
    currency,
    imageUrl,
    productUrl,
    naturalFiberPercent,
  } = props

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#111', lineHeight: 1.5 }}>
      <h2 style={{ marginBottom: 8 }}>Price Drop Alert</h2>
      <p style={{ marginTop: 0 }}>
        {firstName ? `Hi ${firstName},` : 'Hi,'} one of your saved items just dropped in price.
      </p>
      <div style={{ border: '1px solid #eee', padding: 16, maxWidth: 520 }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={productName} style={{ width: '100%', maxWidth: 360, height: 'auto', marginBottom: 12 }} />
        ) : null}
        <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{brandName}</p>
        <p style={{ margin: '0 0 8px' }}>{productName}</p>
        <p style={{ margin: '0 0 4px' }}>
          Was: <s>{formatMoney(originalPrice, currency)}</s>
        </p>
        <p style={{ margin: '0 0 12px', fontWeight: 700 }}>
          Now: {formatMoney(newPrice, currency)}
        </p>
        <p style={{ margin: '0 0 12px' }}>Natural fiber score: {naturalFiberPercent}%</p>
        <a href={productUrl} style={{ color: '#fff', background: '#111', padding: '10px 16px', textDecoration: 'none', display: 'inline-block' }}>
          View item
        </a>
      </div>
    </div>
  )
}
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

export interface PriceDropEmailProps {
  firstName: string;
  productName: string;
  brandName: string;
  originalPrice: number;
  newPrice: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  naturalFiberPercent: number;
}

export default function PriceDropEmail({
  productName,
  brandName,
  originalPrice,
  newPrice,
  currency,
  imageUrl,
  productUrl,
  naturalFiberPercent,
}: PriceDropEmailProps) {
  const symbol = currency === "GBP" ? "£" : "$";
  const savingPercent = Math.round((1 - newPrice / originalPrice) * 100);

  return (
    <Html>
      <Head />
      <Preview>{`Price drop on your saved item — ${savingPercent}% off`}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandName}>INTERTEXE</Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.section}>
            <Text style={styles.label}>PRICE DROP</Text>
            <Heading style={styles.heading}>
              Something you saved just got {savingPercent}% cheaper.
            </Heading>
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
                    <Text style={styles.productBrand}>{brandName.toUpperCase()}</Text>
                    <Text style={styles.productName}>{productName}</Text>
                    <Text style={styles.nfp}>{naturalFiberPercent}% natural fiber</Text>
                    <Text style={styles.priceNew}>
                      {symbol}
                      {Math.round(newPrice).toLocaleString()}
                    </Text>
                    <Text style={styles.priceOld}>
                      was {symbol}
                      {Math.round(originalPrice).toLocaleString()}
                    </Text>
                    <Link href={productUrl} style={styles.shopLink}>
                      Shop now →
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={styles.divider} />

          <Section style={{ ...styles.section, textAlign: "center" as const }}>
            <Link href="https://www.intertexe.com/account" style={styles.button}>
              View all saved items
            </Link>
          </Section>

          <Hr style={styles.divider} />

          <Section style={{ ...styles.section, textAlign: "center" as const }}>
            <Text style={styles.footerTagline}>
              Intertexe earns a commission when you purchase through our links.
            </Text>
            <Text style={styles.footerLinks}>
              <Link href="https://www.intertexe.com" style={styles.footerLink}>
                intertexe.com
              </Link>
              {" · "}
              <Link href="https://www.intertexe.com/unsubscribe" style={styles.footerLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  main: {
    backgroundColor: "#FAFAF8",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: {
    margin: "0 auto",
    maxWidth: "560px",
    backgroundColor: "#FFFFFF",
  },
  header: {
    textAlign: "center" as const,
    padding: "36px 40px 28px",
  },
  brandName: {
    fontSize: "12px",
    letterSpacing: "6px",
    color: "#1C2B2A",
    fontWeight: "300",
    margin: "0",
  },
  divider: { borderColor: "#F2F2F2", margin: "0" },
  section: { padding: "40px" },
  label: {
    fontSize: "9px",
    letterSpacing: "3px",
    color: "#AAAAAA",
    margin: "0 0 16px",
    textTransform: "uppercase" as const,
  },
  heading: {
    fontFamily: "Georgia, serif",
    fontSize: "26px",
    fontWeight: "300",
    color: "#1C2B2A",
    lineHeight: "1.3",
    margin: "0",
  },
  productBrand: {
    fontSize: "9px",
    letterSpacing: "2px",
    color: "#1C2B2A",
    margin: "0 0 6px",
    fontWeight: "400",
  },
  productName: {
    fontSize: "14px",
    color: "#444444",
    lineHeight: "1.4",
    margin: "0 0 8px",
    fontWeight: "300",
  },
  nfp: {
    fontSize: "10px",
    color: "#0D9488",
    margin: "0 0 12px",
    letterSpacing: "0.5px",
  },
  priceNew: {
    fontSize: "20px",
    color: "#1C2B2A",
    fontWeight: "300",
    margin: "0 0 4px",
  },
  priceOld: {
    fontSize: "12px",
    color: "#AAAAAA",
    textDecoration: "line-through",
    margin: "0 0 16px",
  },
  shopLink: {
    fontSize: "11px",
    color: "#1C2B2A",
    letterSpacing: "1px",
    textDecoration: "underline",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#1C2B2A",
    color: "#FFFFFF",
    fontSize: "10px",
    letterSpacing: "2.5px",
    textTransform: "uppercase" as const,
    padding: "16px 44px",
    textDecoration: "none",
  },
  footerTagline: {
    fontSize: "10px",
    color: "#CCCCCC",
    margin: "0 0 8px",
  },
  footerLinks: {
    fontSize: "11px",
    color: "#CCCCCC",
    margin: "0",
  },
  footerLink: {
    color: "#BBBBBB",
    textDecoration: "none",
  },
};
