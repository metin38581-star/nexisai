export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  kvkk: {
    slug: "kvkk",
    title: "KVKK Aydınlatma Metni",
    description:
      "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında NexisAI veri sorumlusu aydınlatma metni.",
    lastUpdated: "9 Haziran 2026",
    sections: [
      {
        title: "1. Veri Sorumlusu",
        paragraphs: [
          "6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca kişisel verileriniz; veri sorumlusu sıfatıyla NexisAI Teknolojileri (“NexisAI”) tarafından aşağıda açıklanan kapsamda işlenebilecektir.",
          "Unvan: NexisAI Teknolojileri | Vergi Dairesi: Kocasinan V.D. | Vergi No: 8370941679 | İletişim: support@nexisai.com",
        ],
      },
      {
        title: "2. İşlenen Kişisel Veriler",
        paragraphs: [
          "Platformumuz üzerinden aşağıdaki kişisel veri kategorileri işlenebilir:",
          "• Kimlik ve iletişim bilgileri: Ad soyad, e-posta adresi, telefon numarası (varsa).",
          "• Müşteri işlem bilgileri: Kampanya geçmişi, günlük bütçe tercihleri, cüzdan bakiye hareketleri, fatura ve ödeme kayıtları.",
          "• İşlem güvenliği bilgileri: IP adresi, oturum kayıtları, cihaz ve tarayıcı bilgileri, giriş-çıkış logları.",
          "• Pazarlama ve işletme bilgileri: Marka adı, sektör, şehir, kampanya hedefleri ve optimizasyon tercihleri.",
        ],
      },
      {
        title: "3. Kişisel Verilerin İşlenme Amaçları",
        paragraphs: [
          "Kişisel verileriniz; NexisAI Yapay Zeka Motoru Optimizasyonu (GEO) platformunun sunulması, kullanıcı hesabının oluşturulması ve yönetilmesi, kampanya operasyonlarının yürütülmesi, cüzdan bakiyesi ve harcama takibinin sağlanması, müşteri destek süreçlerinin yürütülmesi, bilgi güvenliği ve dolandırıcılık önleme kontrollerinin gerçekleştirilmesi, yasal yükümlülüklerin yerine getirilmesi ve meşru menfaatlerimiz kapsamında hizmet kalitesinin artırılması amaçlarıyla işlenmektedir.",
        ],
      },
      {
        title: "4. Kişisel Verilerin Aktarılması",
        paragraphs: [
          "Kişisel verileriniz; yalnızca hizmetin ifası için gerekli olduğu ölçüde ve KVKK’da öngörülen şartlara uygun olarak; ödeme altyapısı sağlayıcıları, barındırma (hosting) hizmeti sunucuları, e-posta ve bildirim servisleri, yasal danışmanlık ve mali müşavirlik hizmeti alınan kuruluşlar ile yetkili kamu kurum ve kuruluşlarına aktarılabilir.",
          "Verileriniz, açık rızanız olmaksızın yurt dışına aktarılmaz; yurt dışı aktarım gerekmesi halinde KVKK’nın 9. maddesindeki şartlara uygun hareket edilir.",
        ],
      },
      {
        title: "5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi",
        paragraphs: [
          "Kişisel verileriniz; web sitesi, kullanıcı paneli, kayıt formları, destek talepleri, çerezler ve benzeri otomatik veya otomatik olmayan yollarla elektronik ortamda toplanmaktadır.",
          "Hukuki sebepler: Bir sözleşmenin kurulması veya ifası (KVKK m.5/2-c), veri sorumlusunun hukuki yükümlülüğü (m.5/2-ç), bir hakkın tesisi, kullanılması veya korunması (m.5/2-e) ve ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaatleri (m.5/2-f).",
        ],
      },
      {
        title: "6. KVKK Kapsamındaki Haklarınız",
        paragraphs: [
          "KVKK’nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, KVKK’da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme, otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz.",
          "Taleplerinizi support@nexisai.com adresine iletebilirsiniz. Başvurularınız en geç 30 gün içinde sonuçlandırılır.",
        ],
      },
    ],
  },
  "kullanim-sartlari": {
    slug: "kullanim-sartlari",
    title: "Kullanıcı Sözleşmesi (ToS)",
    description:
      "NexisAI platformunun kullanım koşulları, hak ve yükümlülükler.",
    lastUpdated: "9 Haziran 2026",
    sections: [
      {
        title: "1. Taraflar ve Konu",
        paragraphs: [
          "İşbu Kullanıcı Sözleşmesi (“Sözleşme”); NexisAI Teknolojileri (“NexisAI”, “Platform”) ile platforma kayıt olan veya hizmetlerden yararlanan gerçek veya tüzel kişi kullanıcı (“Kullanıcı”) arasında akdedilmiştir.",
          "Sözleşme; Yapay Zeka Motoru Optimizasyonu (GEO) hizmetlerinin, kampanya yönetim panelinin, cüzdan sisteminin ve ilgili dijital araçların kullanımına ilişkin şartları düzenler.",
        ],
      },
      {
        title: "2. Hizmetin Kapsamı",
        paragraphs: [
          "NexisAI; işletmelerin yapay zeka asistanları ve arama motorlarında görünürlüklerini artırmaya yönelik semantik içerik optimizasyonu, dağıtım planlaması, bütçe yönetimi ve analiz raporlama araçları sunar.",
          "Platform; “Kullandığın Kadar Öde” (pay-as-you-go) modeli ile çalışır. Kullanıcı, cüzdanına yüklediği bakiye üzerinden günlük bütçe ve operasyon süresini kendi belirler.",
          "NexisAI, üçüncü taraf yapay zeka servislerinin (OpenAI, Google, Perplexity vb.) algoritmalarını doğrudan kontrol etmez; optimizasyon sonuçları sektörel verilere, içerik kalitesine ve pazar dinamiklerine bağlı olarak değişebilir.",
        ],
      },
      {
        title: "3. Hesap Oluşturma ve Güvenlik",
        paragraphs: [
          "Kullanıcı, kayıt sırasında doğru, güncel ve eksiksiz bilgi vermekle yükümlüdür. Hesap bilgilerinin gizliliği ve yetkisiz kullanımından Kullanıcı sorumludur.",
          "NexisAI, şüpheli işlem, kötüye kullanım veya yasalara aykırı faaliyet tespitinde hesabı askıya alma veya sonlandırma hakkını saklı tutar.",
        ],
      },
      {
        title: "4. Kullanım Kuralları",
        paragraphs: [
          "Kullanıcı; yürürlükteki mevzuata, etik kurallara ve platform politikalarına uygun hareket edeceğini kabul eder.",
          "Sahte, yanıltıcı, hak ihlali içeren, nefret söylemi barındıran veya yasa dışı içeriklerin optimizasyonu amacıyla platform kullanılamaz.",
          "Otomatik bot saldırıları, sistem güvenliğini zedeleyecek girişimler ve hizmet altyapısına zarar verecek eylemler kesinlikle yasaktır.",
        ],
      },
      {
        title: "5. Ücretlendirme ve İade",
        paragraphs: [
          "Hizmet bedelleri, Kullanıcının belirlediği günlük bütçe ve operasyon süresine göre cüzdan bakiyesinden düşülür. Sabit abonelik veya gizli aidat uygulanmaz.",
          "Kullanılmayan bakiye, yasal süreler ve ödeme altyapısı kuralları çerçevesinde iade talebine konu edilebilir. Detaylar Mesafeli Satış Sözleşmesi’nde düzenlenmiştir.",
        ],
      },
      {
        title: "6. Fikri Mülkiyet",
        paragraphs: [
          "Platform arayüzü, yazılım kodu, marka, logo, algoritma altyapısı ve dokümantasyon NexisAI’ye aittir. İzinsiz kopyalama, tersine mühendislik veya ticari amaçla çoğaltma yasaktır.",
          "Kullanıcının yüklediği marka adı, işletme bilgileri ve kampanya içeriklerinin hakları Kullanıcıya aittir; NexisAI’ye hizmetin sunulması için sınırlı kullanım lisansı verilmiş sayılır.",
        ],
      },
      {
        title: "7. Sorumluluk Sınırı",
        paragraphs: [
          "NexisAI, hizmeti “olduğu gibi” sunar. Belirli bir sıralama, tavsiye listesine girme veya gelir artışı garantisi verilmez.",
          "Mücbir sebep, üçüncü taraf servis kesintileri ve Kullanıcı kaynaklı hatalardan doğan zararlardan NexisAI sorumlu tutulamaz.",
        ],
      },
      {
        title: "8. Yürürlük ve Uyuşmazlık",
        paragraphs: [
          "Kullanıcı, platforma kayıt olarak veya hizmeti kullanarak işbu Sözleşme’yi kabul etmiş sayılır.",
          "Uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır. Kayseri Mahkemeleri ve İcra Daireleri yetkilidir.",
        ],
      },
    ],
  },
  gizlilik: {
    slug: "gizlilik",
    title: "Gizlilik ve Çerez Politikası",
    description:
      "NexisAI gizlilik ilkeleri, çerez kullanımı ve veri güvenliği uygulamaları.",
    lastUpdated: "9 Haziran 2026",
    sections: [
      {
        title: "1. Gizlilik Taahhüdümüz",
        paragraphs: [
          "NexisAI Teknolojileri olarak kişisel verilerinizin gizliliğine önem veriyoruz. Bu politika; web sitemiz ve kullanıcı panelimiz üzerinden toplanan bilgilerin nasıl kullanıldığını, korunduğunu ve paylaşıldığını açıklar.",
        ],
      },
      {
        title: "2. Toplanan Bilgiler",
        paragraphs: [
          "Doğrudan sağladığınız bilgiler: Kayıt formu (ad soyad, e-posta, şifre), kampanya parametreleri (marka, sektör, şehir, bütçe), destek talepleri.",
          "Otomatik toplanan bilgiler: IP adresi, tarayıcı türü, işletim sistemi, oturum süresi, tıklama ve gezinme verileri, hata logları.",
          "Ödeme bilgileri: Kredi kartı verileri doğrudan NexisAI sunucularında saklanmaz; lisanslı ödeme kuruluşları aracılığıyla işlenir.",
        ],
      },
      {
        title: "3. Bilgilerin Kullanım Amaçları",
        paragraphs: [
          "Toplanan veriler; hizmet sunumu, kimlik doğrulama, kampanya yönetimi, faturalandırma, teknik destek, platform güvenliği, performans analizi, yasal yükümlülüklerin yerine getirilmesi ve — açık rıza vermeniz halinde — bilgilendirme iletişimleri için kullanılır.",
        ],
      },
      {
        title: "4. Veri Güvenliği",
        paragraphs: [
          "Verileriniz; SSL/TLS şifreleme, erişim kontrolü, güvenlik duvarları ve düzenli yedekleme prosedürleri ile korunur. Yetkisiz erişim, ifşa, değiştirme veya imha risklerine karşı teknik ve idari tedbirler uygulanmaktadır.",
          "Şifreleriniz hash algoritmaları ile saklanır; düz metin olarak tutulmaz.",
        ],
      },
      {
        title: "5. Çerezler (Cookies)",
        paragraphs: [
          "Web sitemiz ve panelimiz, deneyiminizi iyileştirmek için çerezler kullanabilir:",
          "• Zorunlu çerezler: Oturum yönetimi, güvenlik doğrulaması ve temel site işlevleri için gereklidir.",
          "• Performans çerezleri: Ziyaret istatistikleri ve sayfa kullanım analizi (anonimleştirilmiş).",
          "• Tercih çerezleri: Dil, tema ve kullanıcı arayüzü tercihlerinizi hatırlar.",
          "Tarayıcı ayarlarınızdan çerezleri reddedebilir veya silebilirsiniz; ancak bazı platform özellikleri kısıtlanabilir.",
        ],
      },
      {
        title: "6. Üçüncü Taraf Hizmetler",
        paragraphs: [
          "Analitik, barındırma, ödeme ve e-posta servis sağlayıcıları yalnızca hizmetin ifası için gerekli verilere erişebilir. Bu sağlayıcılar kendi gizlilik politikalarına tabidir.",
        ],
      },
      {
        title: "7. Saklama Süresi",
        paragraphs: [
          "Kişisel verileriniz; işleme amacının gerektirdiği süre boyunca ve yasal saklama yükümlülükleri çerçevesinde muhafaza edilir. Süre sonunda silinir, yok edilir veya anonim hale getirilir.",
        ],
      },
      {
        title: "8. İletişim",
        paragraphs: [
          "Gizlilik ve çerez politikası hakkında sorularınız için: support@nexisai.com",
          "KVKK kapsamındaki haklarınıza ilişkin detaylı bilgi için KVKK Aydınlatma Metni’ni inceleyebilirsiniz.",
        ],
      },
    ],
  },
  "mesafeli-satis": {
    slug: "mesafeli-satis",
    title: "Mesafeli Satış Sözleşmesi",
    description:
      "6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında mesafeli hizmet satış sözleşmesi.",
    lastUpdated: "9 Haziran 2026",
    sections: [
      {
        title: "1. Taraflar",
        paragraphs: [
          "SATICI: NexisAI Teknolojileri | Vergi Dairesi: Kocasinan V.D. | Vergi No: 8370941679 | E-posta: support@nexisai.com",
          "ALICI: Platform üzerinden dijital hizmet satın alan, kayıt sırasında kimlik ve iletişim bilgilerini beyan eden gerçek veya tüzel kişi.",
        ],
      },
      {
        title: "2. Sözleşmenin Konusu",
        paragraphs: [
          "İşbu sözleşmenin konusu; ALICI’nın NexisAI platformu üzerinden elektronik ortamda sipariş verdiği Yapay Zeka Motoru Optimizasyonu (GEO) dijital hizmetinin satışı ve ifasına ilişkin tarafların hak ve yükümlülüklerinin belirlenmesidir.",
          "Hizmet; kampanya oluşturma, semantik içerik optimizasyonu, dağıtım planlaması, analiz raporlama ve cüzdan tabanlı bütçe yönetimini kapsayan dijital platform erişimidir.",
        ],
      },
      {
        title: "3. Hizmet Bilgileri ve Bedel",
        paragraphs: [
          "Hizmet bedeli; ALICI tarafından belirlenen günlük bütçe ve operasyon gün sayısına göre hesaplanır. Toplam tutar, kampanya başlatılmadan önce panelde açıkça gösterilir.",
          "Ödeme; cüzdan bakiyesi yükleme yoluyla gerçekleştirilir. Fiyatlara KDV dahil/değil durumu ödeme ekranında belirtilir.",
        ],
      },
      {
        title: "4. Hizmetin İfası",
        paragraphs: [
          "Dijital hizmet, ödeme onayı ve kampanya başlatma işlemi ile derhal ifaya başlar. ALICI, operasyon panelinden canlı analiz terminali ve raporlama araçlarına erişebilir.",
          "Hizmetin niteliği gereği fiziksel teslimat söz konusu değildir.",
        ],
      },
      {
        title: "5. Cayma Hakkı",
        paragraphs: [
          "6502 sayılı Kanun’un 15. maddesi uyarınca; elektronik ortamda anında ifa edilen hizmetler ve tüketiciye anında teslim edilen gayrimaddi mallarda, ALICI’nın onayı ile ifaya başlandığı takdirde cayma hakkı kullanılamaz.",
          "ALICI, dijital hizmetin derhal başlayacağını bildiğini ve onayladığını kabul eder.",
          "Kullanılmamış cüzdan bakiyesi için, hizmet ifasına başlanmamış tutarlar bakımından iade talebi support@nexisai.com üzerinden değerlendirilebilir.",
        ],
      },
      {
        title: "6. ALICI’nın Yükümlülükleri",
        paragraphs: [
          "ALICI; doğru bilgi vermek, hesap güvenliğini sağlamak, yasalara uygun kampanya içeriği kullanmak ve platform kurallarına uymakla yükümlüdür.",
          "Yanlış veya eksik bilgiden kaynaklanan hizmet aksaklıklarından ALICI sorumludur.",
        ],
      },
      {
        title: "7. SATICI’nın Yükümlülükleri",
        paragraphs: [
          "NexisAI; hizmeti sözleşmeye uygun sunmak, teknik altyapıyı makul ölçüde kesintisiz tutmak ve kişisel verileri KVKK’ya uygun işlemekle yükümlüdür.",
          "Mücbir sebep hallerinde hizmet geçici olarak askıya alınabilir; ALICI bilgilendirilir.",
        ],
      },
      {
        title: "8. Uyuşmazlık Çözümü",
        paragraphs: [
          "ALICI; Tüketici sorunları için Tüketici Hakem Heyetlerine ve Tüketici Mahkemelerine başvurabilir.",
          "Parasal sınırlar her yıl Gümrük ve Ticaret Bakanlığı tarafından ilan edilen değerlere tabidir.",
          "Ticari nitelikteki işlemlerde Kayseri Mahkemeleri ve İcra Daireleri yetkilidir.",
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCUMENTS);

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS[slug];
}
