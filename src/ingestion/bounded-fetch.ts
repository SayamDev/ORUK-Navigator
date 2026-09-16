import { lookup as nodeLookup } from "node:dns/promises";
import { BlockList } from "node:net";

import { assertAdmittedSource, type SourceManifestEntry } from "@/ingestion/source-manifest";

type DnsAddress = { address: string; family: number };

type FetchDependencies = {
  fetch?: typeof fetch;
  lookup?: (hostname: string) => Promise<DnsAddress[]>;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type FetchedSourcePage = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  bytes: Uint8Array;
  retryCount: number;
  retrievedAt: Date;
};

export type FetchBoundaryCode =
  | "dns_not_public"
  | "redirect_not_allowed"
  | "redirect_limit"
  | "authentication_required"
  | "http_status"
  | "content_type"
  | "response_too_large"
  | "timeout"
  | "connection_error";

export class FetchBoundaryError extends Error {
  constructor(
    public readonly code: FetchBoundaryCode,
    message: string,
    public readonly retryCount = 0,
  ) {
    super(message);
    this.name = "FetchBoundaryError";
  }
}

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

const userAgent =
  "ORUK-Navigator/0.1 (+https://github.com/SayamDev/ORUK-Navigator; reviewed-source-check)";

export async function fetchSourcePage(
  source: SourceManifestEntry,
  dependencies: FetchDependencies = {},
): Promise<FetchedSourcePage> {
  assertAdmittedSource(source);
  const fetcher = dependencies.fetch ?? fetch;
  const lookup = dependencies.lookup ?? defaultLookup;
  const sleep = dependencies.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  let retryCount = 0;
  while (true) {
    try {
      return await fetchAttempt(source, retryCount, fetcher, lookup);
    } catch (error) {
      const boundaryError = normalizeError(error, retryCount);
      if (!isRetryable(boundaryError.code) || retryCount >= source.retryLimit) {
        throw boundaryError;
      }
      retryCount += 1;
      await sleep(250 * 2 ** (retryCount - 1));
    }
  }
}

async function fetchAttempt(
  source: SourceManifestEntry,
  retryCount: number,
  fetcher: typeof fetch,
  lookup: (hostname: string) => Promise<DnsAddress[]>,
): Promise<FetchedSourcePage> {
  const requestedUrl = source.canonicalUrl;
  let currentUrl = new URL(requestedUrl);

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    await assertPublicHost(currentUrl, source, lookup);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), source.timeoutMs);
    let response: Response;

    try {
      response = await fetcher(currentUrl, {
        headers: {
          accept: "text/html",
          "user-agent": userAgent,
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new FetchBoundaryError("timeout", "Source request timed out", retryCount);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 407) {
      throw new FetchBoundaryError(
        "authentication_required",
        "Source requested authentication",
        retryCount,
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) {
        throw new FetchBoundaryError("redirect_limit", "Source redirect limit exceeded", retryCount);
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) {
      throw new FetchBoundaryError(
        "http_status",
        `Source returned HTTP ${response.status}`,
        retryCount,
      );
    }

    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    if (!source.expectedContentTypes.includes(contentType)) {
      throw new FetchBoundaryError("content_type", "Source returned an unexpected content type", retryCount);
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > source.maxResponseBytes) {
      await response.body?.cancel();
      throw new FetchBoundaryError("response_too_large", "Source response exceeded its byte limit", retryCount);
    }

    const bytes = await readBoundedBody(response, source.maxResponseBytes, retryCount);
    return {
      requestedUrl,
      finalUrl: currentUrl.toString(),
      status: response.status,
      contentType,
      bytes,
      retryCount,
      retrievedAt: new Date(),
    };
  }

  throw new FetchBoundaryError("redirect_limit", "Source redirect limit exceeded", retryCount);
}

async function assertPublicHost(
  url: URL,
  source: SourceManifestEntry,
  lookup: (hostname: string) => Promise<DnsAddress[]>,
): Promise<void> {
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !source.allowedRedirectHosts.includes(url.hostname)
  ) {
    throw new FetchBoundaryError("redirect_not_allowed", "Source URL is outside the reviewed allowlist");
  }

  const addresses = await lookup(url.hostname);
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family }) =>
      blockedAddresses.check(address, family === 6 ? "ipv6" : "ipv4"),
    )
  ) {
    throw new FetchBoundaryError("dns_not_public", "Source hostname did not resolve exclusively to public addresses");
  }
}

async function readBoundedBody(
  response: Response,
  limit: number,
  retryCount: number,
): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new FetchBoundaryError("response_too_large", "Source response exceeded its byte limit", retryCount);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function defaultLookup(hostname: string): Promise<DnsAddress[]> {
  return nodeLookup(hostname, { all: true });
}

function normalizeError(error: unknown, retryCount: number): FetchBoundaryError {
  if (error instanceof FetchBoundaryError) return error;
  return new FetchBoundaryError("connection_error", "Source connection failed", retryCount);
}

function isRetryable(code: FetchBoundaryCode): boolean {
  return code === "timeout" || code === "connection_error" || code === "http_status";
}
