import { createHash } from "node:crypto";

import type { CatalogueService } from "@/domain/catalogue";

/**
 * Maps reviewed publications onto the Open Referral UK v3.0 (HSDS-UK-3.0) service shape.
 *
 * The mapping only restates facts the reviewed publication already holds. It never infers
 * eligibility, availability, taxonomy terms or geography, so absent source evidence stays
 * absent rather than becoming an empty-looking ORUK value.
 */

export const orukVersion = "HSDS-UK-3.0";
export const orukProfileUrl = "https://openreferraluk.org/developers/specifications";
export const orukOpenApiUrl =
  "https://openreferraluk.org/specifications/3.0/openapi.json";

/** Stable organisation identity for the single reviewed publisher in the pilot. */
export const publisherName = "Tameside Metropolitan Borough Council";
export const publisherId = deterministicUuid(`publisher:${publisherName}`);
export const publisherUrl = "https://www.tameside.gov.uk";

export type OrukOrganization = {
  id: string;
  name: string;
  description: string;
  website?: string;
};

export type OrukOrganizationWithServices = OrukOrganization & {
  services: Array<Pick<OrukServiceListItem, "id" | "name" | "status">>;
};

export type OrukServiceArea = {
  id: string;
  service_id: string;
  name: string;
};

export type OrukCostOption = {
  id: string;
  service_id: string;
  amount_description: string;
};

export type OrukServiceListItem = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  url?: string;
  email?: string;
  status: "active";
  assured_date?: string;
  organization: OrukOrganization;
};

export type OrukService = OrukServiceListItem & {
  service_areas: OrukServiceArea[];
  cost_options: OrukCostOption[];
};

export type OrukPage<Item> = {
  total_items: number;
  total_pages: number;
  page_number: number;
  size: number;
  first_page: boolean;
  last_page: boolean;
  empty: boolean;
  contents: Item[];
};

export const publisherOrganization: OrukOrganization = {
  id: publisherId,
  name: publisherName,
  description:
    "Publisher of the reviewed Tameside Council support pages in the ORUK Navigator pilot catalogue.",
  website: publisherUrl,
};

export function toOrukOrganization(services: CatalogueService[]): OrukOrganizationWithServices {
  return {
    ...publisherOrganization,
    services: services.map((service) => ({
      id: service.publicId,
      name: service.name,
      status: "active" as const,
    })),
  };
}

export function toOrukServiceListItem(service: CatalogueService): OrukServiceListItem {
  const item: OrukServiceListItem = {
    id: service.publicId,
    organization_id: publisherId,
    name: service.name,
    description: service.description,
    status: "active",
    organization: publisherOrganization,
  };

  const sourceUrl = authoritativeSourceUrl(service);
  if (sourceUrl) item.url = sourceUrl;

  const email = service.contacts.find((contact) => contact.kind === "email")?.value;
  if (email) item.email = email;

  // ORUK assured_date is the date the information was last checked, which is exactly
  // what "source checked" records. It is not a publisher update date.
  const assuredDate = service.sourceCheckedAt.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(assuredDate)) item.assured_date = assuredDate;

  return item;
}

export function toOrukService(service: CatalogueService): OrukService {
  const areas: OrukServiceArea[] = service.serviceArea
    ? [
        {
          id: deterministicUuid(`service_area:${service.publicId}`),
          service_id: service.publicId,
          name: service.serviceArea,
        },
      ]
    : [];

  const costOptions: OrukCostOption[] = service.costSummary
    ? [
        {
          id: deterministicUuid(`cost_option:${service.publicId}`),
          service_id: service.publicId,
          amount_description: service.costSummary,
        },
      ]
    : [];

  return {
    ...toOrukServiceListItem(service),
    service_areas: areas,
    cost_options: costOptions,
  };
}

export function toOrukPage<Item>(
  items: Item[],
  requestedPage: number,
  requestedPerPage: number,
): OrukPage<Item> {
  const perPage = clampPerPage(requestedPerPage);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const pageNumber = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages);
  const contents = items.slice((pageNumber - 1) * perPage, pageNumber * perPage);

  return {
    total_items: items.length,
    total_pages: totalPages,
    page_number: pageNumber,
    size: contents.length,
    first_page: pageNumber === 1,
    last_page: pageNumber === totalPages,
    empty: contents.length === 0,
    contents,
  };
}

function clampPerPage(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 50;
  return Math.min(Math.trunc(value), 200);
}

function authoritativeSourceUrl(service: CatalogueService): string | undefined {
  return service.actions.find((action) => action.kind === "authoritative_details")?.url;
}

/**
 * Derives a stable RFC 4122 version 5 (SHA-1, URL namespace) identifier so related ORUK
 * records keep the same identity across deployments without storing extra columns.
 */
export function deterministicUuid(name: string): string {
  const namespace = "6ba7b811-9dad-11d1-80b4-00c04fd430c8".replace(/-/g, "");
  const hash = createHash("sha1")
    .update(Buffer.concat([Buffer.from(namespace, "hex"), Buffer.from(name, "utf8")]))
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
