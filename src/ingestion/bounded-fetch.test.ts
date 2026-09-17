// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { FetchBoundaryError, fetchSourcePage } from "@/ingestion/bounded-fetch";
import {
  assertAdmittedSource,
  tamesideSourceManifest,
  type SourceManifestEntry,
} from "@/ingestion/source-manifest";

const source = tamesideSourceManifest["welfare-rights"];
const publicDns = async () => [{ address: "8.8.8.8", family: 4 }];

describe("source admission", () => {
  it("admits the ten complete reviewed Tameside pages", () => {
    expect(Object.values(tamesideSourceManifest).map((entry) => assertAdmittedSource(entry))).toHaveLength(10);
  });

  it("fails closed when required licence permission is absent", () => {
    const incomplete: SourceManifestEntry = {
      ...source,
      licence: { ...source.licence, permitsDisplay: false },
    };

    expect(() => assertAdmittedSource(incomplete)).toThrow("lacks a required licence permission");
  });
});

describe("bounded source fetch", () => {
  it("rejects a private DNS answer before making a request", async () => {
    const fetcher = vi.fn();

    await expect(
      fetchSourcePage(source, {
        fetch: fetcher,
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
      }),
    ).rejects.toMatchObject({ code: "dns_not_public" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("stops before following an unapproved redirect", async () => {
    const fetcher = vi.fn(async () =>
      new Response(null, { status: 302, headers: { location: "https://example.com/private" } }),
    );

    await expect(
      fetchSourcePage(source, { fetch: fetcher, lookup: publicDns }),
    ).rejects.toMatchObject({ code: "redirect_not_allowed" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects an unexpected content type", async () => {
    await expect(
      fetchSourcePage(source, {
        fetch: async () =>
          new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
        lookup: publicDns,
      }),
    ).rejects.toMatchObject({ code: "content_type" });
  });

  it("stops reading a streamed response above the byte limit", async () => {
    const constrained = { ...source, maxResponseBytes: 1_024 };

    await expect(
      fetchSourcePage(constrained, {
        fetch: async () =>
          new Response("x".repeat(1_025), {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
        lookup: publicDns,
      }),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("retries a timeout only to the reviewed ceiling", async () => {
    const fetcher = vi.fn(
      async (_url: URL | RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    await expect(
      fetchSourcePage(
        { ...source, timeoutMs: 100, retryLimit: 1 },
        { fetch: fetcher, lookup: publicDns, sleep: async () => undefined },
      ),
    ).rejects.toMatchObject({ code: "timeout", retryCount: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("uses an identifiable agent and returns validated HTML bytes", async () => {
    const fetcher = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => {
      void _input;
      void _init;
      return new Response("<main>Reviewed</main>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });

    const result = await fetchSourcePage(source, { fetch: fetcher, lookup: publicDns });
    const request = fetcher.mock.calls[0];

    expect(new TextDecoder().decode(result.bytes)).toBe("<main>Reviewed</main>");
    expect(request?.[1]?.redirect).toBe("manual");
    expect(new Headers(request?.[1]?.headers).get("user-agent")).toContain("ORUK-Navigator");
  });

  it("does not leak the underlying network error message", async () => {
    const promise = fetchSourcePage(source, {
      fetch: async () => {
        throw new Error("secret internal hostname");
      },
      lookup: publicDns,
      sleep: async () => undefined,
    });

    await expect(promise).rejects.toEqual(
      expect.objectContaining<Partial<FetchBoundaryError>>({
        code: "connection_error",
        message: "Source connection failed",
      }),
    );
  });
});
