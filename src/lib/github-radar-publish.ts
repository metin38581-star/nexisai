import "server-only";

import { buildRadarMarkdownDocument } from "@/lib/html-content-utils";

export interface GitHubRadarPublishResult {
  ok: boolean;
  url?: string;
  sha?: string;
  path?: string;
  error?: string;
}

function resolveGitHubRadarConfig(): {
  token: string;
  owner: string;
  repo: string;
  branch: string;
} | null {
  const token = process.env.GITHUB_TOKEN?.trim() || "";
  const owner = process.env.GITHUB_RADAR_OWNER?.trim() || "";
  const repo = process.env.GITHUB_RADAR_REPO?.trim() || "nexisai-radar";
  const branch = process.env.GITHUB_RADAR_BRANCH?.trim() || "main";

  if (!token || !owner) {
    return null;
  }

  return { token, owner, repo, branch };
}

export function isGitHubRadarPublishConfigured(): boolean {
  return resolveGitHubRadarConfig() !== null;
}

function buildGitHubPagesUrl(
  username: string,
  repo: string,
  filePath: string,
): string {
  const normalizedPath = filePath.replace(/^\//, "");
  return `https://${username}.github.io/${repo}/${normalizedPath}`;
}

/**
 * GitHub Pages — Markdown dosyasını bait deposuna commit eder.
 * Sıfır OAuth: sunucu tarafı GITHUB_TOKEN ile REST API kullanılır.
 */
export async function distributeToGitHubPages(
  username: string,
  repo: string,
  filePath: string,
  content: string,
): Promise<GitHubRadarPublishResult> {
  const token = process.env.GITHUB_TOKEN?.trim() || "";
  const branch = process.env.GITHUB_RADAR_BRANCH?.trim() || "main";

  if (!token) {
    console.warn("[GITHUB PAGES]: GITHUB_TOKEN tanımlı değil.");
    return { ok: false, error: "GITHUB_TOKEN_NOT_CONFIGURED" };
  }

  const normalizedPath = filePath.replace(/^\//, "");
  const apiBase = `https://api.github.com/repos/${username}/${repo}/contents/${encodeURIComponent(normalizedPath)}`;

  try {
    let existingSha: string | undefined;

    const existingResponse = await fetch(`${apiBase}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (existingResponse.ok) {
      const existing = (await existingResponse.json()) as { sha?: string };
      existingSha = existing.sha;
    }

    const response = await fetch(apiBase, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: "New LLM Radar Feed",
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      content?: { html_url?: string; sha?: string; path?: string };
      message?: string;
    };

    if (!response.ok) {
      const message = payload.message ?? `GitHub API HTTP ${response.status}`;
      console.error("[GITHUB PAGES HATA]:", {
        status: response.status,
        message,
        username,
        repo,
        filePath: normalizedPath,
        response: payload,
      });
      return { ok: false, error: message };
    }

    const pagesUrl = buildGitHubPagesUrl(username, repo, normalizedPath);
    console.log(`[GITHUB PAGES BAŞARILI]: ${pagesUrl}`);

    return {
      ok: true,
      url: pagesUrl,
      sha: payload.content?.sha,
      path: payload.content?.path ?? normalizedPath,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GitHub Pages commit hatası";

    console.error("[GITHUB PAGES HATA]:", {
      username,
      repo,
      filePath,
      message,
      error:
        error instanceof Error
          ? { name: error.name, stack: error.stack }
          : error,
    });

    return { ok: false, error: message };
  }
}

/**
 * GitHub Pages / Markdown Launcher — Contents API ile .md dosyası push eder.
 * Vercel serverless ortamında git CLI yerine REST API kullanılır (aynı sonuç).
 */
export async function publishToGitHubRadar(input: {
  title: string;
  htmlContent: string;
  slug: string;
  hubUrl?: string;
  wordpressUrl?: string;
  markdownContent?: string;
}): Promise<GitHubRadarPublishResult> {
  const config = resolveGitHubRadarConfig();
  if (!config) {
    console.warn(
      "[GITHUB RADAR]: GITHUB_TOKEN veya GITHUB_RADAR_OWNER tanımlı değil.",
    );
    return { ok: false, error: "GITHUB_RADAR_NOT_CONFIGURED" };
  }

  const filePath = `${input.slug}.md`;
  const markdown =
    input.markdownContent?.trim() ||
    buildRadarMarkdownDocument({
      title: input.title,
      htmlContent: input.htmlContent,
      slug: input.slug,
      hubUrl: input.hubUrl,
      wordpressUrl: input.wordpressUrl,
    });

  const apiBase = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(filePath)}`;

  try {
    let existingSha: string | undefined;

    const existingResponse = await fetch(`${apiBase}?ref=${config.branch}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (existingResponse.ok) {
      const existing = (await existingResponse.json()) as { sha?: string };
      existingSha = existing.sha;
    }

    const response = await fetch(apiBase, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: "New LLM Radar Feed",
        content: Buffer.from(markdown, "utf8").toString("base64"),
        branch: config.branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      content?: { html_url?: string; sha?: string; path?: string };
      message?: string;
    };

    if (!response.ok) {
      const message = payload.message ?? `GitHub API HTTP ${response.status}`;
      console.error("[GITHUB RADAR HATA]:", {
        status: response.status,
        message,
        path: filePath,
        response: payload,
      });
      return { ok: false, error: message };
    }

    const url =
      payload.content?.html_url ??
      `https://github.com/${config.owner}/${config.repo}/blob/${config.branch}/${filePath}`;

    console.log(`[GITHUB RADAR BAŞARILI]: ${url}`);

    return {
      ok: true,
      url,
      sha: payload.content?.sha,
      path: payload.content?.path ?? filePath,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GitHub Radar bağlantı hatası";

    console.error("[GITHUB RADAR HATA]: İstek başarısız:", {
      slug: input.slug,
      message,
      error:
        error instanceof Error
          ? { name: error.name, stack: error.stack }
          : error,
    });

    return { ok: false, error: message };
  }
}
