-- Deterministic local-development fixtures derived from the reviewed source
-- manifest. They are not live service availability or a production import.

insert into ingest.sources (
  key, name, publisher_name, source_type, base_url, adapter_key,
  adapter_version, admission_status, is_enabled
) values (
  'tmbc-web',
  'Tameside Council reviewed web pages',
  'Tameside Metropolitan Borough Council',
  'curated_html',
  'https://www.tameside.gov.uk',
  'tmbc-reviewed-page',
  'fixture-v1',
  'approved',
  true
);

insert into ingest.source_licences (
  source_id, licence_identifier, terms_url, attribution_text, evidence_url,
  evidence_sha256, checked_at, checked_by, next_review_at,
  permits_extraction, permits_normalisation, permits_storage, permits_indexing,
  permits_display, permits_redistribution, exclusions, review_status
) values (
  (select id from ingest.sources where key = 'tmbc-web'),
  'OGL-3.0',
  'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  '© Tameside Metropolitan Borough Council retains the sole intellectual property rights to the named source page and publication date, licensed under the Open Government Licence.',
  'https://www.tameside.gov.uk/webteam/disclaimer-and-copyright-notice',
  'eede30879833549c5d3a2f3ecf9c5bb5d729558fe5016720d25601c067bddec9',
  '2026-09-15T22:09:00Z',
  'ORUK Navigator maintainer review',
  '2027-03-15T00:00:00Z',
  true, true, true, true, true, true,
  'Images, logos, maps/Ordnance Survey material, linked documents, third-party-owned text, and separately licensed content are excluded.',
  'approved'
);

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
  '2026-09-15T22:09:00Z'
from ingest.sources s
cross join (
  values
    ('crisis-payments', 'https://www.tameside.gov.uk/crisis-payments', 'Tameside residents or people about to become Tameside residents'),
    ('welfare-rights', 'https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights', 'Tameside residents'),
    ('debt-advice', 'https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights/debt-advice', 'Tameside council service; eligibility is not inferred'),
    ('tameside-homelessness-service', 'https://www.tameside.gov.uk/housing/housing-and-homelessness/tameside-homeless-service', 'People seeking homelessness help from Tameside Council'),
    ('adult-mental-health-services', 'https://www.tameside.gov.uk/adults/care-and-support/types-of-support/adult-mental-health-services', 'Adult social-care mental-health support in Tameside')
) as page(key, url, scope)
where s.key = 'tmbc-web';

insert into ingest.ingestion_runs (
  trigger, adapter_version, rules_version, started_at, finished_at, status,
  considered_count, changed_count, summary
) values (
  'replay', 'fixture-v1', 'fixture-v1',
  '2026-09-15T22:09:00Z', '2026-09-15T22:09:05Z', 'succeeded',
  5, 5, '{"fixture":true,"note":"Reviewed local development seed"}'::jsonb
);

insert into ingest.fetch_observations (
  run_id, source_page_id, requested_url, final_url, http_status,
  response_content_type, response_bytes, duration_ms, retrieved_at,
  raw_response_sha256, transport_outcome, is_contract_valid
)
select
  run.id, page.id, page.canonical_url, page.canonical_url, 200,
  'text/html', 1, 1, '2026-09-15T22:09:00Z', hashes.raw_sha,
  'succeeded', true
from ingest.ingestion_runs run
join ingest.source_pages page on true
join (
  values
    ('crisis-payments', '30b8a8466561d44939df1f4e3a850ee38c6fe49d0737110bf5fff44858d45ddc'),
    ('welfare-rights', 'f90a08379edaf1313b55ff3cf62485242f9eaea6239e6622bd9b04dc066264a4'),
    ('debt-advice', '23088261355e758e16a21e688a33ad6d26399d2ee1a746486aa2346ad475d738'),
    ('tameside-homelessness-service', 'f5d6b4cbe774204d50e5e2bce4dbd9d05c51fca83ddf0dbc278dd66ceb99ced8'),
    ('adult-mental-health-services', '5acee79886a63038aed464f14a83860166a0d32714ed1bd65a20549e03207710')
) as hashes(page_key, raw_sha) on hashes.page_key = page.key
where run.adapter_version = 'fixture-v1';

