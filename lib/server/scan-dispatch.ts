import "server-only";

/**
 * Sends the "scan now" signal to the GitHub workflow (.github/workflows/scan-staff-documents.yml) after a Staff upload
 * completes, so a file is checked within minutes instead of waiting for the two-hourly safety run.
 *
 * Inert unless GITHUB_SCAN_DISPATCH_TOKEN and GITHUB_SCAN_REPOSITORY ("owner/name") are set on the server. The token must be a
 * fine-grained GitHub token limited to this ONE repository with "Contents: read and write" (needed by repository_dispatch)
 * and nothing else. Never throws and never logs the token: a failed signal only delays scanning until the next safety run.
 */
export function requestDocumentScan(fetcher: typeof fetch = fetch): Promise<boolean> {
  return dispatch("scan-staff-documents", fetcher);
}

/**
 * Sends the "send email now" signal to the private workflow .github/workflows/send-auth-mail.yml right after an email is
 * queued, so it goes out within a minute or two instead of waiting for the hourly safety run. Same token, same repository
 * and same never-throw rules as requestDocumentScan. Call it AFTER the queue write has committed; a failed signal only
 * delays delivery and must never undo or fail the queued email.
 */
export function requestMailSend(fetcher: typeof fetch = fetch): Promise<boolean> {
  return dispatch("send-auth-mail", fetcher);
}

async function dispatch(eventType: "scan-staff-documents" | "send-auth-mail", fetcher: typeof fetch): Promise<boolean> {
  const token = process.env.GITHUB_SCAN_DISPATCH_TOKEN;
  const repository = process.env.GITHUB_SCAN_REPOSITORY;
  if (!token || !repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return false;
  try {
    const response = await fetcher(`https://api.github.com/repos/${repository}/dispatches`, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
