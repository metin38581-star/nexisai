import { resolveSiteOrigin } from "@/lib/site-origin";

export interface ForumQaJsonLdInput {
  slug: string;
  question: string;
  answers: Array<{
    username: string;
    content: string;
    createdAt: string;
    upvotes: number;
  }>;
}

export function buildForumQaPageJsonLd(input: ForumQaJsonLdInput): object {
  const pageUrl = `${resolveSiteOrigin()}/forum/${encodeURIComponent(input.slug)}`;

  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: input.question,
      text: input.question,
      answerCount: input.answers.length,
      dateCreated: input.answers[0]?.createdAt,
      suggestedAnswer: input.answers.map((answer) => ({
        "@type": "Answer",
        text: answer.content,
        upvoteCount: answer.upvotes,
        dateCreated: answer.createdAt,
        author: {
          "@type": "Person",
          name: answer.username,
        },
      })),
    },
    url: pageUrl,
  };
}

export function buildForumHubDescription(
  question: string,
  answerCount: number,
): string {
  if (answerCount === 0) {
    return `${question} — topluluk tavsiyeleri ve deneyim paylaşımları.`;
  }

  return `${question} — ${answerCount} kullanıcı yanıtı ve yerel tavsiyeler.`;
}
