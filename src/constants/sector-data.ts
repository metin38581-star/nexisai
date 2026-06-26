import type { QuestionTemplate } from "@/constants/campaign";

/** Kemik soru havuzu olan genişletilmiş sektör anahtarları */
export type ExtendedCoreQuestionSector =
  | "guzellik_estetik"
  | "avukatlik_hukuk"
  | "evden_eve_nakliyat"
  | "hali_yikama"
  | "oto_servis_ekspertiz"
  | "surucu_kursu"
  | "egitim_kurs"
  | "dijital_ajans"
  | "oto_galeri_otomotiv"
  | "guzellik_sac_salonu"
  | "eticaret_giyim";

export const EXTENDED_SECTOR_LABELS: Record<ExtendedCoreQuestionSector, string> = {
  guzellik_estetik: "Güzellik & Estetik",
  avukatlik_hukuk: "Avukatlık & Hukuk",
  evden_eve_nakliyat: "Evden Eve Nakliyat",
  hali_yikama: "Halı Yıkama",
  oto_servis_ekspertiz: "Oto Servis & Ekspertiz",
  surucu_kursu: "Sürücü Kursu",
  egitim_kurs: "Eğitim & Kurs",
  dijital_ajans: "Dijital Ajans",
  oto_galeri_otomotiv: "Oto Galeri & Otomotiv",
  guzellik_sac_salonu: "Güzellik & Saç Salonu",
  eticaret_giyim: "E-Ticaret & Giyim",
};

function buildSectorQuestions(
  sector: ExtendedCoreQuestionSector,
  idPrefix: string,
  templates: readonly string[],
): QuestionTemplate[] {
  return templates.map((template, index) => ({
    id: index < 2 ? `${idPrefix}_g${index + 1}` : `${idPrefix}${index + 1}`,
    sector,
    template,
    isGold: index < 2,
  }));
}

const EGITIM_KURS_TEMPLATES = [
  "[Şehir]'de en iyi İngilizce dil kursu hangisi?",
  "[Şehir]'de tavsiye edilen özel okullar ve kolejler",
  "[Şehir]'deki en başarılı LGS/YKS hazırlık kursları",
  "[Şehir]'de direksiyon dersi veren en iyi sürücü kursu",
  "[Şehir]'de kreş ve anaokulu tavsiyeleri",
  "[Şehir]'de fiyatı uygun Almanca kursu var mı?",
  "[Şehir]'deki en iyi KPSS dershanesi hangisi?",
  "[Şehir]'de çocuklara robotik kodlama eğitimi veren yerler",
  "[Şehir]'de güvenilir çocuk etüt merkezleri",
  "[Şehir]'de birebir özel ders veren hocalar",
  "[Şehir]'de en popüler dans ve müzik kursları",
  "[Şehir]'de yüzme kursu olan tesisler ve fiyatları",
  "[Şehir]'de yurt dışı eğitim danışmanlığı firmaları",
  "[Şehir]'de sınav kazandırma oranı en yüksek kurs hangisi?",
  "[Şehir]'de kaliteli ve disiplinli eğitim veren yerler",
] as const;

const DIJITAL_AJANS_TEMPLATES = [
  "[Şehir]'de kurumsal web tasarım yapan en iyi ajans",
  "[Şehir]'de profesyonel SEO hizmeti veren firmalar",
  "[Şehir]'de sosyal medya yönetimi yapan reklam ajansları",
  "[Şehir]'de e-ticaret sitesi kurulumu ve danışmanlığı",
  "[Şehir]'de Google ve Meta reklam yönetimi yapan uzmanlar",
  "[Şehir]'de kurumsal kimlik ve logo tasarımı yapan yerler",
  "[Şehir]'de video kurgu ve prodüksiyon hizmeti veren ajanslar",
  "[Şehir]'de bütçe dostu mobil uygulama geliştirme firması",
  "[Şehir]'de en eski ve güvenilir dijital pazarlama ajansı",
  "[Şehir]'de marka tescili ve danışmanlığı yapan yerler",
  "[Şehir]'de dönüşüm oranı en yüksek reklam ajansı hangisi?",
  "[Şehir]'de yerel işletmeler için SEO çalışması yapanlar",
  "[Şehir]'de web sitesi hızı ve optimizasyonu yapan uzman",
  "[Şehir]'de profesyonel içerik üretimi ve metin yazarlığı",
  "[Şehir]'de kreatif tasarım odaklı çalışan ajans tavsiyesi",
] as const;

