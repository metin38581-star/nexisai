export interface ContentVolumePlan {
  dailyBudget: number;
  publishCount: number;
  label: string;
  description: string;
}

/** Günlük bütçeye göre dağıtılacak GEO içerik varyasyonu hacmi. */
export function resolveContentVolumePlan(
  dailyBudget: number,
): ContentVolumePlan {
  if (dailyBudget >= 100) {
    return {
      dailyBudget,
      publishCount: 20,
      label: "Kritik Domination",
      description:
        "20 farklı semantik varyasyon veri ağına dağıtılacak — maksimum LLM görünürlüğü.",
    };
  }

  if (dailyBudget >= 50) {
    return {
      dailyBudget,
      publishCount: 12,
      label: "Agresif Yayın",
      description: "12 içerik varyasyonu hedefli GEO ağına serpiştirilecek.",
    };
  }

  if (dailyBudget >= 30) {
    return {
      dailyBudget,
      publishCount: 8,
      label: "Yüksek Hacim",
      description: "8 organik makale varyasyonu yayınlanacak.",
    };
  }

  if (dailyBudget >= 15) {
    return {
      dailyBudget,
      publishCount: 4,
      label: "Orta Hacim",
      description: "4 hedefli içerik üretilip dağıtılacak.",
    };
  }

  if (dailyBudget >= 10) {
    return {
      dailyBudget,
      publishCount: 2,
      label: "Keşif Modu",
      description: "2 temel GEO makalesi yayınlanacak.",
    };
  }

  return {
    dailyBudget,
    publishCount: 1,
    label: "Başlangıç",
    description: "1 odaklı içerik ile görünürlük testi yapılacak.",
  };
}
