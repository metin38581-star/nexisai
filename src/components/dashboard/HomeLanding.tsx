"use client";

import Image from "next/image";
import Link from "next/link";
import { WELCOME_BALANCE_TL, formatWelcomeBalanceStat } from "@/lib/wallet-constants";
import { Orbitron } from "next/font/google";
import { ArrowRight } from "lucide-react";

import FuturisticScene3D from "@/components/landing/FuturisticScene3D";
import LandingAppFeatures from "@/components/landing/LandingAppFeatures";
import "@/components/landing/landing-futuristic.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-orbitron",
});

const OPTIMIZE_CARDS = [
  {
    step: "01",
    icon: "🎯",
    title: "Hedef Soru Tespiti",
    description:
      "Sektörünüze özel en kritik yapay zeka sorguları analiz edilir. \"İzmir'deki en iyi diş kliniği hangisi?\" gibi sorular otomatik belirlenir ve içerik stratejiniz buna göre şekillenir.",
  },
  {
    step: "02",
    icon: "⚡",
    title: "Semantik İçerik Yayını",
    description:
      "Yapay zeka motorlarının okuduğu semantik içerikler otonom olarak üretilir ve WordPress, Telegra.ph, GitHub Radar ve Nostr gibi çoklu kanallara eş zamanlı dağıtılır.",
  },
  {
    step: "03",
    icon: "📈",
    title: "Görünürlük & Skor Takibi",
    description:
      "Her hedef soru için önerilme oranınız canlı panelde izlenir. Canlı LLM simülasyonu ile markanızın yapay zeka yanıtlarında nasıl geçtiğini anında görün.",
  },
] as const;

