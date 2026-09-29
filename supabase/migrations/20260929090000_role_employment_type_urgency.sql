-- Employment Type (Permanent/Contract) and Urgency on the job-posting form.
-- contract_length already exists and now holds the duration only when
-- employment_type = 'contract' (enforced in the app layer, same as every
-- other cross-field rule in this table).

alter table roles add column employment_type text check (employment_type in ('permanent', 'contract'));
alter table roles add column urgency text not null default 'standard' check (urgency in ('standard', 'urgent', 'immediate'));
