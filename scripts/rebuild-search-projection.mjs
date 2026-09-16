import postgres from "postgres";

if (process.argv[2] !== "--apply") {
  console.error("Refusing to rebuild without the explicit --apply flag.");
  process.exit(2);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
try {
  const count = await sql.begin(async (transaction) => {
    await transaction`delete from catalogue.search_documents`;
    const projected = await transaction`
      insert into catalogue.search_documents (
        publication_id, entry_id, name, provider_name, description, classification_text
      )
      select
        publication.id,
        publication.entry_id,
        publication.name,
        publication.provider_name,
        publication.description,
        coalesce(publication.document ->> 'area', '')
      from catalogue.entries entry
      join catalogue.publications publication on publication.id = entry.active_publication_id
      where entry.lifecycle = 'active' and publication.publication_state = 'active'
      returning publication_id
    `;
    await transaction`
      update catalogue.search_projection_jobs job
      set status = 'succeeded',
          attempt_count = attempt_count + 1,
          last_error_code = null,
          last_attempted_at = now(),
          projected_at = now()
      where exists (
        select 1 from catalogue.search_documents document
        where document.publication_id = job.publication_id
      )
    `;
    return projected.length;
  });
  console.log(`Rebuilt ${count} active search projections.`);
} finally {
  await sql.end({ timeout: 5 });
}
