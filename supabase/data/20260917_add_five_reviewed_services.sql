-- One-off reviewed catalogue expansion for databases seeded before 17 September 2026.
--
-- Adds the five Tameside Council pages reviewed on 17 September 2026 to a database
-- that already holds the original five-entry pilot seed. Fresh local databases get
-- the same rows from supabase/seed.sql and must not run this file.
--
-- Safe to re-run: pages that already exist are skipped, and every later insert only
-- touches rows created for pages inserted by this run. Runs in one transaction.

begin;

create temporary table expansion_pages (
  key text primary key,
  url text not null,
  scope text not null,
  raw_sha text not null,
  payload jsonb not null
) on commit drop;

insert into expansion_pages (key, url, scope, raw_sha, payload) values
  ('housing-payments', 'https://www.tameside.gov.uk/council-tax-and-benefits/benefits/housing-payments', 'Tameside council applicants entitled to Housing Benefit or Universal Credit housing costs', '00f69e184137132965aba8ffa8a8ee0b70e993f04d689d874b33c9e269930322', '{"slug":"housing-payments","name":"Housing Payments","description":"Discretionary council payments towards housing costs, such as rent shortfalls, deposits or rent in advance.","area":"People entitled to Housing Benefit or Universal Credit housing costs","access":"Use the council source page for the current online application route."}'::jsonb),
  ('tameside-carers-centre', 'https://www.tameside.gov.uk/adults/what-support-is-available/carers', 'People in Tameside who look after someone', 'cb9403ec22dac8d0788a2466e6fe8e3de9769b708b343df9a0483be86d1e8b2d', '{"slug":"tameside-carers-centre","name":"Tameside Carers Centre","description":"Information, advice and wellbeing support for people who look after someone, including drop-in sessions.","area":"People in Tameside who look after someone","access":"Use the council source page for current drop-in times and contact details."}'::jsonb),
  ('family-hubs', 'https://www.tameside.gov.uk/children-and-families/family-hubs', 'Families in Tameside''s four neighbourhood areas', '0e5a940452f045e7ec65ec3fd2df94d3d8f665b8196c3ab297a8b86f8394a57a', '{"slug":"family-hubs","name":"Family Hubs","description":"Early help for children, young people, parents and carers, including infant feeding and perinatal mental health support.","area":"Families with children aged 0 to 19, or up to 25 with SEND","access":"Use the council source page for your neighbourhood Family Hub and opening times."}'::jsonb),
  ('equipment-and-adaptations', 'https://www.tameside.gov.uk/adults/equipment-and-adaptations', 'Adult social-care support in Tameside, subject to assessment', '7826e67416ab7f82d3e03950a03f408e7b61b3ff5ca3bb112823461b165d26fa', '{"slug":"equipment-and-adaptations","name":"Equipment and Adaptations","description":"Equipment and home adaptations such as grab rails, stair rails or level access showers to help adults live independently at home.","cost":"No cost for day-to-day equipment and minor adaptations after assessment; major adaptations may involve a financial assessment","area":"Adults in Tameside, following an assessment for care and support","access":"Use the council source page to request an assessment through adult social care."}'::jsonb),
  ('adult-social-care-early-support', 'https://www.tameside.gov.uk/adultservices/contact-us', 'Adult social-care information and advice in Tameside', 'bacb741acdb821cd601202bcaa1ea13b1d039bb3f563c07846a2ce00ea37dd2f', '{"slug":"adult-social-care-early-support","name":"Early Support and Advice Hub","description":"The first point of contact for information and advice about adult social care, including help with everyday tasks at home.","area":"Adults in Tameside, carers and professionals","access":"Use the council source page for current telephone hours and out-of-hours help."}'::jsonb);

create temporary table inserted_pages (
  id bigint primary key,
  key text not null
) on commit drop;

with inserted as (
  insert into ingest.source_pages (
    source_id, key, canonical_url, allowed_redirect_hosts, expected_content_type,
    adapter_version, rules_version, geographic_scope, refresh_interval,
    freshness_window, timeout_ms, retry_limit, max_response_bytes,
    admission_status, health, last_successful_fetch_at
  )
  select
    s.id, page.key, page.url, array['www.tameside.gov.uk'], 'text/html',
    'fixture-v1', 'fixture-v1', page.scope, interval '7 days',
    interval '14 days', 10000, 1, 2097152, 'approved', 'healthy',
    '2026-09-17T13:20:59Z'
  from ingest.sources s
  cross join expansion_pages page
  where s.key = 'tmbc-web'
    and not exists (
      select 1 from ingest.source_pages existing
      where existing.source_id = s.id and existing.key = page.key
    )
  returning id, key
)
insert into inserted_pages (id, key)
select id, key from inserted;

create temporary table expansion_run (id bigint primary key) on commit drop;