insert into ingest.extraction_candidates (
  source_page_id, fetch_observation_id, adapter_version, rules_version,
  canonical_content_sha256, normalized_payload, outcome, review_status
)
select
  page.id,
  observation.id,
  'fixture-v1',
  'fixture-v1',
  encode(extensions.digest(convert_to(page.key || ':fixture-v1', 'UTF8'), 'sha256'), 'hex'),
  fixture.payload,
  'candidate',
  'approved'
from ingest.source_pages page
join ingest.fetch_observations observation on observation.source_page_id = page.id
join (
  values
    ('welfare-rights', '{"slug":"welfare-rights","name":"Welfare Rights","description":"Free advice about benefits, debt and related support for Tameside residents.","cost":"Free","area":"Tameside residents","access":"Use the council source page for current contact and request options."}'::jsonb),
    ('debt-advice', '{"slug":"debt-advice","name":"Debt Advice","description":"Council debt advice, including help with mortgage or rent arrears.","cost":"Free","area":"Tameside council service","access":"Use the council source page for current referral and telephone options."}'::jsonb),
    ('crisis-payments', '{"slug":"crisis-payments","name":"Crisis Payments","description":"Short-term help for Tameside residents facing an immediate financial crisis.","area":"Tameside residents or people about to become residents","access":"Use the council source page for the current application route."}'::jsonb),
    ('tameside-homelessness-service', '{"slug":"tameside-homelessness-service","name":"Tameside Homelessness Service","description":"Council information for people who are homeless or at risk of losing their home.","area":"People seeking homelessness help from Tameside Council","access":"Use the council source page for current contact, referral and emergency routes."}'::jsonb),
    ('adult-mental-health-services', '{"slug":"adult-mental-health-services","name":"Adult Mental Health Services","description":"Council adult social-care information about mental-health support in Tameside.","area":"Adult social-care support in Tameside","access":"Use the council source page for current referral and urgent-help information."}'::jsonb)
) as fixture(page_key, payload) on fixture.page_key = page.key;

insert into catalogue.entries (slug)
select normalized_payload ->> 'slug'
from ingest.extraction_candidates
order by normalized_payload ->> 'slug';

insert into catalogue.publications (
  entry_id, approved_candidate_id, version_number, published_at, name,
  description, provider_name, source_status, cost_summary, access_summary,
  source_checked_at, completeness_band, completeness_inputs, document
)
select
  entry.id,
  candidate.id,
  1,
  '2026-09-16T00:00:00Z',
  candidate.normalized_payload ->> 'name',
  candidate.normalized_payload ->> 'description',
  'Tameside Metropolitan Borough Council',
  'healthy',
  candidate.normalized_payload ->> 'cost',
  candidate.normalized_payload ->> 'access',
  '2026-09-15T22:09:00Z',
  'partial',
  jsonb_build_object(
    'name', true,
    'description', true,
    'provider', true,
    'source', true,
    'contact', false,
    'opening_times', false
  ),
  candidate.normalized_payload
from ingest.extraction_candidates candidate
join catalogue.entries entry
  on entry.slug = candidate.normalized_payload ->> 'slug';

update catalogue.entries entry
set
  lifecycle = 'active',
  active_publication_id = publication.id,
  updated_at = '2026-09-16T00:00:00Z'
from catalogue.publications publication
where publication.entry_id = entry.id;

insert into ingest.review_decisions (
  candidate_id, decision, reason, reviewer, decided_at, resulting_publication_id
)
select
  publication.approved_candidate_id,
  'approved',
  'Reviewed fixture derived from the provisional Tameside source manifest.',
  'ORUK Navigator maintainer review',
  '2026-09-16T00:00:00Z',
  publication.id
from catalogue.publications publication;

insert into catalogue.source_actions (
  publication_id, kind, label, url
)
select
  publication.id,
  'authoritative_details',
  'Check current details on the council website',
  page.canonical_url
from catalogue.publications publication
join ingest.extraction_candidates candidate
  on candidate.id = publication.approved_candidate_id
join ingest.source_pages page on page.id = candidate.source_page_id;

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
  '2026-09-16T00:00:00Z'
from catalogue.publications publication;

insert into catalogue.search_projection_jobs (
  publication_id, status, attempt_count, last_attempted_at, projected_at
)
select
  publication.id,
  'succeeded',
  1,
  '2026-09-16T00:00:00Z',
  '2026-09-16T00:00:00Z'
from catalogue.publications publication;
