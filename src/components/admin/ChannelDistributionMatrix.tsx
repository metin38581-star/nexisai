"use client";

import { ExternalLink } from "lucide-react";

import type { AdminCampaignOverviewRow } from "@/types/admin";

function ChannelLinkBadge({
  label,
  url,
  title,
}: {
  label: string;
  url: string | null;
  title: string;
}) {
  if (!url) {
    return (
      <span
        className="inline-flex cursor-not-allowed items-center rounded-md border border-zinc-800/90 bg-zinc-950/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600"
        title={`${title} — henüz yayınlanmadı`}
      >
        {label}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
      title={`${title}: ${url}`}
    >
      <ExternalLink className="h-3 w-3 shrink-0" />
      {label}
    </a>
  );
}

export default function ChannelDistributionMatrix({
  row,
}: {
  row: AdminCampaignOverviewRow;
}) {
  return (
    <div className="flex max-w-[320px] flex-wrap gap-1.5">
      <ChannelLinkBadge
        label="WP Resmi"
        url={row.wordpressUrl}
        title="WordPress"
      />
      <ChannelLinkBadge label="Hub" url={row.hubUrl} title="Makale Hub" />
      <ChannelLinkBadge label="Forum" url={row.forumUrl} title="Soru-Cevap Hub" />
      <ChannelLinkBadge label="Blog" url={row.blogUrl} title="Merkezi Blog" />
      <ChannelLinkBadge
        label="Otorite"
        url={row.primaryAuthorityUrl}
        title="İşletme Otorite Sitesi"
      />
    </div>
  );
}
