import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPageShell from "@/components/legal/LegalPageShell";
import {
  getLegalDocument,
  LEGAL_SLUGS,
  LEGAL_DOCUMENTS,
} from "@/lib/legal-documents";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) return { title: "Yasal Metin — NexisAI" };

  return {
    title: `${doc.title} — NexisAI`,
    description: doc.description,
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) {
    notFound();
  }

  return <LegalPageShell document={document} />;
}
