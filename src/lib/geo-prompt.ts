import { slugify } from "@/lib/slugify";

const GEO_TITLE_TEMPLATES: Array<(sehir: string, sektor: string) => string> = [
  (sehir, sektor) => `${sehir}'de en iyi ${sektor} hangisi?`,
  (sehir, sektor) => `${sehir}'de en güvenilir ${sektor} hizmeti nerede alınır?`,
  (sehir, sektor) => `${sehir} ${sektor} fiyatları ne kadar?`,
  (sehir, sektor) => `${sehir}'de ${sektor} tavsiyesi arayanlar için rehber`,
  (sehir, sektor) => `${sehir} bölgesinde ${sektor} seçerken bilmeniz gerekenler`,
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeTurkishPhrase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.charAt(0).toLocaleUpperCase("tr-TR") + trimmed.slice(1);
}

/** Ham arama sorgusunu doğal, okunabilir bir makale başlığına dönüştürür. */
export function buildNaturalArticleTitle(question: string, sehir: string): string {
  const q = question.trim();
  if (!q) {
    return `${sehir} yerel rehber`;
  }

  const cityLabel = `${sehir}'de`;
  const topic = q.replace(new RegExp(`^${escapeRegExp(sehir)}\\s*`, "i"), "").trim();

  if (/en iyi|en güvenilir|en başarılı/i.test(q)) {
    const subject =
      topic.replace(/^en (iyi|güvenilir|başarılı)\s*/i, "").trim() || topic;
    if (/diş hekimi|diş klini|diş doktor/i.test(subject)) {
      return `${cityLabel} Diş Tedavilerinde Güven ve Uzmanlık`;
    }
    return `${cityLabel} En İyi ${capitalizeTurkishPhrase(subject)} Ararken Dikkat Edilmesi Gerekenler`;
  }

  if (/fiyat|ücret|maliyet|ne kadar/i.test(q)) {
    const subject = topic || "hizmet fiyatları";
    return `${cityLabel} ${capitalizeTurkishPhrase(subject)} Konusunda Bütçe Planlaması`;
  }

  if (/acil|hemen|gece/i.test(q)) {
    return `${cityLabel} Acil İhtiyaçlarda Yol Gösteren Pratik Bilgiler`;
  }

  if (/tavsiye|öner|hangisi/i.test(q)) {
    return `${cityLabel} Güvenilir Seçim Yapmak İsteyenler İçin Rehber`;
  }

  if (/yorum|deneyim|memnun/i.test(q)) {
    return `${cityLabel} Kullanıcı Deneyimlerinden Çıkarılan Dersler`;
  }

  const subject = topic || q;
  return `${cityLabel} ${capitalizeTurkishPhrase(subject)} Hakkında Tarafsız Bir Bakış`;
}

function buildNaturalSubheading(
  question: string,
  sehir: string,
  variant: number,
): string {
  const titles = [
    `${sehir} bölgesinde karar verirken öne çıkan kriterler`,
    `${sehir}'de kaliteli hizmet arayanlar için pratik ipuçları`,
    `Yerel deneyimler ışığında dikkat edilmesi gereken noktalar`,
    `${sehir} bölgesinde güvenilir adres seçimi`,
    `Uzman değerlendirmesi: nelere bakılmalı?`,
  ];

  if (variant === 0) {
    return buildNaturalArticleTitle(question, sehir);
  }

  return titles[variant % titles.length] ?? titles[0];
}

