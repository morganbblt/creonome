import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/src/features/legal/legal-page";
import {
  legalDocuments,
  type LegalDocumentSlug,
} from "@/src/features/legal/legal-documents";

type LegalRouteProps = {
  params: Promise<{ document: string }>;
};

function isLegalDocument(value: string): value is LegalDocumentSlug {
  return value in legalDocuments;
}

export function generateStaticParams() {
  return Object.keys(legalDocuments).map((document) => ({ document }));
}

export async function generateMetadata({
  params,
}: LegalRouteProps): Promise<Metadata> {
  const { document } = await params;
  return isLegalDocument(document)
    ? { title: legalDocuments[document].title }
    : {};
}

export default async function LegalDocumentPage({ params }: LegalRouteProps) {
  const { document } = await params;

  if (!isLegalDocument(document)) {
    notFound();
  }

  return <LegalPage document={document} />;
}
