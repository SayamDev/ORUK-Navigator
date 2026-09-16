set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'navigator_catalogue_reader') then
    create role navigator_catalogue_reader nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'navigator_ingest_writer') then
    create role navigator_ingest_writer nologin noinherit;
  end if;
end
$$;

create schema ingest authorization postgres;
create schema catalogue authorization postgres;

revoke all on schema ingest from public, anon, authenticated;
revoke all on schema catalogue from public, anon, authenticated;

create table ingest.sources (
  id bigint generated always as identity primary key,
  key text not null unique,
  name text not null,
  publisher_name text not null,
  source_type text not null check (source_type in ('curated_html', 'oruk_api')),
  base_url text not null check (base_url ~ '^https://'),
  adapter_key text not null,
  adapter_version text not null,
  admission_status text not null default 'draft'
    check (admission_status in ('draft', 'approved', 'suspended', 'revoked')),
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_enabled_requires_approval
    check (not is_enabled or admission_status = 'approved')
);

create table ingest.source_licences (
  id bigint generated always as identity primary key,
  source_id bigint not null references ingest.sources(id) on delete restrict,
  licence_identifier text not null,
  terms_url text not null check (terms_url ~ '^https://'),
  attribution_text text not null,
  evidence_url text not null check (evidence_url ~ '^https://'),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  checked_at timestamptz not null,
  checked_by text not null,
  next_review_at timestamptz not null,
  permits_extraction boolean not null default false,
  permits_normalisation boolean not null default false,
  permits_storage boolean not null default false,
  permits_indexing boolean not null default false,
  permits_display boolean not null default false,
  permits_redistribution boolean not null default false,
  exclusions text not null default '',
  review_status text not null default 'draft'
    check (review_status in ('draft', 'approved', 'superseded', 'revoked')),
  created_at timestamptz not null default now()
);

create unique index source_licences_one_current_approved_idx
  on ingest.source_licences (source_id)
  where review_status = 'approved';
create index source_licences_source_id_idx on ingest.source_licences (source_id);

create table ingest.source_pages (
  id bigint generated always as identity primary key,
  source_id bigint not null references ingest.sources(id) on delete restrict,
  key text not null,
  canonical_url text not null check (canonical_url ~ '^https://'),
  allowed_redirect_hosts text[] not null default '{}',
  expected_content_type text not null default 'text/html',
  adapter_version text not null,
  rules_version text not null,
  geographic_scope text not null,
  refresh_interval interval not null check (refresh_interval > interval '0 seconds'),
  freshness_window interval not null check (freshness_window > interval '0 seconds'),
  timeout_ms integer not null check (timeout_ms between 100 and 60000),
  retry_limit smallint not null default 1 check (retry_limit between 0 and 5),
  max_response_bytes integer not null check (max_response_bytes between 1024 and 10485760),
  admission_status text not null default 'draft'
    check (admission_status in ('draft', 'approved', 'suspended', 'revoked')),
  health text not null default 'suspended'
    check (health in ('healthy', 'changed', 'stale', 'unreachable', 'invalid', 'suspended')),
  last_successful_fetch_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, key),
  unique (source_id, canonical_url)
);

create index source_pages_source_id_idx on ingest.source_pages (source_id);
create index source_pages_health_idx on ingest.source_pages (health);