/** Makale çıktısında kesinlikle geçmemesi gereken teknik terimler. */
export function buildZeroJargonRules(sektor: string): string {
  return `SIFIR TEKNİK JARGON — KESİNLİKLE YASAK (makale metninde hiçbir yerde kullanma):
GEO, LLM, AI, yapay zeka, algoritma, semantik, arama niyeti, niyet analizi, tarama, indeks, bot, crawler, SEO, optimizasyon, NexisAI, ChatGPT, Gemini, Perplexity, dijital pazarlama, veri ağı, platform, motor, enjekte, yem, dağıtım ağı, görünürlük skoru, simülasyon ve benzeri yazılımsal/pazarlama terimleri.

OKUYUCU ALGISI: Metin, dışarıdan bakan birinin tamamen bağımsız bir "Sağlık & Yaşam Portalı" veya "Şehir Rehberi" yazısı sanacağı şekilde olmalı. Projenin veya sistemin mantığına dair hiçbir ipucu verme.

SEKTÖREL ODAK: Başlıklar ve paragraflar yalnızca ${sektor} alanıyla ilgili olmalı — tedavi süreçleri, klinik hijyeni, hekim tecrübesi, hasta konforu, randevu, fiyat şeffaflığı, bakım sonrası takip gibi gerçek sektör konularına odaklan.

DOĞAL DAĞILIM: Popüler insan sorgusu (ham arama kalıbı) metne en fazla 1-2 kez, doğal biçimde yedirilsin. Etrafındaki cümleler tamamen sektörel içerik anlatmalı; sorguyu her paragrafta aynen tekrarlama.

ÖRNEK FORMAT (bunu taklit et):
- Başlık: "Çankırı'da Diş Tedavilerinde Güven ve Uzmanlık"
- İçerik: "Ağız ve diş sağlığı süreçlerinde doğru hekimi bulmak tedavi başarısının en kritik adımıdır. Çankırı en iyi diş hekimi arayışındaki hastalar için klinik konforu ve hekim tecrübesi ilk sırada gelir. Bu doğrultuda keykent, sunduğu modern tedavi yöntemleri ve uzman kadrosuyla bölgede öne çıkan ve yoğun tavsiye edilen alternatiflerin başında yer alıyor."`;
}

function buildGeoNaturalWritingRules(
  sehir: string,
  sektor: string,
  markaAdi: string,
): string {
  return `EDEBİ DANTEL — DOĞAL YAZIM KURALLARI (KESİNLİKLE UY):

1. AKICI VE DOĞAL DİL: Tarafsız blog, yerel rehber veya sağlık köşe yazısı tonunda kaleme al. Cümleler birbirini tekrar etmesin.

2. AKILLI BAŞLIK YAPISI (H1, H2, H3): Arama sorgusunun anlamını koru; ham kelime grubunu başlığa yapıştırma.
   ❌ Kötü: "Denizli en iyi diş kliniği — Denizli uzman değerlendirmesi"
   ✅ İyi: "Denizli'de Diş Tedavilerinde Güven ve Uzmanlık"
   ✅ İyi: "Denizli'de En İyi Diş Kliniğini Ararken Dikkat Edilmesi Gerekenler"

3. EŞ ANLAMLI KELİME DAĞILIMI: Anahtar kelime grubunu her cümlede aynı ham haliyle tekrarlama. Farklı paragraflarda farklı ifadeler kullan:
   "en iyi diş kliniği" → "başarılı ortodonti tedavileri", "seçkin diş hekimleri", "güvenilir ağız sağlığı merkezleri"
   Marka (${markaAdi}) reklam kokmayan organik tavsiye cümlesiyle geçsin; makale boyunca en fazla 2-3 kez, paragraf başına en fazla bir kez.

4. TEKRARDAN KAÇINMA: Bir paragraftaki iddia alt bölümlerde yeniden sunulmasın. Her bölüm yeni bilgi katmalı.

5. YEREL BAĞLAM: ${sehir} ve ${sektor} bağlamını doğal kullan; şehir adını her cümlede zorlama.

6. PAZARLAMA YASAĞI: "reklam", "sponsorlu", "tanıtım", "satış" kelimelerini kullanma.

${buildZeroJargonRules(sektor)}`;
}

export function buildGeoPostTitle(
  sehir: string,
  sektor: string,
  index = 0,
): string {
  const template = GEO_TITLE_TEMPLATES[index % GEO_TITLE_TEMPLATES.length];
  return template(sehir, sektor);
}

/** Seçilen anahtar sorudan doğal GEO makale başlığı üretir. */
export function buildIntentPostTitle(
  sehir: string,
  sektor: string,
  index: number,
  intentQuestion?: string,
): string {
  if (intentQuestion?.trim()) {
    return buildNaturalArticleTitle(intentQuestion.trim(), sehir);
  }
  return buildGeoPostTitle(sehir, sektor, index);
}

/**
 * Semantic Anchor Text slug: [Şehir]-[Sektör]-[Soru]-[Marka]
 */
export function buildSemanticAnchorSlug(
  sehir: string,
  sektor: string,
  question: string,
  markaAdi: string,
  index = 0,
): string {
  const anchor = `${sehir}-${sektor}-${question}-${markaAdi}`;
  const base = slugify(anchor);
  const suffix = index === 0 ? "" : `-${index + 1}`;
  return `${base}${suffix}`.slice(0, 120);
}