with run as (
  insert into ingest.ingestion_runs (
    trigger, adapter_version, rules_version, started_at, finished_at, status,
    considered_count, changed_count, summary
  )
  select
    'replay', 'fixture-v1', 'fixture-v1',
    '2026-09-17T13:20:59Z', '2026-09-17T13:21:04Z', 'succeeded',
    count(*), count(*),
    '{"fixture":true,"note":"Reviewed catalogue expansion, 17 September 2026"}'::jsonb
  from inserted_pages
  having count(*) > 0
  returning id
)
insert into expansion_run (id) select id from run;

insert into ingest.fetch_observations (
  run_id, source_page_id, requested_url, final_url, http_status,
  response_content_type, response_bytes, duration_ms, retrieved_at,
  raw_response_sha256, transport_outcome, is_contract_valid
)
select
  run.id, page.id, page.canonical_url, page.canonical_url, 200,
  'text/html', 1, 1, page.last_successful_fetch_at, expansion.raw_sha,
  'succeeded', true
from expansion_run run
cross join inserted_pages inserted
join ingest.source_pages page on page.id = inserted.id
join expansion_pages expansion on expansion.key = inserted.key;

insert into ingest.extraction_candidates (
  source_page_id, fetch_observation_id, adapter_version, rules_version,
  canonical_content_sha256, normalized_payload, outcome, review_status
)
select
  inserted.id,
  observation.id,
  'fixture-v1',
  'fixture-v1',
  encode(extensions.digest(convert_to(inserted.key || ':fixture-v1', 'UTF8'), 'sha256'), 'hex'),
  expansion.payload,
  'candidate',
  'approved'
from inserted_pages inserted
join ingest.fetch_observations observation on observation.source_page_id = inserted.id
join expansion_pages expansion on expansion.key = inserted.key;

create temporary table inserted_candidates (
  id bigint primary key,
  source_page_id bigint not null,
  payload jsonb not null
) on commit drop;

insert into inserted_candidates (id, source_page_id, payload)
select candidate.id, candidate.source_page_id, candidate.normalized_payload
from ingest.extraction_candidates candidate
join inserted_pages inserted on inserted.id = candidate.source_page_id;

insert into catalogue.entries (slug)
select payload ->> 'slug'
from inserted_candidates
order by payload ->> 'slug';

insert into catalogue.publications (
  entry_id, approved_candidate_id, version_number, published_at, name,
  description, provider_name, source_status, cost_summary, access_summary,
  source_checked_at, completeness_band, completeness_inputs, document
)
select
  entry.id,
  candidate.id,
  1,
  '2026-09-17T14:00:00Z',
  candidate.payload ->> 'name',
  candidate.payload ->> 'description',
  'Tameside Metropolitan Borough Council',
  'healthy',
  candidate.payload ->> 'cost',
  candidate.payload ->> 'access',
  page.last_successful_fetch_at,
  'partial',
  jsonb_build_object(
    'name', true,
    'description', true,
    'provider', true,
    'source', true,
    'contact', false,
    'opening_times', false
  ),
  candidate.payload
from inserted_candidates candidate
join ingest.source_pages page on page.id = candidate.source_page_id
join catalogue.entries entry on entry.slug = candidate.payload ->> 'slug';

create temporary table inserted_publications (
  id bigint primary key,
  entry_id bigint not null,
  source_page_id bigint not null
) on commit drop;

insert into inserted_publications (id, entry_id, source_page_id)
select publication.id, publication.entry_id, candidate.source_page_id
from catalogue.publications publication
join inserted_candidates candidate on candidate.id = publication.approved_candidate_id;

update catalogue.entries entry
set
  lifecycle = 'active',
  active_publication_id = publication.id,
  updated_at = '2026-09-17T14:00:00Z'
from inserted_publications publication
where publication.entry_id = entry.id;

insert into ingest.review_decisions (
  candidate_id, decision, reason, reviewer, decided_at, resulting_publication_id
)
select
  publication.approved_candidate_id,
  'approved',
  'Reviewed fixture derived from the 17 September 2026 Tameside source-manifest expansion.',
  'ORUK Navigator maintainer review',
  '2026-09-17T14:00:00Z',
  publication.id
from catalogue.publications publication
join inserted_publications inserted on inserted.id = publication.id;

insert into catalogue.source_actions (publication_id, kind, label, url)
select
  inserted.id,
  'authoritative_details',
  'Check current details on the council website',
  page.canonical_url
from inserted_publications inserted
join ingest.source_pages page on page.id = inserted.source_page_id;

insert into catalogue.search_documents (
  publication_id, entry_id, name, provider_name, description, classification_text,
  projected_at
)
select
  publication.id,
  publication.entry_id,
  publication.name,
  publication.provider_name,
  publication.description,
  coalesce(publication.document ->> 'area', ''),
  '2026-09-17T14:00:00Z'
from catalogue.publications publication
join inserted_publications inserted on inserted.id = publication.id;

insert into catalogue.search_projection_jobs (
  publication_id, status, attempt_count, last_attempted_at, projected_at
)
select
  inserted.id,
  'succeeded',
  1,
  '2026-09-17T14:00:00Z',
  '2026-09-17T14:00:00Z'
from inserted_publications inserted;

select count(*) as pages_added from inserted_pages;

commit;
