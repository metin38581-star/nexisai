import "server-only";

/** HTML paragraflarını Telegra.ph Node[] formatına dönüştürür. */
export function htmlToTelegraphNodes(html: string): Array<{
  tag: string;
  children: string[];
}> {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n");

  const blocks = cleaned
    .split(/<\/?(?:p|div|h[1-6]|li|article|section)[^>]*>/gi)
    .map(stripHtmlTags)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    const fallback = stripHtmlTags(cleaned).trim();
    return fallback ? [{ tag: "p", children: [fallback] }] : [{ tag: "p", children: [" "] }];
  }

  return blocks.map((text) => ({ tag: "p", children: [text] }));
}

/** Basit HTML → Markdown dönüşümü (GitHub .md yemi için). */
export function htmlToMarkdown(html: string, title: string): string {
  let md = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  md = stripHtmlTags(md).replace(/\n{3,}/g, "\n\n").trim();

  return `# ${title}\n\n${md}`;
}

export function buildRadarMarkdownDocument(input: {
  title: string;
  htmlContent: string;
  slug: string;
  hubUrl?: string;
  wordpressUrl?: string;
}): string {
  const body = htmlToMarkdown(input.htmlContent, input.title);
  const links: string[] = [];

  if (input.hubUrl) {
    links.push(`- [NexisAI Hub](${input.hubUrl})`);
  }
  if (input.wordpressUrl) {
    links.push(`- [WordPress](${input.wordpressUrl})`);
  }

  const linkBlock =
    links.length > 0 ? `\n\n## Bağlantılar\n\n${links.join("\n")}\n` : "";

  return `${body}${linkBlock}\n\n---\n\n*Otonom LLM Radar yemi — NexisAI · slug: \`${input.slug}\`*\n`;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"');
}

/** Nostr kind:1 metni için kısa özet. */
export function buildNostrSummary(html: string, maxLength = 280): string {
  const plain = stripHtmlTags(html).replace(/\s+/g, " ").trim();
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength - 1)}…`;
}
