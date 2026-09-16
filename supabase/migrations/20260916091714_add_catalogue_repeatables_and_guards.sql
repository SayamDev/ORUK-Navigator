set lock_timeout = '5s';
set statement_timeout = '30s';

create table catalogue.contact_points (
  id bigint generated always as identity primary key,
  publication_id bigint not null references catalogue.publications(id) on delete restrict,
  kind text not null check (kind in ('phone', 'email', 'website', 'textphone', 'other')),
  label text not null,
  display_value text not null,
  normalized_value text,
  access_notes text,
  evidence_id bigint references ingest.candidate_field_evidence(id) on delete restrict,
  sort_order smallint not null default 0 check (sort_order >= 0)
);

create index contact_points_publication_id_idx on catalogue.contact_points (publication_id);
create index contact_points_evidence_id_idx on catalogue.contact_points (evidence_id);

create table catalogue.delivery_locations (
  id bigint generated always as identity primary key,
  publication_id bigint not null references catalogue.publications(id) on delete restrict,
  name text,
  address_line_1 text,
  address_line_2 text,
  locality text,
  region text,
  postcode text,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  is_virtual boolean not null default false,
  evidence_id bigint references ingest.candidate_field_evidence(id) on delete restrict,
  constraint delivery_locations_coordinates_together
    check ((latitude is null) = (longitude is null))
);

create index delivery_locations_publication_id_idx on catalogue.delivery_locations (publication_id);
create index delivery_locations_evidence_id_idx on catalogue.delivery_locations (evidence_id);

create table catalogue.coverage_areas (
  id bigint generated always as identity primary key,
  publication_id bigint not null references catalogue.publications(id) on delete restrict,
  name text not null,
  area_type text not null check (area_type in ('borough', 'ward', 'town', 'postcode_district', 'other')),
  code text,
  evidence_id bigint references ingest.candidate_field_evidence(id) on delete restrict
);

create index coverage_areas_publication_id_idx on catalogue.coverage_areas (publication_id);
create index coverage_areas_evidence_id_idx on catalogue.coverage_areas (evidence_id);

create table catalogue.source_actions (
  id bigint generated always as identity primary key,
  publication_id bigint not null references catalogue.publications(id) on delete restrict,
  kind text not null check (kind in ('authoritative_details', 'apply', 'request_support', 'refer', 'urgent_guidance')),
  label text not null,
  url text not null check (url ~ '^https://'),
  evidence_id bigint references ingest.candidate_field_evidence(id) on delete restrict,
  sort_order smallint not null default 0 check (sort_order >= 0)
);

create index source_actions_publication_id_idx on catalogue.source_actions (publication_id);
create index source_actions_evidence_id_idx on catalogue.source_actions (evidence_id);

create table catalogue.classifications (
  id bigint generated always as identity primary key,
  scheme text not null,
  term text not null,
  canonical_key text not null,
  origin text not null check (origin in ('source', 'editorial', 'oruk')),
  created_at timestamptz not null default now(),
  unique (scheme, canonical_key, origin)
);

create table catalogue.publication_classifications (
  publication_id bigint not null references catalogue.publications(id) on delete restrict,
  classification_id bigint not null references catalogue.classifications(id) on delete restrict,
  evidence_id bigint references ingest.candidate_field_evidence(id) on delete restrict,
  primary key (publication_id, classification_id)
);

create index publication_classifications_classification_id_idx
  on catalogue.publication_classifications (classification_id);
create index publication_classifications_evidence_id_idx
  on catalogue.publication_classifications (evidence_id);

create table catalogue.search_documents (
  publication_id bigint primary key references catalogue.publications(id) on delete restrict,
  entry_id bigint not null references catalogue.entries(id) on delete restrict,
  name text not null,
  provider_name text not null,
  description text not null,
  classification_text text not null default '',
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(provider_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(classification_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  projected_at timestamptz not null default now()
);

create index search_documents_entry_id_idx on catalogue.search_documents (entry_id);
create index search_documents_vector_idx on catalogue.search_documents using gin (search_vector);

create function catalogue.reject_immutable_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I is immutable after publication', tg_table_schema, tg_table_name);
end
$$;

create trigger publications_are_immutable
before update or delete on catalogue.publications
for each row execute function catalogue.reject_immutable_change();

create trigger contact_points_are_immutable
before update or delete on catalogue.contact_points
for each row execute function catalogue.reject_immutable_change();

create trigger delivery_locations_are_immutable
before update or delete on catalogue.delivery_locations
for each row execute function catalogue.reject_immutable_change();

create trigger coverage_areas_are_immutable
before update or delete on catalogue.coverage_areas
for each row execute function catalogue.reject_immutable_change();

create trigger source_actions_are_immutable
before update or delete on catalogue.source_actions
for each row execute function catalogue.reject_immutable_change();

create trigger publication_classifications_are_immutable
before update or delete on catalogue.publication_classifications
for each row execute function catalogue.reject_immutable_change();

create trigger review_decisions_are_append_only
before update or delete on ingest.review_decisions
for each row execute function catalogue.reject_immutable_change();

revoke all on function catalogue.reject_immutable_change() from public, anon, authenticated;

grant select on catalogue.contact_points, catalogue.delivery_locations,
  catalogue.coverage_areas, catalogue.source_actions, catalogue.classifications,
  catalogue.publication_classifications, catalogue.search_documents
  to navigator_catalogue_reader;

grant select, insert on catalogue.contact_points, catalogue.delivery_locations,
  catalogue.coverage_areas, catalogue.source_actions, catalogue.classifications,
  catalogue.publication_classifications to navigator_ingest_writer;
grant select, insert, update on catalogue.search_documents to navigator_ingest_writer;
