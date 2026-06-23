"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const APP_FEATURES = [
  {
    id: "semantic",
    icon: "🧠",
    title: "Semantik İçerik Teknolojisi",
    description:
      "Yapay zeka algoritmalarının en çok referans gösterdiği sektörel veri yapılarını analiz eder ve markanız için optimize içerikler üretir.",
    optimizeHint:
      "Sektörünüzde en çok atıf alan konu kümelerini tespit edip markanıza özel semantik içerik haritası oluşturur.",
  },
  {
    id: "distribution",
    icon: "🌐",
    title: "Geniş Dağıtım Ağı",
    description:
      "Hazırlanan kurumsal rehber ve tavsiye metinlerini, arama motoru botlarının (crawler) düzenli ziyaret ettiği güvenli web ağlarında yayına alır.",
    optimizeHint:
      "İçerikler, botların düzenli taradığı güvenilir kaynaklara yerleştirilerek yapay zeka eğitim verisine organik erişim sağlar.",
  },
  {
    id: "radar",
    icon: "📡",
    title: "Otonom Analiz Radarı",
    description:
      "Yapay zeka modellerinin markanızı tavsiye etme durumunu arka planda düzenli olarak tarar ve görünürlük raporunuzu hazırlar.",
    footnote:
      "ChatGPT, Gemini ve Perplexity yanıtlarında marka görünürlüğünüz otomatik taranır; skorunuz panelde canlı güncellenir.",
    optimizeHint:
      "ChatGPT, Gemini ve Perplexity yanıtlarında marka görünürlüğünüz otomatik taranır; skorunuz panelde canlı güncellenir.",
  },
] as const;

export default function LandingAppFeatures() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <section className="pb-24 pt-4" id="features">
      <div className="mb-14 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
          Platform Yetenekleri
        </p>
        <h2 className="lf-orbitron mt-3 text-2xl font-bold text-white sm:text-3xl">
          Uygulama Özellikleri
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#94a3b8]">
          NexisAI, yapay zeka görünürlüğünü artırmak için semantik içerik
          üretiminden otonom dağıtıma ve canlı skor takibine kadar uçtan uca
          GEO altyapısı sunar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {APP_FEATURES.map((feature, index) => {
          const isExpanded = expandedId === feature.id;
          const delayClass =
            index === 0 ? "lf-feat-1" : index === 1 ? "lf-feat-2" : "lf-feat-3";

          return (
            <article
              key={feature.id}
              className={`lf-feature-glass lf-animate-in ${delayClass} group flex flex-col rounded-2xl p-[1px] opacity-0`}
            >
              <div className="lf-feature-inner relative flex h-full flex-col overflow-hidden rounded-[15px] p-7">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.1),transparent_70%)] transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.12),transparent_70%)]"
                  aria-hidden
                />

                <div className="lf-feature-icon mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-2xl">
                  {feature.icon}
                </div>

                <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#94a3b8]">
                  {feature.description}
                </p>

                {"footnote" in feature && feature.footnote ? (
                  <p className="mt-4 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] px-3 py-2.5 text-xs leading-relaxed text-cyan-100/70">
                    {feature.footnote}
                  </p>
                ) : null}

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => toggleExpand(feature.id)}
                    aria-expanded={isExpanded}
                    className="lf-feature-btn flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-violet-200 transition"
                  >
                    Nasıl Optimize Edilir?
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-cyan-400 transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`lf-feature-panel grid transition-all duration-300 ease-out ${
                      isExpanded
                        ? "mt-3 grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-xs leading-relaxed text-violet-100/80">
                        {feature.optimizeHint}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lf-feature-glow-line pointer-events-none absolute bottom-0 left-[8%] right-[8%] h-px" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
