"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

import type { AdminCampaignDetail } from "@/types/admin";
import CampaignContentInventory from "@/components/admin/CampaignContentInventory";

interface CampaignDetailModalProps {
  campaignId: string | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignDetailModal({
  campaignId,
  onClose,
}: CampaignDetailModalProps) {
  const [detail, setDetail] = useState<AdminCampaignDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
          credentials: "include",
        });
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          needsLogin?: boolean;
          campaign?: AdminCampaignDetail;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(payload.error ?? "Kampanya detayı alınamadı.");
          setDetail(null);
          return;
        }

        setDetail(payload.campaign ?? null);
      } catch {
        if (!cancelled) {
          setError("Bağlantı hatası. Lütfen tekrar deneyin.");
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (!campaignId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-violet-500/20 bg-zinc-950 shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-400">
              Kampanya İçerik Envanteri
            </p>
            {detail ? (
              <>
                <h2 className="mt-1 text-xl font-bold text-white">
                  {detail.markaAdi}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {detail.sectorLabel} · {detail.sehir} · {detail.userEmail}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {formatDate(detail.createdAt)} ·{" "}
                  {detail.contentInventory.length} içerik
                </p>
              </>
            ) : (
              <h2 className="mt-1 text-xl font-bold text-white">
                Kampanya yükleniyor...
              </h2>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              Yayınlanan içerikler getiriliyor...
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          ) : detail ? (
            <CampaignContentInventory
              rows={detail.contentInventory}
              publicationSummary={detail.publicationSummary}
            />
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-8 text-zinc-500">
              <Sparkles className="h-6 w-6 text-zinc-600" />
              <p className="text-sm">Kampanya kaydı bulunamadı.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
