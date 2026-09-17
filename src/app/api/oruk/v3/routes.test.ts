// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogueService } from "@/domain/catalogue";
import { publisherId } from "@/oruk/service-mapper";

vi.mock("server-only", () => ({}));

const repository = {
  listActive: vi.fn<() => Promise<CatalogueService[]>>(),
  findActiveByPublicId: vi.fn<(id: string) => Promise<CatalogueService | null>>(),
};
vi.mock("@/server/repositories", () => ({ getCatalogueRepository: () => repository }));

import { GET as getOrganization } from "./organizations/[id]/route";
import { GET as listOrganizations } from "./organizations/route";
import { GET as getRoot } from "./route";
import { GET as getService } from "./services/[id]/route";
import { GET as listServices } from "./services/route";

const housing = service("11111111-1111-4111-8111-111111111111", "Housing Payments", "Help with rent shortfalls.");
const carers = service("22222222-2222-4222-8222-222222222222", "Carers Centre", "Support for unpaid carers.");

describe("ORUK v3 feed routes", () => {
  beforeEach(() => {
    repository.listActive.mockResolvedValue([carers, housing]);
    repository.findActiveByPublicId.mockImplementation(async (id) =>
      [carers, housing].find((item) => item.publicId === id) ?? null,
    );
  });

  it("describes the feed version and specification with open CORS", async () => {
    const response = getRoot();

    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(await response.json()).toEqual({
      version: "HSDS-UK-3.0",
      profile: expect.stringMatching(/^https:\/\//),
      openapi_url: expect.stringMatching(/openapi\.json$/),
    });
  });

  it("lists services in the paginated ORUK envelope", async () => {
    const response = await listServices(request("/services?per_page=1&page=2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(body).toMatchObject({ total_items: 2, total_pages: 2, page_number: 2, size: 1 });
    expect(body.contents).toEqual([expect.objectContaining({ id: housing.publicId, status: "active" })]);
  });

  it("filters the list with the ORUK search parameter", async () => {
    const body = await (await listServices(request("/services?search=carers"))).json();

    expect(body.contents.map((item: { name: string }) => item.name)).toEqual(["Carers Centre"]);
  });

  it("returns a fully nested service by id and 404 for unknown ids", async () => {
    const found = await getService(request(`/services/${housing.publicId}`), context(housing.publicId));
    const missing = await getService(request("/services/unknown"), context("unknown"));

    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({ id: housing.publicId, service_areas: [expect.any(Object)] });
    expect(missing.status).toBe(404);
  });

  it("lists the publisher organisation and returns it with its services", async () => {
    const list = await listOrganizations(request("/organizations")).json();
    const found = await getOrganization(request(`/organizations/${publisherId}`), organizationContext(publisherId));
    const missing = await getOrganization(request("/organizations/unknown"), organizationContext("unknown"));

    expect(list).toMatchObject({ total_items: 1, contents: [{ id: publisherId }] });
    expect(await found.json()).toMatchObject({
      id: publisherId,
      services: [{ id: carers.publicId }, { id: housing.publicId }],
    });
    expect(missing.status).toBe(404);
  });

  it("reports an unavailable database without leaking details", async () => {
    repository.listActive.mockRejectedValue(new Error("connection refused at 10.0.0.5"));
    const response = await listServices(request("/services"));

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("10.0.0.5");
  });
});

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost/api/oruk/v3${path}`);
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function organizationContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function service(publicId: string, name: string, description: string): CatalogueService {
  return {
    publicId,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    description,
    providerName: "Tameside Metropolitan Borough Council",
    sourceStatus: "healthy",
    sourceCheckedAt: "2026-09-17 13:20:59+00",
    costSummary: null,
    accessSummary: null,
    serviceArea: "Tameside residents",
    completenessBand: "partial",
    contacts: [],
    actions: [],
  };
}
