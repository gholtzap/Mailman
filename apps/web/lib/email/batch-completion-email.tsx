import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Link,
  Hr,
  Heading,
  Preview,
  Img,
} from "@react-email/components";

interface PaperSummary {
  title: string;
  arxivId: string;
  source?: "arxiv" | "medrxiv";
  summary: string;
  url: string;
  externalUrl: string;
}

interface BatchCompletionEmailProps {
  scheduleName: string;
  papers: PaperSummary[];
  categories: string[];
  appUrl: string;
}

export function BatchCompletionEmail({
  scheduleName,
  papers,
  categories,
  appUrl,
}: BatchCompletionEmailProps) {
  const paperCount = papers.length;
  const pluralized = paperCount !== 1 ? "s" : "";

  return (
    <Html>
      <Head />
      <Preview>{`${paperCount} new paper${pluralized} in ${categories.join(", ")} -- here's what you need to know`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img
              src={`${appUrl}/mailman-logo.png`}
              alt="Mailman"
              width="48"
              height="48"
              style={logoImg}
            />
            <Heading style={h1}>Your {scheduleName} Digest</Heading>
            <Text style={subtitle}>{paperCount} fresh paper{pluralized} just processed</Text>
          </Section>

          <Section style={statsBox}>
            <Text style={statsCount}>
              {paperCount} paper{pluralized}
            </Text>
            <Text style={statsLabel}>processed</Text>
            <Text style={statsCategories}>{categories.join(", ")}</Text>
          </Section>

          <Section style={papersSection}>
            {papers.map((paper) => (
              <Section key={paper.arxivId} style={paperCard}>
                <Heading as="h3" style={paperTitle}>
                  {paper.title}
                </Heading>
                <Text style={paperIdRow}>
                  <span style={sourceBadge}>
                    {paper.source === "medrxiv" ? "medRxiv" : "arXiv"}
                  </span>
                  {" "}
                  <Link href={paper.externalUrl} style={idLink}>
                    {paper.arxivId}
                  </Link>
                </Text>
                <Text style={paperSummary}>{paper.summary}</Text>
                <Button style={viewButton} href={paper.url}>
                  View Full Summary
                </Button>
              </Section>
            ))}
          </Section>

          <Hr style={divider} />

          <Section style={footerSection}>
            <Text style={footerText}>
              You received this email because you have a recurring schedule set
              up in{" "}
              <Link href={appUrl} style={footerLink}>
                Mailman
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function generateBatchCompletionText(
  scheduleName: string,
  papers: PaperSummary[],
  categories: string[]
): string {
  const papersList = papers
    .map(
      (paper, index) => `
${index + 1}. ${paper.title}
   [${paper.source === "medrxiv" ? "medRxiv" : "arXiv"}] ${paper.arxivId}
   ${paper.externalUrl}

   ${paper.summary}

   View full summary: ${paper.url}
`
    )
    .join("\n");

  return `
Your ${scheduleName} Digest
${papers.length} fresh paper${papers.length !== 1 ? "s" : ""} in ${categories.join(", ")}

${papersList}

---
You received this email because you have a recurring schedule set up in Mailman.
  `.trim();
}

const body = {
  margin: "0",
  padding: "0",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  backgroundColor: "#f4f4f5",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0",
  backgroundColor: "#ffffff",
};

const headerSection = {
  textAlign: "center" as const,
  padding: "32px 24px 24px",
  backgroundColor: "#0f1117",
};

const logoImg = {
  margin: "0 auto 16px",
};

const h1 = {
  margin: "0 0 6px 0",
  fontSize: "22px",
  fontWeight: "700",
  color: "#ffffff",
};

const subtitle = {
  margin: "0",
  fontSize: "14px",
  color: "#71717a",
};

const statsBox = {
  margin: "24px 24px 0",
  padding: "20px",
  backgroundColor: "#f4f4f5",
  borderRadius: "6px",
  border: "1px solid #e4e4e7",
  textAlign: "center" as const,
};

const statsCount = {
  margin: "0",
  fontSize: "32px",
  fontWeight: "700",
  color: "#18181b",
  lineHeight: "1.2",
};

const statsLabel = {
  margin: "0 0 12px 0",
  fontSize: "14px",
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const statsCategories = {
  margin: "0",
  fontSize: "13px",
  color: "#3f3f46",
  fontFamily: "monospace",
};

const papersSection = {
  padding: "24px 24px 8px",
};

const paperCard = {
  marginBottom: "16px",
  padding: "16px",
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  border: "1px solid #e4e4e7",
  borderLeft: "3px solid #a51c30",
};

const paperTitle = {
  margin: "0 0 8px 0",
  fontSize: "15px",
  fontWeight: "600",
  color: "#18181b",
};

const sourceBadge = {
  display: "inline-block" as const,
  padding: "2px 8px",
  backgroundColor: "#f4f4f5",
  borderRadius: "10px",
  fontSize: "11px",
  fontWeight: "600" as const,
  color: "#52525b",
};

const idLink = {
  color: "#71717a",
  fontFamily: "monospace",
  fontSize: "12px",
  textDecoration: "none",
};

const paperIdRow = {
  margin: "0 0 10px 0",
  fontSize: "13px",
};

const paperSummary = {
  margin: "0 0 14px 0",
  fontSize: "14px",
  lineHeight: "1.7",
  color: "#3f3f46",
};

const viewButton = {
  display: "inline-block",
  padding: "8px 16px",
  backgroundColor: "#a51c30",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: "500",
};

const divider = {
  borderColor: "#e4e4e7",
  margin: "0 24px",
};

const footerSection = {
  textAlign: "center" as const,
  padding: "16px 24px 24px",
};

const footerText = {
  margin: "0",
  fontSize: "13px",
  color: "#71717a",
};

const footerLink = {
  color: "#a51c30",
  textDecoration: "none",
};
