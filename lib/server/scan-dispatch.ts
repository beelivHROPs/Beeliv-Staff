import "server-only";

/**
 * Sends the "scan now" signal to the GitHub workflow (.github/workflows/scan-staff-documents.yml) after a Staff upload
 * completes, so a file is checked within minutes instead of waiting for the two-hourly safety run.
 *
 * Inert unless GITHUB_SCAN_DISPATCH_TOKEN and GITHUB_SCAN_REPOSITORY ("owner/name") are set on the server. The token must be a
 * fine-grained GitHub token limited to this ONE repository with "Contents: read and write" (needed by repository_dispatch)
 * and nothing else. Never throws and never logs the token: a failed signal only delays scanning until the next safety run.
 */
export async function requestDocumentScan(fetcher: typeof fetch = fetch): Promise<boolean> {
  const token = process.env.GITHUB_SCAN_DISPATCH_TOKEN;
  const repository = process.env.GITHUB_SCAN_REPOSITORY;
  if (!token || !repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return false;
  try {
    const response = await fetcher(`https://api.github.com/repos/${repository}/dispatches`, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "scan-staff-documents" }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
