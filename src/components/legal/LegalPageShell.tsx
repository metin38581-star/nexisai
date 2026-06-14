import Link from "next/link";
import BackgroundGlow from "@/components/layout/BackgroundGlow";
import CorporateFooter from "@/components/layout/CorporateFooter";
import Navbar from "@/components/layout/Navbar";
import type { LegalDocument } from "@/lib/legal-documents";

interface LegalPageShellProps {
  document: LegalDocument;
}

export default function LegalPageShell({ document }: LegalPageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-black text-white">
      <BackgroundGlow />
      <Navbar />

      <main className="relative z-10 flex-1 px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-violet-400"
          >
            ← Ana Sayfaya Dön
          </Link>

          <header className="mb-10 border-b border-slate-800/80 pb-8">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400/80">
              Yasal Metin
            </p>
            <h1 className="mt-2 bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {document.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {document.description}
            </p>
            <p className="mt-4 text-xs text-zinc-600">
              Son güncelleme: {document.lastUpdated}
            </p>
          </header>

          <article className="space-y-10">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-white">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.title}-${index}`}
                      className="text-sm leading-relaxed text-zinc-400"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <CorporateFooter />
    </div>
  );
}
