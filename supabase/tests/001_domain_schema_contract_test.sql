begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_schema('ingest', 'ingest schema exists');
select has_schema('catalogue', 'catalogue schema exists');

select has_table('ingest', 'sources', 'sources table exists');
select has_table('ingest', 'source_licences', 'source licences table exists');
select has_table('ingest', 'source_pages', 'source pages table exists');
select has_table('ingest', 'ingestion_runs', 'ingestion runs table exists');
select has_table('ingest', 'fetch_observations', 'fetch observations table exists');
select has_table('ingest', 'extraction_candidates', 'extraction candidates table exists');
select has_table('ingest', 'candidate_field_evidence', 'candidate field evidence table exists');
select has_table('ingest', 'review_decisions', 'review decisions table exists');

select has_table('catalogue', 'entries', 'catalogue entries table exists');
select has_table('catalogue', 'publications', 'immutable publications table exists');
select has_role('navigator_catalogue_reader', 'server catalogue reader role exists');
select has_role('navigator_ingest_writer', 'server ingestion writer role exists');

select ok(not has_schema_privilege('anon', 'ingest', 'usage'), 'anon cannot access ingest schema');
select ok(not has_schema_privilege('authenticated', 'ingest', 'usage'), 'authenticated cannot access ingest schema');
select ok(not has_schema_privilege('anon', 'catalogue', 'usage'), 'anon cannot access catalogue schema');
select ok(not has_schema_privilege('authenticated', 'catalogue', 'usage'), 'authenticated cannot access catalogue schema');

select * from finish();
rollback;
