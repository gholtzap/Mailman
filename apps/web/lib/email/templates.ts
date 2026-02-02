interface ProcessedPaperSummary {
  title: string;
  arxivId: string;
  summary: string;
  url: string;
}

export function generateBatchCompletionEmail(
  scheduleName: string,
  papers: ProcessedPaperSummary[],
  categories: string[]
): string {
  const papersList = papers
    .map(
      (paper) => `
    <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">
        ${paper.title}
      </h3>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-family: monospace;">
        ${paper.arxivId}
      </p>
      <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #374151;">
        ${paper.summary}
      </p>
      <a href="${paper.url}" style="display: inline-block; padding: 8px 16px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">
        View Full Summary
      </a>
    </div>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Paper Summaries are Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">
        Paper Summaries Ready
      </h1>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Schedule: ${scheduleName}
      </p>
    </div>

    <div style="margin-bottom: 24px; padding: 16px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af;">
        <strong>Processed ${papers.length} paper${papers.length !== 1 ? "s" : ""}</strong> from categories:
      </p>
      <p style="margin: 0; font-size: 13px; color: #3b82f6; font-family: monospace;">
        ${categories.join(", ")}
      </p>
    </div>

    <div style="margin-bottom: 32px;">
      ${papersList}
    </div>

    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        You received this email because you have a recurring schedule set up in Mailman.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateBatchCompletionTextEmail(
  scheduleName: string,
  papers: ProcessedPaperSummary[],
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
