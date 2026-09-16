begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

select extensions.has_table('catalogue', 'search_projection_jobs', 'projection job table exists');
select extensions.has_index(
  'catalogue',
  'search_projection_jobs',
  'search_projection_jobs_publication_id_key',
  'one projection job exists per publication'
);
select extensions.col_not_null(
  'catalogue',
  'search_projection_jobs',
  'publication_id',
  'projection job publication is required'
);
select extensions.col_default_is(
  'catalogue',
  'search_projection_jobs',
  'status',
  'pending'::text,
  'projection starts pending'
);
select extensions.schema_privs_are(
  'catalogue',
  'anon',
  array[]::text[],
  'anon has no catalogue schema privileges'
);
select extensions.table_privs_are(
  'catalogue',
  'search_projection_jobs',
  'anon',
  array[]::text[],
  'anon cannot access projection jobs'
);
select extensions.table_privs_are(
  'catalogue',
  'search_projection_jobs',
  'navigator_catalogue_reader',
  array['SELECT'],
  'catalogue reader can inspect projection health'
);

select * from extensions.finish();
rollback;