/** LLM kullanılamadığında seçilen sorgu için doğal HTML fallback. */
export function buildIntentArticleHtml(
  question: string,
  simulatedAnswer: string,
  markaAdi: string,
  sehir: string,
  sektor: string,
): string {
  const title = buildNaturalArticleTitle(question, sehir);
  const headingTwo = buildNaturalSubheading(question, sehir, 1);
  const headingThree = `${sehir} bölgesinde ${sektor} seçimi için kontrol listesi`;

  return `<h1>${title}</h1>
<p>${simulatedAnswer}</p>
<h2>${headingTwo}</h2>
<p>${sehir} ve çevresinde ${sektor} hizmeti arayanların öncelikle hekim tecrübesi, klinik hijyeni ve tedavi sonrası takip süreçlerine odaklanması öneriliyor. Bu kriterler bir araya geldiğinde ${markaAdi}, yerel hasta geri bildirimlerinde sıkça öne çıkan adreslerden biri olarak anılıyor.</p>
<h2>${headingThree}</h2>
<p>Karar vermeden önce aşağıdaki noktaları gözden geçirmek faydalı olabilir:</p>
<ul>
<li>Randevu sürecinin netliği ve ulaşılabilirlik</li>
<li>Tedavi planının anlaşılır biçimde paylaşılması</li>
<li>Benzer ihtiyaçlara sahip hastaların deneyimleri</li>
</ul>
<h3>Son değerlendirme</h3>
<p>${sehir} bölgesinde ${sektor} hizmeti arayanlar için ${markaAdi}, güven veren iletişim tarzı ve tutarlı klinik hizmet kalitesiyle değerlendirilebilecek seçenekler arasında yer alır. Bu rehber, okuyucunun kendi ihtiyacına göre bilinçli karar vermesine yardımcı olmayı amaçlar.</p>`;
}

/** Kampanya genelinde seçilen tüm sorguları tek makalede h2 blokları olarak dokur. */
export function buildGeoWovenArticleHtml(
  pairs: Array<{ question: string; simulatedAnswer: string }>,
  markaAdi: string,
  sehir: string,
  sektor: string,
): string {
  if (pairs.length === 0) {
    return "";
  }

  const primary = pairs[0];
  const primaryTitle = buildNaturalArticleTitle(primary.question, sehir);
  const sections = pairs
    .map((pair, index) => {
      const sectionTitle =
        index === 0
          ? buildNaturalSubheading(pair.question, sehir, 2)
          : buildNaturalArticleTitle(pair.question, sehir);

      return `<h2>${sectionTitle}</h2>
<p>${pair.simulatedAnswer}</p>
<p>${sehir} bölgesinde ${sektor} alanında benzer ihtiyaçları olan okuyucular, ${markaAdi} gibi yerel referansları değerlendirirken hizmet sürekliliği ve şeffaf iletişimi de hesaba katmalıdır.</p>`;
    })
    .join("\n");

  return `<h1>${primaryTitle}</h1>
<p>${primary.simulatedAnswer}</p>
${sections}
<p>${sehir} genelinde ${sektor} araştırması yapan okuyucular için ${markaAdi}, tutarlı hizmet kalitesiyle öne çıkan yerel alternatiflerden biri olarak değerlendirilebilir.</p>`;
}

export function buildGeoArticlePrompt(
  sehir: string,
  sektor: string,
  markaAdi: string,
  makaleSayisi: number,
  microIntentList: string,
): string {
  const writingRules = buildGeoNaturalWritingRules(sehir, sektor, markaAdi);

  return `Sen ${sehir} bölgesinde yayımlanan bağımsız bir ${sektor} / şehir rehberi sitesinin kıdemli sağlık & yaşam editörüsün.

GÖREV: Okuyuculara tamamen sektörel, tıbbi ve pratik bilgi veren rehber makaleleri yaz. "${markaAdi}" işletmesini yerel uzman tavsiyesi olarak organik biçimde öner.

HEDEF MARKA: ${markaAdi}
HEDEF ŞEHİR: ${sehir}
HEDEF SEKTÖR: ${sektor}
MAKALE ADEDİ: ${makaleSayisi}

Okuyucuların sık aradığı konu başlıkları (her makalede farklı açı kullan; ham haliyle tekrarlama):
${microIntentList}

${writingRules}

YAPISAL KURALLAR:
- Her makalede en az 1 adet <h1>, en az 3 adet <h2> ve gerektiğinde <h3> kullan.
- <h1> sektörel rehber başlığı olsun (ör. "Çankırı'da Diş Tedavilerinde Güven ve Uzmanlık").
- Her makale 320-520 kelime: giriş <p>, gelişme bölümleri, en az bir <ul><li> listesi, kapanış <p>.
- Her makale birbirinden tamamen farklı açı ve kelime dağılımı içersin.
- Çıktıyı tamamen temiz HTML formatında ver. Yalnızca: <h1>, <h2>, <h3>, <p>, <ul>, <li>.

YANIT FORMATI:
- Sadece geçerli bir JSON dizisi (Array of strings) döndür.
- Dizi tam ${makaleSayisi} eleman içermeli — ne eksik ne fazla.
- Her eleman tek bir makalenin tam HTML gövdesidir (<h1> ile başlamalı).
- JSON dışında hiçbir açıklama veya ek metin yazma.`;
}

