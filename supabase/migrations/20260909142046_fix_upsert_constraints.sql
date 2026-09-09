-- The partial unique indexes from init_schema.sql (`where external_source is not
-- null`) can't be used as an ON CONFLICT target by PostgREST's upsert — Postgres
-- only matches column-list ON CONFLICT inference against a full (non-partial)
-- unique index/constraint. Replace with plain unique constraints instead; this is
-- safe because Postgres unique constraints already treat each NULL as distinct
-- from every other NULL, so organically-created rows (external_source/external_id
-- both null) still won't collide with each other.

drop index if exists companies_external_source_id_key;
alter table companies
  add constraint companies_external_source_id_key unique (external_source, external_id);

drop index if exists candidates_external_source_id_key;
alter table candidates
  add constraint candidates_external_source_id_key unique (external_source, external_id);

drop index if exists roles_external_source_id_key;
alter table roles
  add constraint roles_external_source_id_key unique (external_source, external_id);