create table ingest.ingestion_runs (
  id bigint generated always as identity primary key,
  run_public_id uuid not null default gen_random_uuid() unique,
  trigger text not null check (trigger in ('scheduled', 'manual', 'replay')),
  adapter_version text not null,
  rules_version text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'succeeded_with_warnings', 'failed')),
  considered_count integer not null default 0 check (considered_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  unchanged_count integer not null default 0 check (unchanged_count >= 0),
  changed_count integer not null default 0 check (changed_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  summary jsonb not null default '{}'::jsonb,
  constraint ingestion_runs_finished_state
    check ((status = 'running' and finished_at is null) or (status <> 'running' and finished_at is not null))
);

create table ingest.fetch_observations (
  id bigint generated always as identity primary key,
  run_id bigint not null references ingest.ingestion_runs(id) on delete restrict,
  source_page_id bigint not null references ingest.source_pages(id) on delete restrict,
  requested_url text not null,
  final_url text,
  http_status smallint check (http_status between 100 and 599),
  response_content_type text,
  response_bytes integer check (response_bytes >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  retrieved_at timestamptz not null default now(),
  raw_response_sha256 text check (raw_response_sha256 ~ '^[0-9a-f]{64}$'),
  transport_outcome text not null
    check (transport_outcome in ('succeeded', 'timeout', 'dns_error', 'connection_error', 'rejected')),
  error_code text,
  is_contract_valid boolean not null default false,
  retry_count smallint not null default 0 check (retry_count between 0 and 5)
);

create index fetch_observations_run_id_idx on ingest.fetch_observations (run_id);
create index fetch_observations_source_page_id_idx on ingest.fetch_observations (source_page_id);

create table ingest.extraction_candidates (
  id bigint generated always as identity primary key,
  source_page_id bigint not null references ingest.source_pages(id) on delete restrict,
  fetch_observation_id bigint not null references ingest.fetch_observations(id) on delete restrict,
  adapter_version text not null,
  rules_version text not null,
  canonical_content_sha256 text not null check (canonical_content_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_payload jsonb not null,
  outcome text not null check (outcome in ('candidate', 'unchanged', 'rejected', 'failed')),
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected', 'changes_requested')),
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_page_id, canonical_content_sha256, adapter_version, rules_version)
);

create index extraction_candidates_source_page_id_idx on ingest.extraction_candidates (source_page_id);
create index extraction_candidates_fetch_observation_id_idx on ingest.extraction_candidates (fetch_observation_id);
create index extraction_candidates_review_status_idx on ingest.extraction_candidates (review_status);

create table ingest.candidate_field_evidence (
  id bigint generated always as identity primary key,
  candidate_id bigint not null references ingest.extraction_candidates(id) on delete restrict,
  field_path text not null,
  evidence_kind text not null check (evidence_kind in ('text', 'attribute', 'structured_value', 'hash')),
  source_locator text not null,
  normalized_excerpt text,
  value_sha256 text check (value_sha256 ~ '^[0-9a-f]{64}$'),
  transformation_note text not null default '',
  is_excluded boolean not null default false,
  safety_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint candidate_field_evidence_has_value
    check (normalized_excerpt is not null or value_sha256 is not null)
);

create index candidate_field_evidence_candidate_id_idx
  on ingest.candidate_field_evidence (candidate_id);

create table catalogue.entries (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  lifecycle text not null default 'draft'
    check (lifecycle in ('draft', 'active', 'withdrawn', 'suspended')),
  active_publication_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, active_publication_id)
);

create table catalogue.publications (
  id bigint generated always as identity primary key,
  entry_id bigint not null references catalogue.entries(id) on delete restrict,
  approved_candidate_id bigint not null unique references ingest.extraction_candidates(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  published_at timestamptz not null default now(),
  name text not null,
  description text not null,
  provider_name text not null,
  source_status text not null,
  alert_text text,
  eligibility_summary text,
  cost_summary text,
  access_summary text,
  opening_summary text,
  language_summary text,
  accessibility_summary text,
  minimum_age smallint check (minimum_age >= 0),
  maximum_age smallint check (maximum_age >= 0),
  source_checked_at timestamptz not null,
  publisher_updated_at timestamptz,
  publisher_assured_at timestamptz,
  completeness_band text not null check (completeness_band in ('good', 'partial', 'limited')),
  completeness_inputs jsonb not null default '{}'::jsonb,
  publication_state text not null default 'active'
    check (publication_state in ('active', 'withdrawn', 'suspended')),
  document jsonb not null default '{}'::jsonb,
  unique (entry_id, version_number),
  unique (id, entry_id),
  constraint publications_age_range check (
    minimum_age is null or maximum_age is null or minimum_age <= maximum_age
  )
);

create index publications_entry_id_idx on catalogue.publications (entry_id);

alter table catalogue.entries
  add constraint entries_active_publication_belongs_to_entry
  foreign key (active_publication_id, id)
  references catalogue.publications (id, entry_id)
  on delete restrict;

create table ingest.review_decisions (
  id bigint generated always as identity primary key,
  candidate_id bigint not null references ingest.extraction_candidates(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected', 'changes_requested', 'withdrawn')),
  reason text not null,
  reviewer text not null,
  decided_at timestamptz not null default now(),
  resulting_publication_id bigint references catalogue.publications(id) on delete restrict
);

create index review_decisions_candidate_id_idx on ingest.review_decisions (candidate_id);
create index review_decisions_resulting_publication_id_idx on ingest.review_decisions (resulting_publication_id);

grant usage on schema catalogue to navigator_catalogue_reader;
grant select on catalogue.entries, catalogue.publications to navigator_catalogue_reader;

grant usage on schema ingest, catalogue to navigator_ingest_writer;
grant select, insert, update on all tables in schema ingest to navigator_ingest_writer;
grant usage, select on all sequences in schema ingest to navigator_ingest_writer;
grant select on catalogue.entries, catalogue.publications to navigator_ingest_writer;
grant insert on catalogue.entries, catalogue.publications to navigator_ingest_writer;
grant update (lifecycle, active_publication_id, updated_at) on catalogue.entries to navigator_ingest_writer;
grant usage, select on all sequences in schema catalogue to navigator_ingest_writer;

alter default privileges for role postgres in schema ingest revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema catalogue revoke all on tables from public, anon, authenticated;
