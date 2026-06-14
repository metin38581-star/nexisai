import type { SubscriptionPlan } from "@/types/user";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "esnaf",
    name: "Esnaf Paketi",
    price: 1499,
    description: "Yapay zeka motorunda temel görünürlük",
    features: [
      "Temel yapay zeka görünürlük optimizasyonu",
      "Aylık performans raporu",
      "E-posta destek hattı",
      "1 işletme profili",
    ],
  },
  {
    id: "buyuyen",
    name: "Büyüyen İşletme Paketi",
    price: 2999,
    description: "Agresif yapay zeka yemlemesi ve ışık hızı indeksleme",
    features: [
      "Agresif yapay zeka yemleme protokolü",
      "Işık hızı indeksleme motoru",
      "Öncelikli canlı destek",
      "Sınırsız kampanya başlatma",
      "Gelişmiş görünürlük analizi",
    ],
    highlighted: true,
  },
];
