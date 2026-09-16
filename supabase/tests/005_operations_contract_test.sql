begin;

select plan(15);

select has_schema('operations', 'private operations schema exists');
select has_role('navigator_operations_writer', 'least-privilege operations role exists');
select has_table('operations', 'correction_reports', 'correction reports exist');
select has_table('operations', 'correction_transitions', 'correction transitions exist');
select has_table('operations', 'abuse_windows', 'short-lived abuse windows exist');
select has_table('operations', 'operational_events', 'allowlisted operational events exist');
select has_table('operations', 'alerts', 'deduplicated alerts exist');

select ok(not has_schema_privilege('anon', 'operations', 'usage'), 'anon cannot access operations');
select ok(not has_schema_privilege('authenticated', 'operations', 'usage'), 'authenticated cannot access operations');
select ok(not has_table_privilege('anon', 'operations.correction_reports', 'select'), 'anon cannot read reports');
select ok(not has_table_privilege('authenticated', 'operations.correction_reports', 'insert'), 'authenticated cannot submit directly');
select ok(has_table_privilege('navigator_operations_writer', 'operations.correction_reports', 'insert'), 'server writer can create reports');
select ok(has_table_privilege('navigator_operations_writer', 'catalogue.entries', 'select'), 'server writer can resolve entries');
select col_is_null('operations', 'correction_reports', 'detail', 'correction detail can be removed by retention');
select col_is_pk('operations', 'abuse_windows', 'key_hash', 'one active abuse window exists per keyed hash');

select * from finish();
rollback;
