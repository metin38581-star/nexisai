import Link from "next/link";

import { buildHubArticlePath } from "@/lib/hub-url";

export default function BlogPostPendingFallback({ slug }: { slug: string }) {
  const hubPath = buildHubArticlePath(slug);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
          NexisAI Blog
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          İçerik Hazırlanıyor
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Bu makale henüz indekslenmemiş veya dağıtım tamamlanmamış olabilir.
          Birkaç dakika sonra tekrar deneyin.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={hubPath}
            className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            Hub sürümünü aç
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
