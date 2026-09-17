begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select results_eq(
  $$select count(*)::bigint from ingest.sources where key = 'tmbc-web' and is_enabled$$,
  array[1::bigint],
  'the admitted Tameside source is enabled'
);

select results_eq(
  $$select count(*)::bigint from ingest.source_licences where review_status = 'approved'$$,
  array[1::bigint],
  'one approved source licence is seeded'
);

select results_eq(
  $$select count(*)::bigint from ingest.source_pages where admission_status = 'approved'$$,
  array[10::bigint],
  'ten approved source pages are seeded'
);

select results_eq(
  $$select count(*)::bigint from ingest.extraction_candidates where review_status = 'approved' and adapter_version = 'fixture-v1'$$,
  array[10::bigint],
  'ten reviewed extraction candidates are seeded'
);

select results_eq(
  $$
    select count(*)::bigint
    from catalogue.entries e
    join catalogue.publications p on p.id = e.active_publication_id
    join ingest.extraction_candidates c on c.id = p.approved_candidate_id
    where e.lifecycle = 'active' and c.adapter_version = 'fixture-v1'
  $$,
  array[10::bigint],
  'ten active catalogue entries are seeded'
);

select results_eq(
  $$
    select count(*)::bigint
    from catalogue.entries e
    join catalogue.publications p
      on p.id = e.active_publication_id and p.entry_id = e.id
    join ingest.extraction_candidates c on c.id = p.approved_candidate_id
    where c.adapter_version = 'fixture-v1'
  $$,
  array[10::bigint],
  'every seed entry activates its own publication'
);

select results_eq(
  $$select count(*)::bigint from catalogue.source_actions where kind = 'authoritative_details'$$,
  array[10::bigint],
  'every seed publication has an authoritative source action'
);

select results_eq(
  $$
    select count(*)::bigint
    from catalogue.search_documents d
    join catalogue.publications p on p.id = d.publication_id
    join ingest.extraction_candidates c on c.id = p.approved_candidate_id
    where c.adapter_version = 'fixture-v1'
  $$,
  array[10::bigint],
  'every seed publication has a search document'
);

select results_eq(
  $$
    select count(*)::bigint
    from catalogue.publications
    where provider_name = 'Tameside Metropolitan Borough Council'
  $$,
  array[10::bigint],
  'all seed publications retain the reviewed publisher'
);

select * from finish();
rollback;
