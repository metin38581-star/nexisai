import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buildForumHubDescription,
  buildForumQaPageJsonLd,
} from "@/lib/forum-hub-json-ld";
import { buildForumHubUrl } from "@/lib/forum-hub-url";
import { fetchQuestionHubBySlug } from "@/lib/question-hub-store";

interface ForumHubPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: ForumHubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const hub = await fetchQuestionHubBySlug(slug);

  if (!hub) {
    return {
      title: "Soru bulunamadı | NEXISAI Forum",
    };
  }

  const description = buildForumHubDescription(
    hub.question,
    hub.answers.length,
  );

  return {
    title: `${hub.question} | NEXISAI Forum`,
    description,
    alternates: {
      canonical: buildForumHubUrl(hub.slug),
    },
    openGraph: {
      title: hub.question,
      description,
      type: "website",
      url: buildForumHubUrl(hub.slug),
    },
  };
}

export default async function ForumHubPage({ params }: ForumHubPageProps) {
  const { slug } = await params;
  const hub = await fetchQuestionHubBySlug(slug);

  if (!hub) {
    notFound();
  }

  const jsonLd = buildForumQaPageJsonLd({
    slug: hub.slug,
    question: hub.question,
    answers: hub.answers,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
            NEXISAI Forum
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {hub.question}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {hub.answers.length} yanıt
          </p>
        </header>

        <section className="mt-6 space-y-4">
          {hub.answers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              Henüz yanıt yok. İlk tavsiyeler yakında burada görünecek.
            </div>
          ) : (
            hub.answers.map((answer) => (
              <article
                key={answer.id}
                className={`rounded-xl border bg-white p-5 shadow-sm ${
                  answer.isFeatured
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                      {answer.username.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {answer.username}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatRelativeDate(answer.createdAt)}
                      </p>
                    </div>
                  </div>
                  {answer.isFeatured ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Öne çıkan tavsiye
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
                  {answer.content}
                </p>

                {answer.upvotes > 0 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {answer.upvotes} kişi faydalı buldu
                  </p>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
