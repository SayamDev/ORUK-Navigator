set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'navigator_operations_writer') then
    create role navigator_operations_writer nologin noinherit;
  end if;
end
$$;

create schema operations authorization postgres;
revoke all on schema operations from public, anon, authenticated;

create table operations.correction_reports (
  id bigint generated always as identity primary key,
  public_reference uuid not null default gen_random_uuid() unique,
  entry_id bigint not null references catalogue.entries(id) on delete restrict,
  publication_id bigint not null,
  category text not null check (category in ('incorrect', 'outdated', 'closed', 'wrong_service', 'other')),
  detail text check (detail is null or char_length(detail) <= 1000),
  state text not null default 'new'
    check (state in ('new', 'triaged', 'investigating', 'resolved', 'rejected', 'duplicate')),
  outcome_code text check (outcome_code is null or outcome_code ~ '^[a-z0-9_]{1,48}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  detail_deleted_at timestamptz,
  constraint correction_publication_belongs_to_entry
    foreign key (publication_id, entry_id)
    references catalogue.publications(id, entry_id)
    on delete restrict,
  constraint correction_terminal_state_has_closed_at check (
    (state in ('resolved', 'rejected', 'duplicate')) = (closed_at is not null)
  )
);

create index correction_reports_state_created_idx
  on operations.correction_reports (state, created_at);
create index correction_reports_closed_at_idx
  on operations.correction_reports (closed_at) where closed_at is not null;

create table operations.correction_transitions (
  id bigint generated always as identity primary key,
  report_id bigint not null references operations.correction_reports(id) on delete cascade,
  from_state text check (from_state is null or from_state in ('new', 'triaged', 'investigating', 'resolved', 'rejected', 'duplicate')),
  to_state text not null check (to_state in ('new', 'triaged', 'investigating', 'resolved', 'rejected', 'duplicate')),
  actor text not null check (actor ~ '^[a-z0-9][a-z0-9_.:@-]{1,63}$'),
  reason_code text not null check (reason_code ~ '^[a-z0-9_]{1,48}$'),
  candidate_id bigint references ingest.extraction_candidates(id) on delete restrict,
  publication_id bigint references catalogue.publications(id) on delete restrict,
  occurred_at timestamptz not null default now()
);

create index correction_transitions_report_idx
  on operations.correction_transitions (report_id, occurred_at);

create table operations.abuse_windows (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  constraint abuse_window_has_positive_duration check (expires_at > window_started_at)
);

create index abuse_windows_expiry_idx on operations.abuse_windows (expires_at);

create table operations.operational_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'correction_report_created', 'correction_report_state_changed',
    'security_input_rejected', 'retention_job_finished',
    'source_health_changed', 'alert_state_changed'
  )),
  correlation_id uuid not null,
  entity_kind text check (entity_kind is null or entity_kind in ('correction', 'source_page', 'retention_job', 'alert')),
  entity_id text check (entity_id is null or entity_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
  outcome_code text not null check (outcome_code ~ '^[a-z0-9_]{1,48}$'),
  duration_band text check (duration_band is null or duration_band in ('under_100ms', '100_499ms', '500_1999ms', '2s_plus')),
  result_count_band text check (result_count_band is null or result_count_band in ('0', '1_5', '6_plus')),
  created_at timestamptz not null default now()
);

create index operational_events_created_idx on operations.operational_events (created_at);

create table operations.alerts (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  alert_key text not null check (alert_key ~ '^[a-z0-9:_-]{1,120}$'),
  source_page_id bigint references ingest.source_pages(id) on delete restrict,
  kind text not null check (kind in ('source_failure', 'source_stale', 'material_candidate', 'all_source_failure', 'security')),
  state text not null default 'open' check (state in ('open', 'resolved')),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint alert_resolution_matches_state check (
    (state = 'resolved') = (resolved_at is not null)
  )
);

create unique index alerts_one_open_key_idx on operations.alerts (alert_key) where state = 'open';

create trigger correction_transitions_are_append_only
before update on operations.correction_transitions
for each row execute function catalogue.reject_immutable_change();

create trigger operational_events_are_append_only
before update on operations.operational_events
for each row execute function catalogue.reject_immutable_change();

grant usage on schema operations, catalogue, ingest to navigator_operations_writer;
grant select on catalogue.entries, catalogue.publications to navigator_operations_writer;
grant select on ingest.extraction_candidates, ingest.source_pages to navigator_operations_writer;
grant select, insert, update, delete on all tables in schema operations to navigator_operations_writer;
grant usage, select on all sequences in schema operations to navigator_operations_writer;

alter default privileges for role postgres in schema operations
  revoke all on tables from public, anon, authenticated;
