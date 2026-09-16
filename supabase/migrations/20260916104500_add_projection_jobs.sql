set lock_timeout = '5s';
set statement_timeout = '30s';

create table catalogue.search_projection_jobs (
  id bigint generated always as identity primary key,
  publication_id bigint not null unique references catalogue.publications(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  last_attempted_at timestamptz,
  projected_at timestamptz
);

create index search_projection_jobs_status_idx
  on catalogue.search_projection_jobs (status, created_at);

grant select on catalogue.search_projection_jobs to navigator_catalogue_reader;
grant select, insert, update on catalogue.search_projection_jobs to navigator_ingest_writer;
grant usage, select on sequence catalogue.search_projection_jobs_id_seq to navigator_ingest_writer;

alter default privileges for role postgres in schema catalogue
  revoke all on tables from public, anon, authenticated;
