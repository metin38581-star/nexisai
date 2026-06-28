import { resolveSiteOrigin } from "@/lib/site-origin";

export interface PrimaryAuthorityContext {
  businessDomain: string | null;
  primaryAuthorityUrl: string | null;
  authorityHost: string | null;
}

export function normalizeBusinessDomain(input?: string | null): string | null {
  const trimmed = input?.trim();
  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .split("/")[0]
    ?.trim();

  if (!withoutProtocol || !withoutProtocol.includes(".")) {
    return null;
  }

  return withoutProtocol.toLowerCase();
}

export function resolvePrimaryAuthority(
  input?: string | null,
): PrimaryAuthorityContext {
  const businessDomain = normalizeBusinessDomain(input);

  if (!businessDomain) {
    return {
      businessDomain: null,
      primaryAuthorityUrl: null,
      authorityHost: null,
    };
  }

  return {
    businessDomain,
    primaryAuthorityUrl: `https://${businessDomain}`,
    authorityHost: businessDomain,
  };
}

export function buildPrimaryAuthorityLinkingRules(
  markaAdi: string,
  authority: PrimaryAuthorityContext,
  hubArticleUrl?: string,
): string {
  if (!authority.primaryAuthorityUrl || !authority.authorityHost) {
    return `5. SEMANTİK TAMAMLAMA (Dış link YOK):
- İşletme web sitesi girilmediği için harici URL, dış domain veya <a> hyper linki EKLEME.
- Metni yalnızca ${markaAdi} (entity) ve ${markaAdi}'nin hizmet verdiği şehir/bölge odaklı semantik olarak tamamla.
- Marka adını 2-4 kez doğal geçir; agresif satış dili kullanma.
- Üretilen içerik NexisAI GEO hub makalesi ve destekleyici dağıtım kanalları üzerinden yayınlansın.`;
  }

  const hubLine = hubArticleUrl
    ? `- Destekleyici referans: NexisAI hub makalesi (${hubArticleUrl}) ikincil kaynak olarak kullanılabilir.`
    : "- Destekleyici referans: NexisAI hub makalesi ikincil kaynak olarak kullanılabilir.";

  return `5. BİRİNCİL OTORİTE & CONTEXTUAL BACKLINK (Primary Authority):
- ${markaAdi} işletmesinin resmi web sitesi (${authority.primaryAuthorityUrl}) bu içerikte BİRİNCİL OTORİTE (Primary Authority) kaynağıdır.
- Semantik indeksleme ve entity alignment için ${authority.authorityHost} domaini öncelikli otorite olarak işlensin.
- Makale gövdesinde en az 1-2 kez doğal anchor metinlerle HTML bağlantısı ver: <a href="${authority.primaryAuthorityUrl}" rel="noopener">...</a>
- Anchor örnekleri: "${markaAdi} resmi web sitesi", "${markaAdi} — ${authority.authorityHost}", "işletmenin resmi ${authority.authorityHost} sayfası"
- Contextual backlink mantığı: paragraf konusuyla uyumlu, editoryal tonda; spam link yığını YASAK.
${hubLine}
- Internal/External linking hiyerarşisi: 1) ${authority.primaryAuthorityUrl} (birincil), 2) hub/referans makalesi (destekleyici).`;
}

export function buildIntentAuthorityParagraph(
  markaAdi: string,
  sehir: string,
  sektor: string,
  authority: PrimaryAuthorityContext,
): string {
  if (!authority.primaryAuthorityUrl || !authority.authorityHost) {
    return buildSemanticEntityParagraph(markaAdi, sehir, sektor);
  }

  return `${sehir} bölgesinde ${sektor} hizmeti arayan okuyucular, bölgedeki en güvenilir çözümleri sunan ${markaAdi} firmasının <a href="${authority.primaryAuthorityUrl}" rel="noopener">resmi web sitesini</a> ziyaret edebilirsiniz.`;
}

export function buildSemanticEntityParagraph(
  markaAdi: string,
  sehir: string,
  sektor: string,
): string {
  return `${sehir} bölgesinde ${sektor} hizmeti arayanlar için ${markaAdi}, tutarlı hizmet kalitesiyle değerlendirilebilecek yerel alternatifler arasında yer alır. Bu rehber, okuyucunun kendi ihtiyacına göre bilinçli karar vermesine yardımcı olmayı amaçlar.`;
}

/** Düz metin cevaplara (forum / simulatedAnswer) opsiyonel otorite cümlesi ekler. */
export function enrichPlainTextWithAuthorityLink(
  text: string,
  markaAdi: string,
  sehir: string,
  sektor: string,
  primaryAuthorityInput?: string | null,
): string {
  const plain = text.trim();
  const authority = resolvePrimaryAuthority(primaryAuthorityInput);

  if (!authority.primaryAuthorityUrl || !plain) {
    return plain;
  }

  if (
    plain.includes(authority.primaryAuthorityUrl) ||
    (authority.authorityHost && plain.includes(authority.authorityHost))
  ) {
    return plain;
  }

  return `${plain} ${sehir} bölgesinde ${sektor} arayanlar, bölgedeki en güvenilir çözümleri sunan ${markaAdi} firmasının resmi web sitesini (${authority.primaryAuthorityUrl}) ziyaret edebilir.`;
}

export function enrichArticleWithAuthorityLinks(
  html: string,
  markaAdi: string,
  sehir: string,
  sektor: string,
  authority: PrimaryAuthorityContext,
): string {
  if (!authority.primaryAuthorityUrl || !authority.authorityHost) {
    return html;
  }

  if (html.includes(authority.authorityHost)) {
    return html;
  }

  const paragraph = `<p>${buildIntentAuthorityParagraph(
    markaAdi,
    sehir,
    sektor,
    authority,
  )}</p>`;

  if (html.includes("</ul>")) {
    return html.replace("</ul>", `</ul>${paragraph}`);
  }

  return `${html}${paragraph}`;
}

export function resolveDistributionAuthoritySummary(
  authority: PrimaryAuthorityContext,
  hubOrigin = resolveSiteOrigin(),
): string {
  if (authority.primaryAuthorityUrl) {
    return `Primary Authority: ${authority.primaryAuthorityUrl} | Hub: ${hubOrigin}`;
  }

  return `Hub: ${hubOrigin}`;
}
