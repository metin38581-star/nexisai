"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Link2,
  Loader2,
  Search,
  Shield,
  Users,
  Wallet,
} from "lucide-react";

import type {
  AdminCampaignOverviewRow,
  AdminOverviewStats,
} from "@/types/admin";
import BackgroundGlow from "@/components/layout/BackgroundGlow";
import ChannelDistributionMatrix from "@/components/admin/ChannelDistributionMatrix";
import CampaignDetailModal from "@/components/admin/CampaignDetailModal";
import { ADMIN_BUSINESS_PATH, ADMIN_LOGIN_PATH } from "@/lib/admin-routes";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const filterInputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20";

function formatTry(amount: number): string {
  return `₺${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function KpiCard({
  label,
  value,
  icon,
  accentClass,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="glass-card border border-violet-500/15 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [rows, setRows] = useState<AdminCampaignOverviewRow[]>([]);
  const [stats, setStats] = useState<AdminOverviewStats>({
    totalUsers: 0,
    totalSystemBalance: 0,
    totalLinksPublished: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/overview", {
        credentials: "include",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        needsLogin?: boolean;
        rows?: AdminCampaignOverviewRow[];
        stats?: AdminOverviewStats;
      };

      if (!response.ok) {
        if (payload.needsLogin) {
          window.location.href = ADMIN_LOGIN_PATH;
          return;
        }
        setError(payload.error ?? "Veri özeti alınamadı.");
        setRows([]);
        return;
      }

      setRows(payload.rows ?? []);
      setStats(
        payload.stats ?? {
          totalUsers: 0,
          totalSystemBalance: 0,
          totalLinksPublished: 0,
        },
      );
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const cityOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.city).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "tr"),
      ),
    [rows],
  );

  const sectorOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.sectorLabel).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "tr")),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      if (cityFilter && row.city !== cityFilter) {
        return false;
      }

      if (sectorFilter && row.sectorLabel !== sectorFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        row.userEmail,
        row.businessName,
        row.sectorLabel,
        row.city,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [cityFilter, rows, searchQuery, sectorFilter]);

  const handleLogout = async () => {
    await fetch("/api/admin/standalone-auth", {
      method: "DELETE",
      credentials: "include",
    });
    window.location.href = ADMIN_LOGIN_PATH;
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <BackgroundGlow />

      <div className="relative z-10 mx-auto max-w-[1600px] px-6 py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-400">
              NexisAI SuperAdmin
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Merkezi Veri Takip Sistemi
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Kullanıcılar, cüzdan bakiyeleri, WordPress blog linkleri ve forum
              soru-cevap yayınlarını tek tablodan izleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={ADMIN_BUSINESS_PATH}
              className="rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-violet-500/30 hover:text-white"
            >
              İşletme Paneli
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400/40"
            >
              Çıkış Yap
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-violet-200">
              <Shield className="h-4 w-4" />
              Bağımsız Oturum
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            label="Toplam Kullanıcı"
            value={stats.totalUsers.toLocaleString("tr-TR")}
            icon={<Users className="h-5 w-5 text-violet-300" />}
            accentClass="border-violet-500/25 bg-violet-500/10"
          />
          <KpiCard
            label="Sistemdeki Toplam Bakiye (TL)"
            value={formatTry(stats.totalSystemBalance)}
            icon={<Wallet className="h-5 w-5 text-emerald-300" />}
            accentClass="border-emerald-500/25 bg-emerald-500/10"
          />
          <KpiCard
            label="Toplam Üretilen Link"
            value={stats.totalLinksPublished.toLocaleString("tr-TR")}
            icon={<Link2 className="h-5 w-5 text-cyan-300" />}
            accentClass="border-cyan-500/25 bg-cyan-500/10"
          />
        </div>

        <div className="glass-card mb-4 border border-violet-500/15 p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Mail, işletme adı, şehir veya sektör ara..."
                className={`${filterInputClass} pl-10`}
              />
            </label>

            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className={filterInputClass}
            >
              <option value="">Tüm Şehirler</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value)}
              className={filterInputClass}
            >
              <option value="">Tüm Sektörler</option>
              {sectorOptions.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="glass-card overflow-hidden border border-violet-500/15">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              Merkezi veri tablosu yükleniyor...
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-zinc-950/70 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    <th className="px-4 py-3 font-semibold">Kullanıcı Mail</th>
                    <th className="px-4 py-3 font-semibold">
                      İşletme / Sektör / Şehir
                    </th>
                    <th className="px-4 py-3 font-semibold">Yüklenen Bakiye</th>
                    <th className="px-4 py-3 font-semibold">
                      Kanal Dağıtım Matrisi
                    </th>
                    <th className="px-4 py-3 font-semibold">Kampanya Tarihi</th>
                    <th className="px-4 py-3 font-semibold">İçerikler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-zinc-500"
                      >
                        Filtrelere uygun kampanya kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.campaignId}
                        className="border-b border-white/5 transition hover:bg-violet-500/5"
                      >
                        <td className="px-4 py-3 align-top text-zinc-200">
                          {row.userEmail}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-white">
                            {row.businessName}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {row.sectorLabel} · {row.city}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            Cüzdan: {formatTry(row.walletBalance)} · Harcanan:{" "}
                            {formatTry(row.amountSpent ?? 0)}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top font-medium text-emerald-300">
                          {formatTry(row.totalDeposited)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <ChannelDistributionMatrix row={row} />
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-zinc-400">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedCampaignId(row.campaignId)}
                            className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/15"
                          >
                            Tüm İçerik
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error ? (
          <p className="mt-4 text-xs text-zinc-600">
            {filteredRows.length.toLocaleString("tr-TR")} /{" "}
            {rows.length.toLocaleString("tr-TR")} kampanya gösteriliyor
          </p>
        ) : null}
      </div>

      <CampaignDetailModal
        campaignId={selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
      />
    </div>
  );
}
