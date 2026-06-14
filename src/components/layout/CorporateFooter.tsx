import Link from "next/link";

export default function CorporateFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-slate-900 bg-slate-950/80 px-6 py-12 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="flex max-w-sm flex-col gap-2">
          <div className="text-sm font-semibold text-slate-200">
            NexisAI Teknolojileri
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Yapay Zeka Motoru Optimizasyonu (GEO) ve dijital görünürlük
            yönetim platformu. Tüm hakları saklıdır. © 2026
          </p>
          <div className="mt-2 w-fit rounded border border-slate-800/60 bg-slate-900/50 px-3 py-1.5 font-mono text-[11px] text-slate-500">
            🏢 Vergi Dairesi: Kocasinan V.D.{" "}
            <span className="font-bold text-purple-400">|</span> V.N: 8370941679
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-medium text-slate-400">
          <Link
            href="/yasal/kvkk"
            className="transition-colors hover:text-purple-400"
          >
            KVKK Aydınlatma Metni
          </Link>
          <Link
            href="/yasal/kullanim-sartlari"
            className="transition-colors hover:text-purple-400"
          >
            Kullanıcı Sözleşmesi (ToS)
          </Link>
          <Link
            href="/yasal/gizlilik"
            className="transition-colors hover:text-purple-400"
          >
            Gizlilik ve Çerez Politikası
          </Link>
          <Link
            href="/yasal/mesafeli-satis"
            className="transition-colors hover:text-purple-400"
          >
            Mesafeli Satış Sözleşmesi
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-slate-900/60 pt-6 text-left text-[10px] leading-relaxed text-slate-600 md:text-center">
        Yasal Uyarı: NexisAI, arama motorlarının ve yapay zeka servislerinin
        (OpenAI, Google, Perplexity vb.) kamuya açık semantik tarama
        algoritmalarına yönelik optimizasyon rehberleri sunar. Bahsi geçen
        üçüncü parti markalar ve logolar ilgili hak sahiplerine ait olup,
        platformumuzun bu servislerle doğrudan bir organik bağı
        bulunmamaktadır.
      </div>
    </footer>
  );
}
