import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface ScanFollowUpEmailProps {
  composition: string;
  naturalFiberPercent: number;
  verdict: string;
  alternativesUrl: string;
}

export default function ScanFollowUpEmail({
  composition,
  naturalFiberPercent,
  verdict,
  alternativesUrl,
}: ScanFollowUpEmailProps) {
  const verdictCopy = () => {
    if (naturalFiberPercent === 100) return "Exceptional. This piece is entirely natural fiber.";
    if (naturalFiberPercent >= 80) return "Good quality. Natural fiber dominant.";
    if (naturalFiberPercent >= 50) return "A blend. Better alternatives exist at a similar price.";
    return "Mostly synthetic. Here is what it should have been.";
  };

  const verdictColor =
    naturalFiberPercent >= 80 ? "#0D9488" : naturalFiberPercent >= 50 ? "#92400E" : "#DC2626";

  return (
    <Html>
      <Head />
      <Preview>Your scan result from Intertexe</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandName}>INTERTEXE</Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.section}>
            <Text style={styles.label}>YOUR SCAN RESULT</Text>
            <Heading style={styles.heading}>Here is what you scanned yesterday.</Heading>
            <Text style={styles.body}>
              You scanned a garment with the Intertexe scanner. Here is what we found.
            </Text>
          </Section>

          <Section style={{ padding: "0 40px 40px" }}>
            <Section
              style={{
                borderLeft: `3px solid ${verdictColor}`,
                paddingLeft: "20px",
              }}
            >
              <Text
                style={{
                  fontSize: "28px",
                  color: verdictColor,
                  fontWeight: "300",
                  margin: "0 0 8px",
                  fontFamily: "Georgia, serif",
                }}
              >
                {naturalFiberPercent}% natural fiber
              </Text>
              <Text
                style={{
                  fontSize: "13px",
                  color: "#666666",
                  margin: "0 0 8px",
                  fontWeight: "300",
                }}
              >
                {composition}
              </Text>
              <Text
                style={{
                  fontSize: "12px",
                  color: verdictColor,
                  margin: "0",
                  letterSpacing: "0.5px",
                }}
              >
                {verdictCopy()}
              </Text>
              {verdict ? (
                <Text style={{ fontSize: "12px", color: "#888888", margin: "12px 0 0" }}>
                  {verdict}
                </Text>
              ) : null}
            </Section>
          </Section>

          {naturalFiberPercent < 80 ? (
            <>
              <Hr style={styles.divider} />
              <Section style={styles.section}>
                <Text style={styles.label}>BETTER ALTERNATIVES</Text>
                <Text style={styles.body}>
                  We found natural fiber alternatives at a similar price. Create a free account to see
                  them.
                </Text>
                <Link href={alternativesUrl} style={styles.button}>
                  See alternatives
                </Link>
              </Section>
            </>
          ) : null}

          <Hr style={styles.divider} />

          <Section style={styles.section}>
            <Text style={styles.body}>
              Create a free Intertexe account to save your scan history, get price drop alerts on pieces
              you love, and receive a weekly edit of the best natural fiber fashion.
            </Text>
            <Link href="https://www.intertexe.com/account" style={styles.button}>
              Create free account
            </Link>
          </Section>

          <Hr style={styles.divider} />

          <Section style={{ ...styles.section, textAlign: "center" as const }}>
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
    margin: "0 0 16px",
  },
  body: {
    fontSize: "14px",
    color: "#666666",
    lineHeight: "1.7",
    margin: "0 0 20px",
    fontWeight: "300",
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
  footerLinks: {
    fontSize: "11px",
    color: "#CCCCCC",
    margin: "0",
    textAlign: "center" as const,
  },
  footerLink: {
    color: "#BBBBBB",
    textDecoration: "none",
  },
};
