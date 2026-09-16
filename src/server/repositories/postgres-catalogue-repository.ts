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
    publication.source_status as "sourceStatus",
    publication.source_checked_at::text as "sourceCheckedAt",
    publication.cost_summary as "costSummary",
    publication.access_summary as "accessSummary",
    publication.completeness_band as "completenessBand",
    coalesce(contact.contacts, '[]'::jsonb) as contacts,
    coalesce(action.actions, '[]'::jsonb) as actions
  from catalogue.entries entry
  join catalogue.publications publication
    on publication.id = entry.active_publication_id
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
}

function normalizeRow(row: CatalogueRow): CatalogueService {
  return {
    ...row,
    contacts: row.contacts ?? [],
    actions: row.actions ?? [],
  };
}
