create table if not exists public.accountability_reports (
  accountability_id bigint generated always as identity primary key,
  issued_to_id uuid not null references public.users(id) on delete restrict,
  item_id bigint not null references public.inventory(item_id) on delete restrict,
  department_id bigint references public.departments(id) on delete set null,
  quantity_logged integer not null check (quantity_logged > 0),
  unit_snapshot text,
  description_snapshot text,
  property_no_snapshot text,
  issue_date date not null default current_date,
  source text not null default 'inventory_log',
  reference_type text,
  reference_id bigint,
  contact_snapshot text,
  remarks text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  uid uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create unique index if not exists accountability_reports_uid_key
  on public.accountability_reports(uid);

create index if not exists accountability_reports_issue_date_idx
  on public.accountability_reports(issue_date desc);

create index if not exists accountability_reports_issued_to_idx
  on public.accountability_reports(issued_to_id);

create index if not exists accountability_reports_item_idx
  on public.accountability_reports(item_id);

create index if not exists accountability_reports_department_idx
  on public.accountability_reports(department_id);