export default function HomeLanding() {
  return (
    <div className={`landing-futuristic min-h-screen bg-[#050505] ${orbitron.variable}`}>
      <FuturisticScene3D />
      <div className="lf-grid-overlay" aria-hidden />
      <div className="lf-vignette" aria-hidden />

      <div className="lf-page mx-auto max-w-7xl px-6 lg:px-8">
        {/* Nav */}
        <nav className="lf-animate-in flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="NexisAI"
              width={160}
              height={40}
              className="h-10 w-auto drop-shadow-[0_0_12px_rgba(139,92,246,0.55)]"
              priority
            />
            <span className="lf-orbitron lf-logo-text text-lg font-bold tracking-[0.12em]">
              NEXIS AI
            </span>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-violet-500/40 bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-[#e2e8f0] shadow-[0_0_20px_rgba(139,92,246,0.15)] transition hover:border-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.55)]"
          >
            Panele Git →
          </Link>
        </nav>

        {/* Hero */}
        <section className="grid min-h-[calc(100vh-100px)] items-center gap-12 pb-16 pt-4 lg:grid-cols-2">
          <div className="max-w-xl">
            <div className="lf-animate-in lf-animate-in-1 mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
              <span className="lf-badge-dot h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
              GEO · Semantik Optimizasyon
            </div>

            <h1 className="lf-animate-in lf-animate-in-2 lf-orbitron text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              <span className="lf-title-gradient">
                Semantik İçerik Teknolojisi
              </span>{" "}
              ile Yapay Zekada Görünürlüğünüzü Artırın
            </h1>

            <p className="lf-animate-in lf-animate-in-3 mt-5 text-base leading-relaxed text-[#94a3b8] sm:text-lg">
              NexisAI, işletmenizi ChatGPT, Gemini ve Perplexity gibi yapay zeka
              motorlarında öne çıkarmak için semantik içerik ağları kurar.
              Otonom dağıtım, hedef soru analizi ve canlı görünürlük skorları —
              hepsi tek panelde.
            </p>

            <div className="lf-animate-in lf-animate-in-4 mt-8 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="lf-btn-primary relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(139,92,246,0.55),0_0_80px_rgba(6,182,212,0.2)]"
              >
                <span className="relative z-10">Hemen Başla</span>
                <ArrowRight className="relative z-10 h-4 w-4" />
              </Link>
              <a
                href="#optimize"
                className="rounded-xl border border-slate-700/40 bg-white/[0.03] px-7 py-4 text-sm font-semibold text-[#94a3b8] transition hover:border-cyan-500/40 hover:text-[#e2e8f0] hover:shadow-[0_0_24px_rgba(6,182,212,0.1)]"
              >
                Nasıl Çalışır?
              </a>
            </div>

            <div className="lf-animate-in lf-animate-in-5 mt-10 flex flex-wrap gap-8">
              <div>
                <p className="lf-orbitron lf-stat-value text-2xl font-bold text-cyan-400">
                  {formatWelcomeBalanceStat()}
                </p>
                <p className="mt-1 text-xs tracking-wide text-[#94a3b8]">
                  Ücretsiz Deneme
                </p>
              </div>
              <div>
                <p className="lf-orbitron lf-stat-value text-2xl font-bold text-cyan-400">
                  3+
                </p>
                <p className="mt-1 text-xs tracking-wide text-[#94a3b8]">
                  AI Motoru
                </p>
              </div>
              <div>
                <p className="lf-orbitron lf-stat-value text-2xl font-bold text-cyan-400">
                  7/24
                </p>
                <p className="mt-1 text-xs tracking-wide text-[#94a3b8]">
                  Otonom Dağıtım
                </p>
              </div>
            </div>
          </div>

          <div
            className="hidden min-h-[320px] lg:block"
            aria-hidden
          />
        </section>

        {/* Optimize */}
        <section className="pb-20 pt-8" id="optimize">
          <div className="lf-animate-in mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400 shadow-[0_0_16px_rgba(139,92,246,0.55)]">
              Optimizasyon Akışı
            </p>
            <h2 className="lf-orbitron mt-3 text-2xl font-bold text-white sm:text-3xl">
              Nasıl Optimize Edilir?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#94a3b8]">
              Üç adımda işletmeniz yapay zeka arama sonuçlarında semantik
              olarak konumlandırılır ve görünürlük skorunuz gerçek zamanlı
              izlenir.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {OPTIMIZE_CARDS.map((card, index) => {
              const delayClass =
                index === 0 ? "lf-card-1" : index === 1 ? "lf-card-2" : "lf-card-3";
              return (
              <article
                key={card.step}
                className={`lf-animate-in lf-card-border ${delayClass} rounded-[20px] p-[2px] opacity-0 transition hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(139,92,246,0.25),0_0_40px_rgba(6,182,212,0.15)]`}
              >
                <div className="relative h-full overflow-hidden rounded-[18px] bg-[rgba(8,8,12,0.92)] p-8 backdrop-blur-md">
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.12),transparent_70%)]"
                    aria-hidden
                  />
                  <p className="lf-orbitron lf-step-num text-4xl font-extrabold opacity-35">
                    {card.step}
                  </p>
                  <div className="mb-5 mt-4 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-2xl shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                    {card.description}
                  </p>
                  <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
                </div>
              </article>
              );
            })}
          </div>
        </section>

        <LandingAppFeatures />

        {/* CTA */}
        <div className="lf-animate-in lf-animate-in-2 relative mb-16 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 px-6 py-12 text-center sm:px-10">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_70%)]"
            aria-hidden
          />
          <h2 className="lf-orbitron relative text-xl font-bold text-white sm:text-2xl">
            {WELCOME_BALANCE_TL.toLocaleString("tr-TR")} ₺ Hediye Bakiye ile Hemen Deneyin
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-[#94a3b8]">
            Kayıt olun, OTP ile doğrulayın ve ilk GEO kampanyanızı dakikalar
            içinde başlatın.
          </p>
          <Link
            href="/dashboard"
            className="lf-btn-primary relative mt-6 inline-flex items-center gap-2 overflow-hidden rounded-xl px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5"
          >
            <span className="relative z-10">Kampanyayı Başlat</span>
            <ArrowRight className="relative z-10 h-4 w-4" />
          </Link>
        </div>

        <footer className="border-t border-white/5 py-8 text-center text-xs text-[#94a3b8]">
          © {new Date().getFullYear()} NexisAI · Semantik İçerik Teknolojisi
        </footer>
      </div>
    </div>
  );
}
