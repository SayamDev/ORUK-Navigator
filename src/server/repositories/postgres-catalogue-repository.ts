import type { CatalogueService } from "@/domain/catalogue";
import type { CatalogueRepository } from "@/domain/catalogue-repository";
import type { Sql } from "postgres";

type CatalogueRow = Omit<CatalogueService, "contacts" | "actions"> & {
  contacts: CatalogueService["contacts"] | null;
  actions: CatalogueService["actions"] | null;
};

const activeCatalogueQuery = `
  select
    entry.public_id::text as "publicId",
    entry.slug,
    publication.name,
    publication.description,
    publication.provider_name as "providerName",
    page.health as "sourceStatus",
    publication.source_checked_at::text as "sourceCheckedAt",
    page.last_successful_fetch_at::text as "lastSuccessfulSourceCheckAt",
    publication.cost_summary as "costSummary",
    publication.access_summary as "accessSummary",
    coalesce(publication.document ->> 'area', '') as "serviceArea",
    publication.completeness_band as "completenessBand",
    coalesce(contact.contacts, '[]'::jsonb) as contacts,
    coalesce(action.actions, '[]'::jsonb) as actions
  from catalogue.entries entry
  join catalogue.publications publication
    on publication.id = entry.active_publication_id
  join ingest.extraction_candidates candidate
    on candidate.id = publication.approved_candidate_id
  join ingest.source_pages page
    on page.id = candidate.source_page_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'kind', point.kind,
        'label', point.label,
        'value', point.display_value,
        'accessNotes', point.access_notes
      ) order by point.sort_order, point.id
    ) as contacts
    from catalogue.contact_points point
    where point.publication_id = publication.id
  ) contact on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'kind', source_action.kind,
        'label', source_action.label,
        'url', source_action.url
      ) order by source_action.sort_order, source_action.id
    ) as actions
    from catalogue.source_actions source_action
    where source_action.publication_id = publication.id
  ) action on true
  where entry.lifecycle = 'active'
    and publication.publication_state = 'active'
`;

export class PostgresCatalogueRepository implements CatalogueRepository {
  constructor(private readonly sql: Sql) {}

  async listActive(): Promise<CatalogueService[]> {
    const rows = await this.sql.unsafe<CatalogueRow[]>(
      `${activeCatalogueQuery} order by publication.name, entry.id`,
    );

    return rows.map(normalizeRow);
  }

  async findActiveBySlug(slug: string): Promise<CatalogueService | null> {
    const rows = await this.sql.unsafe<CatalogueRow[]>(
      `${activeCatalogueQuery} and entry.slug = $1 limit 1`,
      [slug],
    );

    return rows[0] ? normalizeRow(rows[0]) : null;
  }

  async findActiveByPublicId(publicId: string): Promise<CatalogueService | null> {
    if (!uuidPattern.test(publicId)) return null;
    const rows = await this.sql.unsafe<CatalogueRow[]>(
      `${activeCatalogueQuery} and entry.public_id = $1::uuid limit 1`,
      [publicId],
    );

    return rows[0] ? normalizeRow(rows[0]) : null;
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeRow(row: CatalogueRow): CatalogueService {
  return {
    ...row,
    contacts: row.contacts ?? [],
    actions: row.actions ?? [],
  };
}
