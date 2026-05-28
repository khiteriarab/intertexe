import {
  Body,
  Column,
  Container,
  Head,
  Heading,
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
}

export default function WelcomeEmail({ firstName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Intertexe. Know what you are wearing.</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandName}>INTERTEXE</Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.section}>
            <Heading style={styles.heading}>
              Welcome{firstName ? `, ${firstName}` : ""}.
            </Heading>
            <Text style={styles.body}>
              You now have access to 84,704+ verified natural fiber pieces across 253 brands. Every
              composition checked. Every piece verified.
            </Text>
            <Text style={styles.body}>
              This is fashion the way it should be. You know exactly what you are wearing.
            </Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.section}>
            <Text style={styles.label}>GET STARTED</Text>

            <Row style={{ marginBottom: "20px" }}>
              <Column style={styles.numberCol}>
                <Text style={styles.number}>01</Text>
              </Column>
              <Column>
                <Text style={styles.featureTitle}>Use the scanner</Text>
                <Text style={styles.featureBody}>
                  Point your camera at any care label or price tag in any store. Know exactly what it
                  is made of in seconds.
                </Text>
              </Column>
            </Row>

            <Row style={{ marginBottom: "20px" }}>
              <Column style={styles.numberCol}>
                <Text style={styles.number}>02</Text>
              </Column>
              <Column>
                <Text style={styles.featureTitle}>Take the fabric quiz</Text>
                <Text style={styles.featureBody}>
                  One minute. Four questions. Your personal natural fiber identity and a curated brand
                  edit matched to how you want to feel in your clothes.
                </Text>
              </Column>
            </Row>

            <Row style={{ marginBottom: "0" }}>
              <Column style={styles.numberCol}>
                <Text style={styles.number}>03</Text>
              </Column>
              <Column>
                <Text style={styles.featureTitle}>Save what you love</Text>
                <Text style={styles.featureBody}>
                  Heart any piece to save it to your edit. We will tell you when the price drops.
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={styles.divider} />

          <Section style={{ ...styles.section, textAlign: "center" as const }}>
            <Link href="https://www.intertexe.com/shop" style={styles.button}>
              Start browsing
            </Link>
            <Text style={{ ...styles.small, marginTop: "16px" }}>
              or{" "}
              <Link href="https://apps.apple.com/app/id6770476520" style={styles.textLink}>
                download the iOS app
              </Link>
            </Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={{ ...styles.section, textAlign: "center" as const }}>
            <Text style={styles.footerTagline}>
              The destination for natural fiber fashion.
              <br />
              Every piece verified. Every brand vetted.
            </Text>
            <Text style={styles.footerLinks}>
              <Link href="https://www.intertexe.com" style={styles.footerLink}>
                intertexe.com
              </Link>
              {" · "}
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
    padding: "40px",
  },
  heading: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "30px",
    fontWeight: "300",
    color: "#1C2B2A",
    lineHeight: "1.3",
    margin: "0 0 20px",
  },
  body: {
    fontSize: "14px",
    color: "#666666",
    lineHeight: "1.7",
    margin: "0 0 12px",
    fontWeight: "300",
  },
  label: {
    fontSize: "9px",
    letterSpacing: "3px",
    color: "#AAAAAA",
    margin: "0 0 28px",
    textTransform: "uppercase" as const,
  },
  numberCol: {
    width: "44px",
    verticalAlign: "top" as const,
  },
  number: {
    fontSize: "10px",
    color: "#DDDDDD",
    margin: "2px 0 0",
    fontWeight: "300",
  },
  featureTitle: {
    fontSize: "13px",
    color: "#1C2B2A",
    fontWeight: "500",
    margin: "0 0 4px",
  },
  featureBody: {
    fontSize: "13px",
    color: "#888888",
    lineHeight: "1.6",
    margin: "0",
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
  textLink: {
    color: "#888888",
    textDecoration: "underline",
  },
  small: {
    fontSize: "12px",
    color: "#AAAAAA",
    margin: "0",
  },
  footerTagline: {
    fontSize: "11px",
    color: "#CCCCCC",
    lineHeight: "1.7",
    margin: "0 0 12px",
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
