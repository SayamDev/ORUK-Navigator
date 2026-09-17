// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { CatalogueService } from "@/domain/catalogue";

import {
  deterministicUuid,
  publisherId,
  toOrukOrganization,
  toOrukPage,
  toOrukService,
  toOrukServiceListItem,
} from "./service-mapper";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("ORUK v3 service mapping", () => {
  it("maps a reviewed publication onto the required ORUK service fields", () => {
    expect(toOrukServiceListItem(service())).toEqual({
      id: "5b0e8f7a-3c1d-4e2f-9a8b-7c6d5e4f3a2b",
      organization_id: publisherId,
      name: "Housing Payments",
      description: "Discretionary payments towards housing costs.",
      url: "https://www.tameside.gov.uk/council-tax-and-benefits/benefits/housing-payments",
      status: "active",
      assured_date: "2026-09-17",
      organization: expect.objectContaining({
        id: publisherId,
        name: "Tameside Metropolitan Borough Council",
      }),
    });
  });

  it("adds nested service area and cost records with stable identifiers", () => {
    const first = toOrukService(service({ costSummary: "Free" }));
    const second = toOrukService(service({ costSummary: "Free" }));

    expect(first).toEqual(second);
    expect(first.service_areas).toEqual([
      { id: expect.stringMatching(uuid), service_id: first.id, name: "Tameside residents" },
    ]);
    expect(first.cost_options).toEqual([
      { id: expect.stringMatching(uuid), service_id: first.id, amount_description: "Free" },
    ]);
  });

  it("leaves unknown facts out instead of inventing them", () => {
    const mapped = toOrukService(service({ serviceArea: "", actions: [], sourceCheckedAt: "unknown" }));

    expect(mapped).not.toHaveProperty("url");
    expect(mapped).not.toHaveProperty("email");
    expect(mapped).not.toHaveProperty("assured_date");
    expect(mapped.service_areas).toEqual([]);
    expect(mapped.cost_options).toEqual([]);
  });

  it("derives RFC 4122 version 5 identifiers", () => {
    expect(deterministicUuid("publisher:Tameside Metropolitan Borough Council")).toMatch(uuid);
    expect(deterministicUuid("a")).not.toBe(deterministicUuid("b"));
    // Reference value from Python: uuid.uuid5(uuid.NAMESPACE_URL, "https://www.example.com/")
    expect(deterministicUuid("https://www.example.com/")).toBe("3d3ed9d2-aa3d-5fa6-90e8-ed662e90f559");
  });
});

describe("ORUK organisation mapping", () => {
  it("lists the reviewed publisher with its active services", () => {
    expect(toOrukOrganization([service()])).toEqual({
      id: publisherId,
      name: "Tameside Metropolitan Borough Council",
      description: expect.any(String),
      website: "https://www.tameside.gov.uk",
      services: [{ id: "5b0e8f7a-3c1d-4e2f-9a8b-7c6d5e4f3a2b", name: "Housing Payments", status: "active" }],
    });
  });
});

describe("ORUK page envelope", () => {
  const items = Array.from({ length: 5 }, (_, index) => index + 1);

  it("pages results with the ORUK envelope fields", () => {
    expect(toOrukPage(items, 2, 2)).toEqual({
      total_items: 5,
      total_pages: 3,
      page_number: 2,
      size: 2,
      first_page: false,
      last_page: false,
      empty: false,
      contents: [3, 4],
    });
  });

  it("clamps out-of-range requests to a valid page", () => {
    expect(toOrukPage(items, 99, 2)).toMatchObject({ page_number: 3, last_page: true, contents: [5] });
    expect(toOrukPage(items, 0, 0)).toMatchObject({ page_number: 1, size: 5 });
    expect(toOrukPage([], 1, 10)).toMatchObject({ total_items: 0, total_pages: 1, empty: true });
  });
});

function service(overrides: Partial<CatalogueService> = {}): CatalogueService {
  return {
    publicId: "5b0e8f7a-3c1d-4e2f-9a8b-7c6d5e4f3a2b",
    slug: "housing-payments",
    name: "Housing Payments",
    description: "Discretionary payments towards housing costs.",
    providerName: "Tameside Metropolitan Borough Council",
    sourceStatus: "healthy",
    sourceCheckedAt: "2026-09-17 13:20:59+00",
    costSummary: null,
    accessSummary: null,
    serviceArea: "Tameside residents",
    completenessBand: "partial",
    contacts: [],
    actions: [
      {
        kind: "authoritative_details",
        label: "Check current details on the council website",
        url: "https://www.tameside.gov.uk/council-tax-and-benefits/benefits/housing-payments",
      },
    ],
    ...overrides,
  };
}
