"use client";

import { ExternalLink, FileText, MessageSquare, MessagesSquare } from "lucide-react";

import type {
  AdminCampaignContentRow,
  AdminCampaignPublicationSummary,
  AdminContentKind,
  AdminContentLinkSet,
} from "@/types/admin";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindLabel(kind: AdminContentKind): string {
  switch (kind) {
    case "article":
      return "Makale";
    case "qa":
      return "Soru-Cevap";
    case "forum":
      return "Forum";
  }
}

function kindIcon(kind: AdminContentKind) {
  switch (kind) {
    case "article":
      return FileText;
    case "qa":
      return MessageSquare;
    case "forum":
      return MessagesSquare;
  }
}

function kindBadgeClass(kind: AdminContentKind): string {
  switch (kind) {
    case "article":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "qa":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
    case "forum":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
}

function CampaignSummaryLink({
  label,
  url,
}: {
  label: string;
  url: string | null;
}) {
  if (!url) {
    return (
      <span className="inline-flex rounded-md border border-zinc-800/90 bg-zinc-950/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
        {label}: —
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-200 transition hover:bg-violet-500/20"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function ContentLinkChip({
  label,
  url,
}: {
  label: string;
  url: string | null;
}) {
  if (!url) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-200 transition hover:bg-indigo-500/20"
    >
      {label}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function ContentLinks({ links }: { links: AdminContentLinkSet }) {
  const chips = [
    { label: "Hub", url: links.hubUrl },
    { label: "Blog", url: links.blogUrl },
    { label: "WP", url: links.wpUrl },
    { label: "Forum", url: links.forumUrl },
    { label: "Dış", url: links.externalUrl },
  ].filter((chip) => chip.url);

  if (chips.length === 0) {
    return <span className="text-xs text-zinc-600">Canlı link yok</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <ContentLinkChip key={chip.label} label={chip.label} url={chip.url} />
      ))}
    </div>
  );
}

export default function CampaignContentInventory({
  rows,
  publicationSummary,
}: {
  rows: AdminCampaignContentRow[];
  publicationSummary: AdminCampaignPublicationSummary;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-500 sm:px-5">
        Bu kampanya için üretilmiş içerik kaydı bulunamadı.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-white/5 px-4 py-3 sm:px-5">
        <CampaignSummaryLink
          label="Kampanya Hub"
          url={publicationSummary.hubUrl}
        />
        <CampaignSummaryLink
          label="Kampanya WP"
          url={publicationSummary.wordpressUrl}
        />
        <CampaignSummaryLink
          label="Kampanya Forum"
          url={publicationSummary.forumUrl}
        />
        <CampaignSummaryLink
          label="Kampanya Blog"
          url={publicationSummary.blogUrl}
        />
        <CampaignSummaryLink
          label="Otorite"
          url={publicationSummary.primaryAuthorityUrl}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-zinc-950/40 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 sm:px-5">Tür</th>
              <th className="px-4 py-2.5 sm:px-5">Başlık / Soru</th>
              <th className="hidden px-4 py-2.5 md:table-cell sm:px-5">
                Özet
              </th>
              <th className="px-4 py-2.5 sm:px-5">Canlı Linkler</th>
              <th className="hidden px-4 py-2.5 lg:table-cell sm:px-5">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const Icon = kindIcon(row.kind);

              return (
                <tr
                  key={`${row.kind}-${row.id}`}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 align-top sm:px-5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kindBadgeClass(row.kind)}`}
                    >
                      <Icon className="h-3 w-3" />
                      {kindLabel(row.kind)}
                    </span>
                  </td>
                  <td className="max-w-[240px] px-4 py-3 align-top font-medium text-zinc-100 sm:max-w-xs sm:px-5">
                    {row.title}
                  </td>
                  <td className="hidden max-w-sm px-4 py-3 align-top text-xs leading-relaxed text-zinc-500 md:table-cell sm:px-5">
                    {row.excerpt || "—"}
                  </td>
                  <td className="px-4 py-3 align-top sm:px-5">
                    <ContentLinks links={row.links} />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 align-top text-xs text-zinc-500 lg:table-cell sm:px-5">
                    {formatDate(row.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
