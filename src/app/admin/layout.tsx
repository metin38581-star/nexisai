import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NexisAI Admin — İşletme Yönetimi",
  description: "Kayıtlı işletmeler, GEO kampanya geçmişi ve ödeme dökümleri.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
