"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import AiRecommendationSimulator from "@/components/landing/AiRecommendationSimulator";
import RoiBudgetCalculator from "@/components/landing/RoiBudgetCalculator";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  {
    icon: "🧠",
    title: "Semantik İçerik Teknolojisi",
    description:
      "Yapay zeka algoritmalarının en çok referans gösterdiği sektörel veri yapılarını analiz eder ve markanız için optimize içerikler üretir.",
    hint: "Sektörünüzde en çok atıf alan konu kümelerini tespit edip markanıza özel semantik içerik haritası oluşturur.",
  },
  {
    icon: "🌐",
    title: "Geniş Dağıtım Ağı",
    description:
      "Hazırlanan kurumsal rehber ve tavsiye metinlerini, arama motoru botlarının (crawler) düzenli ziyaret ettiği güvenli web ağlarında yayına alır.",
    hint: "İçerikler, botların düzenli taradığı güvenilir kaynaklara yerleştirilerek yapay zeka eğitim verisine organik erişim sağlar.",
  },
  {
    icon: "📡",
    title: "Otonom Analiz Radarı",
    description:
      "Yapay zeka modellerinin markanızı tavsiye etme durumunu arka planda düzenli olarak tarar ve görünürlük raporunuzu hazırlar.",
    hint: "ChatGPT, Gemini ve Perplexity yanıtlarında marka görünürlüğünüz otomatik taranır; skorunuz panelde canlı güncellenir.",
  },
];

const STEPS = [
  {
    step: "01",
    icon: "🏢",
    title: "İşletme Bilgilerini Girin",
    description:
      "Şehir, sektör ve marka adınızı sisteme tanımlayın.",
  },
  {
    step: "02",
    icon: "💳",
    title: "Günlük Bütçenizi Belirleyin",
    description:
      "İhtiyacınıza göre esnek bütçe ve gün sayısını seçerek stratejinizi başlatın.",
  },
  {
    step: "03",
    icon: "📊",
    title: "Yapay Zeka Tavsiye Durumunu İzleyin",
    description:
      "ChatGPT, Gemini ve Perplexity gibi küresel yapay zeka motorlarının, kendi ürettikleri organik sonuçlarda markanızı tavsiye etmeye başlama sürecini canlı radar ekranınızdan anlık olarak takip edin.",
  },
];

const COMPARISON = {
  legacy: {
    label: "Eski Dünyanın Geleneksel SEO'su",
    items: [
      "Aylarca süren bekleyiş",
      "Yüksek ajans maliyetleri",
      "Botlar tarafından fark edilmeyen statik web siteleri",
    ],
  },
  nexis: {
    label: "NexisAI ile GEO Dönemi",
    items: [
      "Yapay zeka asistanlarında anlık görünürlük",
      "Esnek bütçe kontrolü",
      "Doğrudan hedef kitleye önerilme gücü",
    ],
  },
};

const GEO_STATS = [
  {
    value: "%70",
    gradient: "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200",
    description:
      "Kullanıcıların büyük bir kısmı artık geleneksel Google arama sonuçları yerine yapay zeka asistanlarının tavsiyelerine güveniyor.",
  },
  {
    value: "10 Kat Daha Hızlı",
    gradient: "bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-300",
    description:
      "Aylarca süren geleneksel SEO çalışmalarına kıyasla, NexisAI ile yapay zeka botlarının radarına girmek çok daha hızlı sonuç verir.",
  },
];