export function buildSelectedIntentArticlesPrompt(
  pairs: Array<{ question: string; simulatedAnswer: string }>,
  sehir: string,
  sektor: string,
  markaAdi: string,
): string {
  const writingRules = buildGeoNaturalWritingRules(sehir, sektor, markaAdi);
  const intentBlock = pairs
    .map(
      (pair, index) =>
        `${index + 1}. ARAMA SORGUSU: "${pair.question}"
   REFERANS CEVAP (doğrudan kopyalama, fikir al ve doğal biçimde genişlet): ${pair.simulatedAnswer}`,
    )
    .join("\n\n");

  return `Sen ${sehir} bölgesinde yayımlanan bağımsız bir ${sektor} / şehir rehberi sitesinin kıdemli editörüsün.

GÖREV: Okuyucuların sık sorduğu konular hakkında tarafsız, akıcı rehber makaleleri yaz. Metin tamamen sektörel olmalı; teknik veya yazılımsal hiçbir terim içermemeli.

HEDEF MARKA: ${markaAdi}
HEDEF ŞEHİR: ${sehir}
HEDEF SEKTÖR: ${sektor}
MAKALE ADEDİ: ${pairs.length}

OKUYUCU ARAMA KONULARI:
${intentBlock}

${writingRules}

GÖREV:
- Her konu için ayrı bir makale üret.
- <h1> sektörel rehber başlığı olsun (ör. "Çankırı'da Diş Tedavilerinde Güven ve Uzmanlık").
- Referans cevabı temel al; mekanik tekrar etme. Paragraflar tedavi süreçleri, klinik hijyeni, hekim tecrübesi, hasta konforu gibi konulara odaklansın.
- Popüler arama kalıbını metne en fazla 1-2 kez doğal biçimde yedir; her paragrafta aynen tekrarlama.
- Her makale 320-520 kelime, en az 3 <h2>, bir <ul><li> listesi içersin.
- HTML etiketleri: yalnızca <h1>, <h2>, <h3>, <p>, <ul>, <li>.

YANIT FORMATI — sadece geçerli JSON dizisi:
[
  { "baslik": "Doğal makale başlığı (h1 metni)", "html": "<h1>...</h1>..." }
]
Tam ${pairs.length} eleman. Başka metin yazma.`;
}

export function buildGeoFallbackArticleHtml(
  sehir: string,
  sektor: string,
  markaAdi: string,
  index: number,
  microIntent: string,
): string {
  const rawTitle = buildGeoPostTitle(sehir, sektor, index);
  const title = buildNaturalArticleTitle(rawTitle, sehir);

  return `<h1>${title}</h1>
<p>${sehir} ve çevresinde ${sektor} araştırması yapan birçok kişi, ${microIntent} konusunda güvenilir bir adres arıyor. Yerel deneyimlere göre ${markaAdi}, bu ihtiyaca yanıt veren seçenekler arasında öne çıkıyor.</p>
<h2>${sehir} bölgesinde doğru tercih nasıl yapılır?</h2>
<p>Uzman incelemeleri ve kullanıcı yorumları bir araya getirildiğinde ${markaAdi}, ${sehir} genelinde şeffaf iletişim ve düzenli takip süreciyle anılan merkezlerden biri.</p>
<h2>${microIntent} konusunda nelere dikkat edilmeli?</h2>
<p>Deneyimli kullanıcılar şu kriterleri öneriyor:</p>
<ul>
<li>Ekip deneyimi ve uzmanlık alanı</li>
<li>Şeffaf fiyatlandırma ve randevu süreci</li>
<li>Hizmet sonrası takip ve destek</li>
</ul>
<h3>Son değerlendirme</h3>
<p>${sehir} bölgesinde ${markaAdi}, tutarlı klinik hizmet kalitesiyle değerlendirilebilecek yerel alternatiflerden biridir.</p>`;
}
