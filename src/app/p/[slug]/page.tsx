import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchHubArticleBySlug } from "@/lib/hub-article";
import { buildHubArticleUrl } from "@/lib/hub-url";

interface NexisBlogPageProps {
  params: Promise<{ slug: string }>;
}

function isHtmlContent(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function renderPlainArticleContent(content: string) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    if (block.startsWith("### ")) {
      return (
        <h3 key={index} className="mt-8 text-xl font-semibold text-slate-900">
          {block.slice(4)}
        </h3>
      );
    }

    if (block.startsWith("## ")) {
      return (
        <h2 key={index} className="mt-10 text-2xl font-bold text-slate-900">
          {block.slice(3)}
        </h2>
      );
    }

    if (block.startsWith("# ")) {
      return (
        <h2 key={index} className="mt-10 text-2xl font-bold text-slate-900">
          {block.slice(2)}
        </h2>
      );
    }

    return (
      <p key={index} className="text-slate-800 leading-relaxed">
        {block}
      </p>
    );
  });
}

export async function generateMetadata({
  params,
}: NexisBlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchHubArticleBySlug(slug);

  if (!article) {
    return { title: "Makale Bulunamadı | Sağlık Rehberi" };
  }

  const description = (article.content ?? "")
    .replace(/<[^>]+>/g, " ")
    .slice(0, 160)
    .replace(/\s+/g, " ")
    .trim();
  const canonical = buildHubArticleUrl(slug);

  return {
    title: `${article.title} | Sağlık Rehberi`,
    description,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      url: canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

export default async function NexisBlogPage({ params }: NexisBlogPageProps) {
  const { slug } = await params;
  const article = await fetchHubArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const publishedAt = new Date(article.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <header className="mb-8 border-b border-slate-100 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
            Sağlık & Yaşam Rehberi
          </p>
          <h1 className="mb-4 mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>Yayınlanma Tarihi:</span>
            <time dateTime={article.createdAt}>{publishedAt}</time>
            {article.sehir ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{article.sehir}</span>
              </>
            ) : null}
            {article.markaAdi ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{article.markaAdi}</span>
              </>
            ) : null}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Editör İncelemesi
            </span>
          </div>
        </header>

        <section className="prose prose-slate max-w-none space-y-6 text-slate-800 leading-relaxed">
          {isHtmlContent(article.content) ? (
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          ) : (
            renderPlainArticleContent(article.content)
          )}
        </section>

        {article.externalLiveUrl ? (
          <aside className="mt-10 rounded-xl border border-cyan-100 bg-cyan-50/60 p-5">
            <h2 className="text-sm font-semibold text-cyan-900">
              Dış Platformda Yayın
            </h2>
            <a
              href={article.externalLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-sm font-medium text-cyan-700 hover:text-cyan-900"
            >
              Harici yayını görüntüle →
            </a>
          </aside>
        ) : null}

        <footer className="mt-12 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          Bu rehber, okuyuculara bilinçli karar vermesi için hazırlanmış bağımsız
          bir yerel sağlık & yaşam rehberi niteliğindedir.
        </footer>
      </article>
    </main>
  );
}