const AI_PLATFORMS = [
  {
    name: "OpenAI",
    subtitle: "ChatGPT",
    hoverClass:
      "hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:border-emerald-500/30",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
        <path d="M22.28 9.82a5.97 5.97 0 0 0-.52-4.91 6.01 6.01 0 0 0-6.51-2.9A5.97 5.97 0 0 0 11.09.24a6.01 6.01 0 0 0-5.67 4.1 5.97 5.97 0 0 0-3.98 2.92 6.01 6.01 0 0 0 .74 7.07 5.97 5.97 0 0 0 .52 4.91 6.01 6.01 0 0 0 6.51 2.9 5.97 5.97 0 0 0 4.16 1.77 6.01 6.01 0 0 0 5.67-4.1 5.97 5.97 0 0 0 3.98-2.92 5.97 5.97 0 0 0-.74-7.07ZM13.05 17.3l-3.3-1.9v-3.8l3.3 1.9v3.8Zm1.1-5.35-3.3-1.9 3.3-1.9 3.3 1.9-3.3 1.9Zm0-5.35-3.3-1.9V.5l3.3 1.9v4.2Zm1.1 0V2.4l3.3-1.9v3.8l-3.3 1.9Zm4.4 2.55-3.3 1.9-3.3-1.9 3.3-1.9 3.3 1.9Zm-8.8 5.35 3.3 1.9v3.8l-3.3-1.9v-3.8Zm-1.1 0v3.8l-3.3 1.9v-3.8l3.3-1.9Zm-4.4-2.55 3.3-1.9 3.3 1.9-3.3 1.9-3.3-1.9Z" />
      </svg>
    ),
  },
  {
    name: "Google",
    subtitle: "Gemini",
    hoverClass:
      "hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] hover:border-purple-500/30",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
        <path
          d="M12 2L4 6.5v11L12 22l8-4.5v-11L12 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 8l4 2.3v4.6L12 17l-4-2.1v-4.6L12 8z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
    ),
  },
  {
    name: "Perplexity",
    subtitle: "AI Search",
    hoverClass:
      "hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] hover:border-cyan-500/30",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 12h8M12 8v8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
];

const FAQ_ITEMS = [
  {
    question: "GEO (Yapay Zeka Motoru Optimizasyonu) nedir ve neden gereklidir?",
    answer:
      "GEO, geleneksel arama motoru optimizasyonunun (SEO) yapay zeka çağına uyarlanmış halidir. Günümüzde kullanıcıların büyük bir kısmı artık web sitelerini tek tek gezmek yerine ChatGPT, Gemini ve Perplexity gibi asistanlara doğrudan soru sormaktadır. GEO, bu asistanların kaynak tarama algoritmalarına yönelik optimizasyon yaparak markanızın tavsiye listelerinde ilk sırada yer almasını sağlar.",
  },
  {
    question: "Bu sistem nasıl çalışıyor? Süreç tamamen yasal ve güvenli mi?",
    answer:
      "Kesinlikle yasal ve %100 güvenlidir. NexisAI, yapay zeka modellerinin internetteki semantik rehberleri ve otoriter veri yapılarını tarama standartlarına uygun, yüksek kaliteli içerikler yayınlar. Herhangi bir hack, manipülasyon veya illegal sızma söz konusu değildir; süreç tamamen arama motoru botlarının (crawler) doğal entegrasyonuyla organik olarak işler.",
  },
  {
    question: "Kampanya bütçesi ve harcama modeli nasıl işler? Sabit bir aidat var mı?",
    answer:
      'NexisAI\'da sabit aylık aidatlar veya gizli abonelik ücretleri yoktur. Tamamen "Kullandığın Kadar Öde" (Pay-as-you-go) modeli geçerlidir. Cüzdanınıza dilediğiniz miktarda bakiye yükler, günlük harcama limitinizi ve operasyon sürenizi tamamen esnek slider\'lar ile kendiniz belirlersiniz. Operasyon bittiğinde harcama durur.',
  },
  {
    question: "Günlük bütçeyi artırmak sonuçları nasıl etkiler?",
    answer:
      "Günlük bütçeniz doğrudan arka plandaki işlem gücünü (GHz) ve dağıtım ağının agresifliğini ölçeklendirir. Yüksek bütçeli kampanyalarda yapay zeka motorları için çok daha zengin semantik veri modelleri sentezlenir ve sistemin otomatik analiz radarı 15 dakikada bir çalışarak sızma durumunu maksimum frekansta günceller.",
  },
  {
    question: "Yapay zeka asistanlarının markamı önermeye başladığını nasıl göreceğim?",
    answer:
      'Paneli başlattığınızda açılan "Canlı Analiz Terminali" ve "Otonom Analiz Radarı" üzerinden küresel yapay zeka modellerinin markanıza dair dijital otorite skorunu anlık olarak takip edebilirsiniz. Sistem, harici yapay zeka asistanlarının markanızı tavsiye etme yüzdesini (Görünürlük Skoru) gerçek zamanlı olarak ölçer ve raporlar.',
  },
  {
    question: "Hangi sektörler için uygundur?",
    answer:
      'Sağlık (Klinikler, Doktorlar), Hukuk (Hukuk Büroları), Danışmanlık, Yerel İşletmeler (Spor Salonları, Restoranlar), E-ticaret markaları ve kurumsal SaaS girişimleri başta olmak üzere, dijital dünyada "tavsiye edilmek" ve güven inşa etmek isteyen tüm sektörler için mükemmel sonuçlar verir.',
  },
];

function FaqChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={`h-4 w-4 shrink-0 text-violet-400 transition-transform duration-300 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={item.question}
            className={`overflow-hidden rounded-xl border transition-all duration-300 ${
              isOpen
                ? "border-violet-500/30 bg-violet-500/[0.06] shadow-[0_0_24px_rgba(139,92,246,0.08)]"
                : "border-slate-800/90 bg-slate-950/70"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-300 ${
                isOpen ? "bg-slate-900/40" : "bg-slate-900/60 hover:bg-slate-900/80"
              }`}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold leading-snug text-white sm:text-base">
                {item.question}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/80">
                <FaqChevron open={isOpen} />
              </span>
            </button>
            <div className="accordion-panel" data-open={isOpen}>
              <div className="overflow-hidden">
                <p className="border-t border-slate-800/80 px-5 pb-5 pt-4 text-sm leading-relaxed text-zinc-400">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HomeLanding() {
  const router = useRouter();
  const { login } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");

  const openAuthModal = (mode: AuthViewMode = "register") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (payload: {
    userName: string;
    userEmail: string | null;
    userId: string;
    accessToken: string;
  }) => {
    login(payload);
    setShowAuthModal(false);
    router.push("/dashboard");
  };

  const ctaButtonClassName =
    "group relative inline-flex overflow-hidden rounded-xl px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02]";

  return (
    <main className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-16">
      {/* Hero */}
      <section className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-4 py-16 text-center sm:px-8">
        <div
          className="landing-nebula pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_60%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <span className="landing-badge-glow inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            ✨ DİJİTAL PAZARLAMADA YENİ DÖNEM: GEO
          </span>

          <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            <span className="bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
              İşletmenizi Yapay Zeka Arama Motorlarında Zirveye Taşıyın
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            ChatGPT, Gemini ve Perplexity gibi yapay zeka asistanları
            müşterilerinize sizi önersin. Yapay Zeka Motoru Optimizasyonu (GEO)
            ile dijital dünyada kalıcı yerinizi alın.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => openAuthModal("register")}
              className={ctaButtonClassName}
            >
              <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity group-hover:opacity-100" />
              <span className="absolute inset-[1px] rounded-[11px] bg-zinc-950/20 backdrop-blur-sm transition group-hover:bg-zinc-950/10" />
              <span className="relative">
                Paneli Aç ve İlk Kampanyanı Başlat 📈
              </span>
            </button>
            <p className="text-sm text-zinc-500">
              Esnek bütçe · Şeffaf cüzdan · Canlı görünürlük raporu
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-20">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-6 backdrop-blur-md transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-2xl">
                {feature.icon}
              </div>
              <h2 className="text-lg font-semibold text-white">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/50 transition-all duration-300 group-hover:border-emerald-500/20 group-hover:bg-emerald-500/5">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">
                  Nasıl Optimize Edilir?
                </p>
                <p className="max-h-0 px-3 pb-0 text-xs leading-relaxed text-zinc-500 opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:pb-3 group-hover:opacity-100">
                  {feature.hint}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AiRecommendationSimulator />

      {/* How it works */}
      <section className="mt-28">
        <div className="mb-14 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Nasıl Çalışır?
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            Üç adımda yapay zeka görünürlüğünüzü yönetmeye başlayın.
          </p>
        </div>

        <div className="relative rounded-3xl p-1 sm:p-2">
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.03),transparent_50%)]"
            aria-hidden
          />

          <div className="relative grid gap-6 md:grid-cols-3">
            {STEPS.map((item) => (
              <article
                key={item.step}
                className="flex h-full flex-col rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-950/80 to-slate-900/40 p-6 backdrop-blur-md transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/15 text-xs font-bold text-violet-300 shadow-[0_0_14px_rgba(139,92,246,0.3)]">
                    {item.step}
                  </span>
                  <span className="text-2xl leading-none" aria-hidden>
                    {item.icon}
                  </span>
                </div>

                <h3 className="mb-2 mt-4 text-left text-xl font-semibold text-white">
                  {item.title}
                </h3>

                <p className="text-left text-sm leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GEO era — unified split grid */}
      <section className="relative mt-28">
        <div
          className="pointer-events-none absolute -inset-x-8 inset-y-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_65%)]"
          aria-hidden
        />

        <div className="relative">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Arama Motorlarının Yeni Çağına Uyum Sağlayın
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
              Geleneksel pazarlama yöntemleri yerini yapay zeka
              entegrasyonlarına bırakıyor. Aradaki farkı somut verilerle görün.
            </p>
          </div>

          <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-10">
            {/* Left — hero stats */}
            <div className="flex flex-col justify-center gap-12 py-2">
              {GEO_STATS.map((stat) => (
                <article key={stat.value}>
                  <p
                    className={`bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl ${stat.gradient}`}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
                    {stat.description}
                  </p>
                </article>
              ))}
            </div>

            {/* Right — split comparison panel */}
            <div className="group/comparison overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md transition-all duration-300 hover:border-purple-500/20 hover:shadow-[0_0_40px_rgba(139,92,246,0.08)]">
              <div className="grid h-full sm:grid-cols-2">
                <div className="border-b border-slate-800/80 bg-red-500/[0.02] p-6 sm:border-b-0 sm:border-r">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-400/60">
                    {COMPARISON.legacy.label}
                  </p>
                  <ul className="mt-5 space-y-4">
                    {COMPARISON.legacy.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm text-red-200/45"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-[10px] font-bold text-red-400/70">
                          ✕
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-purple-500/[0.02] p-6 transition-all duration-300 group-hover/comparison:border-purple-500/40 group-hover/comparison:bg-purple-500/[0.04] group-hover/comparison:shadow-[inset_0_0_32px_rgba(139,92,246,0.06)] sm:border-l sm:border-transparent group-hover/comparison:sm:border-purple-500/35 group-hover/comparison:sm:shadow-[0_0_24px_rgba(139,92,246,0.12)]">
                  <p className="bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-xs font-semibold uppercase tracking-wider text-transparent">
                    {COMPARISON.nexis.label}
                  </p>
                  <ul className="mt-5 space-y-4">
                    {COMPARISON.nexis.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm text-emerald-100/85"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.25)]">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RoiBudgetCalculator />

      {/* AI network showcase */}
      <section className="relative mt-28">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.04),transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-700/40 to-transparent md:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-violet-500/15 to-transparent blur-sm md:block"
          aria-hidden
        />

        <div className="relative">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Desteklenen Yapay Zeka Ağları
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
              NexisAI motoru, küresel LLM ekosisteminin lider arama ve
              optimizasyon mimarileriyle tam entegre çalışır.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {AI_PLATFORMS.map((platform) => (
              <article
                key={platform.name}
                className={`flex flex-col items-start rounded-2xl border border-slate-800/60 bg-slate-950/40 p-8 backdrop-blur-md transition-all duration-300 ${platform.hoverClass}`}
              >
                <div className="mb-5 text-zinc-400">{platform.icon}</div>
                <div className="space-y-1.5">
                  <p className="text-lg font-semibold text-white">
                    {platform.name}
                  </p>
                  <p className="text-sm text-zinc-500">{platform.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-28 pb-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Sıkça Sorulan Sorular (SSS)
          </h2>
        </div>

        <FaqAccordion />

        <div className="mt-14 text-center">
          <button
            type="button"
            onClick={() => openAuthModal("register")}
            className="inline-flex rounded-xl border border-violet-500/30 bg-violet-500/10 px-8 py-3.5 text-sm font-semibold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)]"
          >
            Paneli Aç ve İlk Kampanyanı Başlat 📈
          </button>
        </div>
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
      />
    </main>
  );
}