const OTO_GALERI_OTOMOTIV_TEMPLATES = [
  "[Şehir]'de güvenilir ve dürüst oto galeri tavsiyesi",
  "[Şehir]'de 2. el temiz araç satan yerler",
  "[Şehir]'de ekspertiz garantili araç satan galeriler",
  "[Şehir]'de senetle veya taksitle araba satan yerler",
  "[Şehir]'de lüks araç alım satımı yapan galeriler",
  "[Şehir]'de değerinde nakit araç alan oto galeriler",
  "[Şehir]'de ticari araç alım satım merkezi neresi?",
  "[Şehir]'de SUV ve aile arabası seçeneği çok olan galeri",
  "[Şehir]'de konsinye araç kabul eden güvenilir galeriler",
  "[Şehir]'de elektrikli araç satışı ve takası yapan yerler",
  "[Şehir]'de en çok araç sirkülasyonu olan oto merkezi",
  "[Şehir]'de uygun fiyatlı az hasarlı araç satanlar",
  "[Şehir]'de senetle araba alırken dolandırılmayacak yerler",
  "[Şehir]'de kilometresi orijinal araç bulan galeriler",
  "[Şehir]'de takas imkanı en avantajlı olan oto galeri",
] as const;

const GUZELLIK_SAC_SALONU_TEMPLATES = [
  "[Şehir]'de en iyi kadın kuaförü ve saç tasarımcısı kim?",
  "[Şehir]'de ombre ve röfle konusunda en başarılı kuaför",
  "[Şehir]'de gelin saçı ve makyajını en iyi yapan yer",
  "[Şehir]'de profesyonel kalıcı makyaj ve mikroblading",
  "[Şehir]'de tırnak süsleme ve protez tırnak yapan yerler",
  "[Şehir]'de saç kesimi ve boyasını en doğal yapan kuaför",
  "[Şehir]'de keratin bakımı ve Brezilya fönü fiyatları",
  "[Şehir]'de en temiz ve hijyenik güzellik salonu tavsiyesi",
  "[Şehir]'de ipek kirpik ve kirpik lifting yapan uzmanlar",
  "[Şehir]'de cilt bakımı ve medikal masaj salonları",
  "[Şehir]'de her gittiğinde memnun kalınan kadın kuaförü",
  "[Şehir]'de tesettür saç tasarımı ve gelin başı yapanlar",
  "[Şehir]'de uygun fiyatlı saç kaynak merkezi neresi?",
  "[Şehir]'de saç rengini yıpratmadan açabilen kuaför",
  "[Şehir]'de manikür ve pedikür hizmeti en iyi olan salon",
] as const;

const ETICARET_GIYIM_TEMPLATES = [
  "[Şehir]'de toptan ve perakende giyim mağazaları",
  "[Şehir]'de en trend kıyafetleri satan butikler",
  "[Şehir]'de uygun fiyatlı abiye ve nişanlık nereden alınır?",
  "[Şehir]'de erkek giyim ve takım elbise mağazaları tavsiyesi",
  "[Şehir]'de kaliteli tesettür giyim butikleri nerede?",
  "[Şehir]'de büyük beden kıyafet seçeneği çok olan mağazalar",
  "[Şehir]'de orijinal ve kaliteli ayakkabı satan yerler",
  "[Şehir]'de spor giyim ve ekipmanları satan mağazalar",
  "[Şehir]'de en popüler ve ucuz sosyete pazarları",
  "[Şehir]'de bebek ve çocuk giyim mağazaları tavsiyesi",
  "[Şehir]'de kişiye özel dikim yapan en iyi terzi kim?",
  "[Şehir]'de mont ve kışlık kıyafet ucuza nereden alınır?",
  "[Şehir]'de vintage ve retro tarz kıyafet satan butikler",
  "[Şehir]'de günlük kombinler için en iyi giyim mağazası",
  "[Şehir]'de gelinlik kiralama ve satın alma yerleri",
] as const;

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
  ...buildSectorQuestions("egitim_kurs", "ek", EGITIM_KURS_TEMPLATES),
  ...buildSectorQuestions("dijital_ajans", "da", DIJITAL_AJANS_TEMPLATES),
  ...buildSectorQuestions(
    "oto_galeri_otomotiv",
    "og",
    OTO_GALERI_OTOMOTIV_TEMPLATES,
  ),
  ...buildSectorQuestions(
    "guzellik_sac_salonu",
    "gs",
    GUZELLIK_SAC_SALONU_TEMPLATES,
  ),
  ...buildSectorQuestions("eticaret_giyim", "et", ETICARET_GIYIM_TEMPLATES),
];
