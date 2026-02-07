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
} from "@react-email/components";

interface PaperSummary {
  title: string;
  arxivId: string;
  summary: string;
  url: string;
}

interface BatchCompletionEmailProps {
  scheduleName: string;
  papers: PaperSummary[];
  categories: string[];
}

export function BatchCompletionEmail({
  scheduleName,
  papers,
  categories,
}: BatchCompletionEmailProps) {
  const paperCount = papers.length;
  const pluralized = paperCount !== 1 ? "s" : "";

  return (
    <Html>
      <Head />
      <Preview>{`${paperCount} paper summary${pluralized} ready from ${scheduleName}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={h1}>Paper Summaries Ready</Heading>
            <Text style={subtitle}>Schedule: {scheduleName}</Text>
          </Section>

          <Section style={statsBox}>
            <Text style={statsTitle}>
              <strong>
                Processed {paperCount} paper{pluralized}
              </strong>{" "}
              from categories:
            </Text>
            <Text style={statsCategories}>{categories.join(", ")}</Text>
          </Section>

          <Section style={papersSection}>
            {papers.map((paper) => (
              <Section key={paper.arxivId} style={paperCard}>
                <Heading as="h3" style={paperTitle}>
                  {paper.title}
                </Heading>
                <Text style={paperArxivId}>{paper.arxivId}</Text>
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
              up in Mailman.
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
   ${paper.arxivId}

   ${paper.summary}

   View full summary: ${paper.url}
`
    )
    .join("\n");

  return `
Paper Summaries Ready
Schedule: ${scheduleName}

Processed ${papers.length} paper${papers.length !== 1 ? "s" : ""} from categories: ${categories.join(", ")}

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
  backgroundColor: "#ffffff",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "40px 20px",
};

const headerSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const h1 = {
  margin: "0 0 8px 0",
  fontSize: "24px",
  fontWeight: "700",
  color: "#111827",
};

const subtitle = {
  margin: "0",
  fontSize: "14px",
  color: "#6b7280",
};

const statsBox = {
  marginBottom: "24px",
  padding: "16px",
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  border: "1px solid #bfdbfe",
};

const statsTitle = {
  margin: "0 0 8px 0",
  fontSize: "14px",
  color: "#1e40af",
};

const statsCategories = {
  margin: "0",
  fontSize: "13px",
  color: "#3b82f6",
  fontFamily: "monospace",
};

const papersSection = {
  marginBottom: "32px",
};

const paperCard = {
  marginBottom: "24px",
  padding: "16px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const paperTitle = {
  margin: "0 0 8px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
};

const paperArxivId = {
  margin: "0 0 8px 0",
  fontSize: "13px",
  color: "#6b7280",
  fontFamily: "monospace",
};

const paperSummary = {
  margin: "0 0 12px 0",
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#374151",
};

const viewButton = {
  display: "inline-block",
  padding: "8px 16px",
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: "500",
};

const divider = {
  borderColor: "#e5e7eb",
  marginTop: "24px",
};

const footerSection = {
  textAlign: "center" as const,
};

const footerText = {
  margin: "0",
  fontSize: "13px",
  color: "#9ca3af",
};
