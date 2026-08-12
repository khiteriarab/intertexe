import * as React from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

export interface WelcomeEmailProps {
  firstName: string;
  /** Primary CTA — App Store URL until deep links are production-ready. */
  ctaUrl: string;
}

export default function WelcomeEmail({ firstName, ctaUrl }: WelcomeEmailProps) {
  const greeting = firstName?.trim()
    ? `Hi ${firstName.trim()},`
    : "Hi,";

  return (
    <Html>
      <Head />
      <Preview>
        I&apos;m Khiteri, the founder of INTERTEXE. Here&apos;s where to start.
      </Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandName}>INTERTEXE</Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.section}>
            <Text style={styles.body}>{greeting}</Text>
            <Text style={styles.body}>
              I&apos;m Khiteri, the founder of INTERTEXE. I built INTERTEXE because I wanted a
              better way to shop, one where what something is made of matters just as much as how it
              looks.
            </Text>
            <Text style={styles.body}>Now that you&apos;re in, here are three things to try:</Text>
          </Section>

          <Section style={{ ...styles.section, paddingTop: 0 }}>
            <Row style={{ marginBottom: "28px" }}>
              <Column>
                <Text style={styles.featureTitle}>SCAN BEFORE YOU BUY</Text>
                <Text style={styles.featureBody}>
                  Shopping in person? Scan a clothing label to see what it&apos;s actually made of
                  and discover better-fabric alternatives in your budget.
                </Text>
              </Column>
            </Row>

            <Row style={{ marginBottom: "28px" }}>
              <Column>
                <Text style={styles.featureTitle}>SHOP BY MATERIAL</Text>
                <Text style={styles.featureBody}>
                  Browse silk, linen, cotton, wool, cashmere and other natural-fabric pieces across
                  the brands you already shop.
                </Text>
              </Column>
            </Row>

            <Row style={{ marginBottom: "0" }}>
              <Column>
                <Text style={styles.featureTitle}>FIND THE BETTER VERSION</Text>
                <Text style={styles.featureBody}>
                  See something you love? INTERTEXE helps you discover similar pieces based on
                  fabric, style, color, silhouette and price.
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ ...styles.section, textAlign: "center" as const, paddingTop: 8 }}>
            <Link href={ctaUrl} style={styles.button}>
              Open INTERTEXE
            </Link>
          </Section>

          <Section style={{ ...styles.section, paddingTop: 0 }}>
            <Text style={styles.body}>
              We&apos;re still early, and I&apos;d genuinely love to know what you think. Just reply
              to this email. I read the responses.
            </Text>
            <Text style={styles.signature}>
              Khiteri
              <br />
              Founder, INTERTEXE
            </Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={{ ...styles.section, textAlign: "center" as const, paddingTop: 24, paddingBottom: 36 }}>
            <Text style={styles.footerLinks}>
              <Link href="https://www.intertexe.com/privacy" style={styles.footerLink}>
                Privacy
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
  divider: {
    borderColor: "#F2F2F2",
    margin: "0",
  },
  section: {
    padding: "36px 40px",
  },
  heading: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "28px",
    fontWeight: "300",
    color: "#1C2B2A",
    lineHeight: "1.3",
    margin: "0 0 20px",
  },
  body: {
    fontSize: "15px",
    color: "#444444",
    lineHeight: "1.7",
    margin: "0 0 16px",
    fontWeight: "300",
  },
  featureTitle: {
    fontSize: "11px",
    letterSpacing: "2px",
    color: "#1C2B2A",
    fontWeight: "500",
    margin: "0 0 8px",
  },
  featureBody: {
    fontSize: "14px",
    color: "#666666",
    lineHeight: "1.65",
    margin: "0",
    fontWeight: "300",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#1C2B2A",
    color: "#FFFFFF",
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    padding: "16px 40px",
    textDecoration: "none",
  },
  signature: {
    fontSize: "15px",
    color: "#1C2B2A",
    lineHeight: "1.6",
    margin: "24px 0 0",
    fontWeight: "300",
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
