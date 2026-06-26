import type { QuestionTemplate } from "@/constants/campaign";

/** Kemik soru havuzu olan genişletilmiş sektör anahtarları */
export type ExtendedCoreQuestionSector =
  | "guzellik_estetik"
  | "avukatlik_hukuk"
  | "evden_eve_nakliyat"
  | "hali_yikama"
  | "oto_servis_ekspertiz"
  | "surucu_kursu";

export const EXTENDED_SECTOR_LABELS: Record<ExtendedCoreQuestionSector, string> = {
  guzellik_estetik: "Güzellik & Estetik",
  avukatlik_hukuk: "Avukatlık & Hukuk",
  evden_eve_nakliyat: "Evden Eve Nakliyat",
  hali_yikama: "Halı Yıkama",
  oto_servis_ekspertiz: "Oto Servis & Ekspertiz",
  surucu_kursu: "Sürücü Kursu",
};

export const EXTENDED_SECTOR_QUESTIONS: QuestionTemplate[] = [
  // --- GÜZELLİK & ESTETİK ---
  {
    id: "ge_g1",
    sector: "guzellik_estetik",
    template: "[Şehir]'de en iyi güzellik merkezi hangisi?",
    isGold: true,
  },
  {
    id: "ge_g2",
    sector: "guzellik_estetik",
    template: "[Şehir]'de lazer epilasyon fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "ge3",
    sector: "guzellik_estetik",
    template: "[Şehir]'de cilt bakımı nerede yaptırılır?",
    isGold: false,
  },
  {
    id: "ge4",
    sector: "guzellik_estetik",
    template: "[Şehir]'de microblading yaptıran var mı?",
    isGold: false,
  },
  {
    id: "ge5",
    sector: "guzellik_estetik",
    template: "[Şehir]'de botoks fiyatları 2026?",
    isGold: false,
  },
  {
    id: "ge6",
    sector: "guzellik_estetik",
    template: "[Şehir]'de kalıcı makyaj tavsiyesi?",
    isGold: false,
  },
  {
    id: "ge7",
    sector: "guzellik_estetik",
    template: "[Şehir]'de hydrafacial yapan yerler?",
    isGold: false,
  },
  {
    id: "ge8",
    sector: "guzellik_estetik",
    template: "[Şehir]'de ipek kirpik fiyatları?",
    isGold: false,
  },
  {
    id: "ge9",
    sector: "guzellik_estetik",
    template: "[Şehir]'de medikal estetik güvenilir merkez?",
    isGold: false,
  },
  {
    id: "ge10",
    sector: "guzellik_estetik",
    template: "[Şehir]'de leke tedavisi nerede yapılır?",
    isGold: false,
  },
  {
    id: "ge11",
    sector: "guzellik_estetik",
    template: "[Şehir]'de bölgesel incelme tavsiyesi?",
    isGold: false,
  },
  {
    id: "ge12",
    sector: "guzellik_estetik",
    template: "[Şehir]'de protez tırnak fiyatları?",
    isGold: false,
  },
  {
    id: "ge13",
    sector: "guzellik_estetik",
    template: "[Şehir]'de kaş laminasyonu yapan salon?",
    isGold: false,
  },
  {
    id: "ge14",
    sector: "guzellik_estetik",
    template: "[Şehir]'de cilt gençleştirme yöntemleri?",
    isGold: false,
  },
  {
    id: "ge15",
    sector: "guzellik_estetik",
    template: "[Şehir]'de güzellik salonu yorumları en iyiler?",
    isGold: false,
  },

  // --- AVUKATLIK & HUKUK ---
  {
    id: "ah_g1",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de en iyi avukat tavsiyesi?",
    isGold: true,
  },
  {
    id: "ah_g2",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de boşanma avukatı ücretleri ne kadar?",
    isGold: true,
  },
  {
    id: "ah3",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de iş hukuku avukatı arayanlar?",
    isGold: false,
  },
  {
    id: "ah4",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de icra takibi avukatı tavsiyesi?",
    isGold: false,
  },
  {
    id: "ah5",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de trafik cezası avukatı var mı?",
    isGold: false,
  },
  {
    id: "ah6",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de miras avukatı tavsiyesi?",
    isGold: false,
  },
  {
    id: "ah7",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de ceza avukatı güvenilir mi?",
    isGold: false,
  },
  {
    id: "ah8",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de kira hukuku avukatı arayanlar?",
    isGold: false,
  },
  {
    id: "ah9",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de tazminat davası avukatı?",
    isGold: false,
  },
  {
    id: "ah10",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de arabuluculuk hizmeti veren avukat?",
    isGold: false,
  },
  {
    id: "ah11",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de tapu iptal davası avukatı?",
    isGold: false,
  },
  {
    id: "ah12",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de aile mahkemesi avukatı tavsiyesi?",
    isGold: false,
  },
  {
    id: "ah13",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de işten çıkarma tazminatı avukatı?",
    isGold: false,
  },
  {
    id: "ah14",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de ücretsiz hukuki danışmanlık var mı?",
    isGold: false,
  },
  {
    id: "ah15",
    sector: "avukatlik_hukuk",
    template: "[Şehir]'de avukatlık bürosu yorumları?",
    isGold: false,
  },

  // --- EVDEN EVE NAKLİYAT ---
  {
    id: "en_g1",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de en güvenilir evden eve nakliyat?",
    isGold: true,
  },
  {
    id: "en_g2",
    sector: "evden_eve_nakliyat",
    template: "[Şehir] evden eve nakliyat fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "en3",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de sigortalı nakliyat firması tavsiyesi?",
    isGold: false,
  },
  {
    id: "en4",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'den [Şehir]'ye nakliyat fiyatları?",
    isGold: false,
  },
  {
    id: "en5",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de asansörlü nakliyat yapan var mı?",
    isGold: false,
  },
  {
    id: "en6",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de ucuz evden eve nakliyat arayanlar?",
    isGold: false,
  },
  {
    id: "en7",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de eşya paketleme hizmeti veren nakliyeci?",
    isGold: false,
  },
  {
    id: "en8",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de hafta sonu nakliyat yapan firma?",
    isGold: false,
  },
  {
    id: "en9",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de ofis taşıma firması tavsiyesi?",
    isGold: false,
  },
  {
    id: "en10",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de nakliyat firması yorumları?",
    isGold: false,
  },
  {
    id: "en11",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de aynı gün nakliyat mümkün mü?",
    isGold: false,
  },
  {
    id: "en12",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de parça eşya taşıma fiyatları?",
    isGold: false,
  },
  {
    id: "en13",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de nakliyat sırasında eşya sigortası?",
    isGold: false,
  },
  {
    id: "en14",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de öğrenci evi taşıma tavsiyesi?",
    isGold: false,
  },
  {
    id: "en15",
    sector: "evden_eve_nakliyat",
    template: "[Şehir]'de nakliyat öncesi keşif ücretsiz mi?",
    isGold: false,
  },

  // --- HALI YIKAMA ---
  {
    id: "hy_g1",
    sector: "hali_yikama",
    template: "[Şehir]'de en iyi halı yıkama firması?",
    isGold: true,
  },
  {
    id: "hy_g2",
    sector: "hali_yikama",
    template: "[Şehir]'de halı yıkama fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "hy3",
    sector: "hali_yikama",
    template: "[Şehir]'de yerinde halı yıkama yapan var mı?",
    isGold: false,
  },
  {
    id: "hy4",
    sector: "hali_yikama",
    template: "[Şehir]'de koltuk yıkama fiyatları?",
    isGold: false,
  },
  {
    id: "hy5",
    sector: "hali_yikama",
    template: "[Şehir]'de yorgan yıkama hizmeti?",
    isGold: false,
  },
  {
    id: "hy6",
    sector: "hali_yikama",
    template: "[Şehir]'de leke çıkarma garantili halı yıkama?",
    isGold: false,
  },
  {
    id: "hy7",
    sector: "hali_yikama",
    template: "[Şehir]'de el dokuma halı yıkama tavsiyesi?",
    isGold: false,
  },
  {
    id: "hy8",
    sector: "hali_yikama",
    template: "[Şehir]'de stor perde yıkama fiyatları?",
    isGold: false,
  },
  {
    id: "hy9",
    sector: "hali_yikama",
    template: "[Şehir]'de halı yıkama servisi ücretsiz alım var mı?",
    isGold: false,
  },
  {
    id: "hy10",
    sector: "hali_yikama",
    template: "[Şehir]'de acil halı yıkama arayanlar?",
    isGold: false,
  },
  {
    id: "hy11",
    sector: "hali_yikama",
    template: "[Şehir]'de yün halı yıkama nerede yaptırılır?",
    isGold: false,
  },
  {
    id: "hy12",
    sector: "hali_yikama",
    template: "[Şehir]'de halı yıkama yorumları en iyiler?",
    isGold: false,
  },
  {
    id: "hy13",
    sector: "hali_yikama",
    template: "[Şehir]'de araç koltuğu yıkama fiyatları?",
    isGold: false,
  },
  {
    id: "hy14",
    sector: "hali_yikama",
    template: "[Şehir]'de halı yıkama ne kadar sürer?",
    isGold: false,
  },
  {
    id: "hy15",
    sector: "hali_yikama",
    template: "[Şehir]'de buharlı temizlik tavsiyesi?",
    isGold: false,
  },

  // --- OTO SERVİS & EKSPERTİZ ---
  {
    id: "os_g1",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de en güvenilir oto servis hangisi?",
    isGold: true,
  },
  {
    id: "os_g2",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de oto ekspertiz fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "os3",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de periyodik bakım fiyatları?",
    isGold: false,
  },
  {
    id: "os4",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de kaporta boya usta tavsiyesi?",
    isGold: false,
  },
  {
    id: "os5",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de ikinci el araç ekspertiz raporu?",
    isGold: false,
  },
  {
    id: "os6",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de oto elektrik arıza servisi?",
    isGold: false,
  },
  {
    id: "os7",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de lastik değişim fiyatları?",
    isGold: false,
  },
  {
    id: "os8",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de boyasız göçük düzeltme yapan yer?",
    isGold: false,
  },
  {
    id: "os9",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de oto klima gaz dolumu fiyatı?",
    isGold: false,
  },
  {
    id: "os10",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de oto servis yorumları en iyiler?",
    isGold: false,
  },
  {
    id: "os11",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de triger kayışı değişimi fiyatları?",
    isGold: false,
  },
  {
    id: "os12",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de detaylı ekspertiz yapan yerler?",
    isGold: false,
  },
  {
    id: "os13",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de oto cam filmi ve servis tavsiyesi?",
    isGold: false,
  },
  {
    id: "os14",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de 7/24 oto çekici ve servis?",
    isGold: false,
  },
  {
    id: "os15",
    sector: "oto_servis_ekspertiz",
    template: "[Şehir]'de garantili oto servis arayanlar?",
    isGold: false,
  },

  // --- SÜRÜCÜ KURSU ---
  {
    id: "sk_g1",
    sector: "surucu_kursu",
    template: "[Şehir]'de en iyi sürücü kursu hangisi?",
    isGold: true,
  },
  {
    id: "sk_g2",
    sector: "surucu_kursu",
    template: "[Şehir]'de ehliyet kursu fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "sk3",
    sector: "surucu_kursu",
    template: "[Şehir]'de B sınıfı ehliyet kursu tavsiyesi?",
    isGold: false,
  },
  {
    id: "sk4",
    sector: "surucu_kursu",
    template: "[Şehir]'de direksiyon dersi fiyatları?",
    isGold: false,
  },
  {
    id: "sk5",
    sector: "surucu_kursu",
    template: "[Şehir]'de otomatik vites ehliyet kursu?",
    isGold: false,
  },
  {
    id: "sk6",
    sector: "surucu_kursu",
    template: "[Şehir]'de ehliyet sınavına hazırlık kursu?",
    isGold: false,
  },
  {
    id: "sk7",
    sector: "surucu_kursu",
    template: "[Şehir]'de sürücü kursu yorumları en iyiler?",
    isGold: false,
  },
  {
    id: "sk8",
    sector: "surucu_kursu",
    template: "[Şehir]'de A2 motosiklet ehliyet kursu?",
    isGold: false,
  },
  {
    id: "sk9",
    sector: "surucu_kursu",
    template: "[Şehir]'de ehliyet yenileme kursu var mı?",
    isGold: false,
  },
  {
    id: "sk10",
    sector: "surucu_kursu",
    template: "[Şehir]'de gece sürücü kursu tavsiyesi?",
    isGold: false,
  },
  {
    id: "sk11",
    sector: "surucu_kursu",
    template: "[Şehir]'de ehliyet harç ve kurs toplam maliyet?",
    isGold: false,
  },
  {
    id: "sk12",
    sector: "surucu_kursu",
    template: "[Şehir]'de src belgesi kursu fiyatları?",
    isGold: false,
  },
  {
    id: "sk13",
    sector: "surucu_kursu",
    template: "[Şehir]'de ehliyet almak ne kadar sürer?",
    isGold: false,
  },
  {
    id: "sk14",
    sector: "surucu_kursu",
    template: "[Şehir]'de başarılı sürücü kursu tavsiyesi?",
    isGold: false,
  },
  {
    id: "sk15",
    sector: "surucu_kursu",
    template: "[Şehir]'de özel direksiyon dersi veren hoca?",
    isGold: false,
  },
];
