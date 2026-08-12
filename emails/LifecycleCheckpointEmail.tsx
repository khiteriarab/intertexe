import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface LifecycleCheckpointEmailProps {
  preview: string;
  hook: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  closing?: string;
}

/** Shared minimal template for Day 4 / 10 / 25 behavior-router emails. */
export default function LifecycleCheckpointEmail({
  preview,
  hook,
  body,
  ctaLabel,
  ctaUrl,
  closing,
}: LifecycleCheckpointEmailProps) {
  const hookLines = hook.split("\n").filter(Boolean);

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandName}>INTERTEXE</Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.section}>
            {hookLines.map((line, i) => (
              <Text key={i} style={i === 0 ? styles.greeting : styles.hook}>
                {line}
              </Text>
            ))}
            <Text style={styles.body}>{body}</Text>
          </Section>

          <Section style={{ ...styles.section, textAlign: "center" as const, paddingTop: 8 }}>
            <Link href={ctaUrl} style={styles.button}>
              {ctaLabel}
            </Link>
          </Section>

          {closing ? (
            <Section style={{ ...styles.section, paddingTop: 0 }}>
              <Text style={styles.closing}>{closing}</Text>
            </Section>
          ) : null}

          <Hr style={styles.divider} />

          <Section
            style={{
              ...styles.section,
              textAlign: "center" as const,
              paddingTop: 24,
              paddingBottom: 36,
            }}
          >
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
  greeting: {
    fontSize: "15px",
    color: "#444444",
    lineHeight: "1.7",
    margin: "0 0 12px",
    fontWeight: "300",
  },
  hook: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: "22px",
    color: "#1C2B2A",
    lineHeight: "1.4",
    margin: "0 0 20px",
    fontWeight: "300",
  },
  body: {
    fontSize: "15px",
    color: "#666666",
    lineHeight: "1.7",
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
  closing: {
    fontSize: "14px",
    color: "#1C2B2A",
    lineHeight: "1.6",
    margin: "8px 0 0",
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
