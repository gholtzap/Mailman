export const READ_PAPER_PROMPT = `Rewrite this research paper for a mid-level software engineer with limited AI research background.

AUDIENCE CONTEXT:
- Technical foundation: strong programming skills, CS fundamentals
- AI knowledge: familiar with basic ML concepts (training, models) but not deep research terminology
- Goal: understand the core ideas and implications, not memorize jargon

OUTPUT REQUIREMENTS:

Structure:
- Lead with the main insight in 2-3 sentences
- Explain the problem being solved and why it matters
- Cover the key approach/method using accessible analogies
- Include important results and their significance
- End with broader implications

Technical level:
- Replace research jargon with clearer terms (define specialized terms when first used)
- Use concrete examples over abstract formulations
- Explain "how it works" conceptually, not implementation details
- Preserve all quantitative results and experimental findings

DO NOT:
- Include code samples or pseudocode
- Over-explain fundamental concepts (assume CS degree knowledge)
- Frame insights as "what this means for developers" - keep it general
- Simplify to the point of losing accuracy

TONE:
- Clear and direct, like a senior engineer explaining over coffee
- Confident but not condescending
- Focus on insight, not marketing hype`;
