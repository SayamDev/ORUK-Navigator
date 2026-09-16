begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select has_table('catalogue', 'contact_points', 'contact points table exists');
select has_table('catalogue', 'delivery_locations', 'delivery locations table exists');
select has_table('catalogue', 'coverage_areas', 'coverage areas table exists');
select has_table('catalogue', 'source_actions', 'source actions table exists');
select has_table('catalogue', 'classifications', 'classifications table exists');
select has_table('catalogue', 'publication_classifications', 'publication classifications table exists');
select has_table('catalogue', 'search_documents', 'search documents table exists');

insert into ingest.sources (
  key, name, publisher_name, source_type, base_url, adapter_key,
  adapter_version, admission_status, is_enabled
) values (
  'test-source', 'Test source', 'Test publisher', 'curated_html',
  'https://example.test', 'test-adapter', '1', 'approved', true
);

insert into ingest.source_pages (
  source_id, key, canonical_url, adapter_version, rules_version,
  geographic_scope, refresh_interval, freshness_window, timeout_ms,
  retry_limit, max_response_bytes, admission_status, health
) values (
  (select id from ingest.sources where key = 'test-source'),
  'test-page', 'https://example.test/service', '1', '1', 'Tameside',
  interval '7 days', interval '14 days', 5000, 1, 1000000, 'approved', 'healthy'
);

insert into ingest.ingestion_runs (
  trigger, adapter_version, rules_version, finished_at, status
) values ('manual', '1', '1', now(), 'succeeded');

insert into ingest.fetch_observations (
  run_id, source_page_id, requested_url, final_url, http_status,
  response_content_type, response_bytes, duration_ms, raw_response_sha256,
  transport_outcome, is_contract_valid
) values (
  (select id from ingest.ingestion_runs where adapter_version = '1'),
  (select id from ingest.source_pages where key = 'test-page'),
  'https://example.test/service', 'https://example.test/service', 200,
  'text/html', 100, 25, repeat('a', 64), 'succeeded', true
);

insert into ingest.extraction_candidates (
  source_page_id, fetch_observation_id, adapter_version, rules_version,
  canonical_content_sha256, normalized_payload, outcome
) values (
  (select id from ingest.source_pages where key = 'test-page'),
  (
    select observation.id
    from ingest.fetch_observations observation
    join ingest.source_pages page on page.id = observation.source_page_id
    where page.key = 'test-page'
  ),
  '1', '1', repeat('b', 64), '{"name":"Test service"}'::jsonb, 'candidate'
);

insert into catalogue.entries (slug) values ('test-service'), ('another-service');

insert into catalogue.publications (
  entry_id, approved_candidate_id, version_number, name, description,
  provider_name, source_status, source_checked_at, completeness_band
) values (
  (select id from catalogue.entries where slug = 'test-service'),
  (
    select candidate.id
    from ingest.extraction_candidates candidate
    join ingest.source_pages page on page.id = candidate.source_page_id
    where page.key = 'test-page'
  ),
  1, 'Test service', 'A reviewed test service.', 'Test publisher',
  'healthy', now(), 'partial'
);

select throws_ok(
  $$
    insert into ingest.extraction_candidates (
      source_page_id, fetch_observation_id, adapter_version, rules_version,
      canonical_content_sha256, normalized_payload, outcome
    ) select source_page_id, fetch_observation_id, adapter_version, rules_version,
      canonical_content_sha256, normalized_payload, outcome
      from ingest.extraction_candidates candidate
      where candidate.adapter_version = '1'
  $$,
  '23505', null,
  'candidate identity is idempotent under replay'
);

select throws_ok(
  $$
    update catalogue.entries
    set active_publication_id = (
      select publication.id
      from catalogue.publications publication
      join catalogue.entries entry on entry.id = publication.entry_id
      where entry.slug = 'test-service'
    )
    where slug = 'another-service'
  $$,
  '23503', null,
  'an entry cannot activate another entry publication'
);

select throws_ok(
  $$update catalogue.publications set name = 'Changed'$$,
  '55000', null,
  'published facts cannot be updated'
);

select throws_ok(
  $$delete from catalogue.publications$$,
  '55000', null,
  'published facts cannot be deleted normally'
);

insert into ingest.review_decisions (
  candidate_id, decision, reason, reviewer, resulting_publication_id
) values (
  (
    select candidate.id
    from ingest.extraction_candidates candidate
    where candidate.adapter_version = '1'
  ), 'approved',
  'Reviewed source evidence.', 'test-reviewer',
  (
    select publication.id
    from catalogue.publications publication
    join catalogue.entries entry on entry.id = publication.entry_id
    where entry.slug = 'test-service'
  )
);

select throws_ok(
  $$update ingest.review_decisions set reason = 'Changed'$$,
  '55000', null,
  'review decisions are append-only'
);

select throws_ok(
  $$delete from ingest.review_decisions$$,
  '55000', null,
  'review decisions cannot be deleted normally'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'catalogue'
      and tablename = 'search_documents'
      and indexdef ilike '%using gin%'
  ),
  'search documents have a GIN full-text index'
);

select * from finish();
rollback;
