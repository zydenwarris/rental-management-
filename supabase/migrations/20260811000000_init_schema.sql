-- Initial schema for the rental management app.
--
-- Mirrors the domain in src/modules/*/[entity].types.ts one table per entity, plus a
-- `landlords` table keyed directly to auth.users so every RLS policy is a single column
-- comparison against auth.uid() with no join.
--
-- WHAT THIS FILE ENFORCES, AND WHAT IT DOES NOT
--
-- The zod schemas in src/modules/*/[entity].schemas.ts remain the single home for request
-- validation: field lengths, trimming, and enum membership are checked at the API boundary.
-- Duplicating maximum string lengths here would give one fact two homes, so they are absent
-- by design. What lives here instead are the invariants the *database* must own to stay
-- correct no matter what writes to it:
--
--   * referential integrity, including cross-landlord and cross-property coherence
--   * non-overlapping leases on a unit (a read-check-write at READ COMMITTED cannot do this)
--   * unit label uniqueness, case- and space-insensitive
--   * enum domains, numeric sign/range, and date ordering
--   * row-level isolation between landlords
--
-- CONVENTIONS
--
--   ids        prefixed text ('prop_<uuid>'), matching IdPrefix in src/shared/ids.ts.
--              COLLATE "C" for deterministic, index-friendly comparison. The `like` check
--              gives the database the invariant that ids.ts documents in a comment.
--   money      bigint, integer TTD cents. `integer` would cap at ~TTD 21.4M, which is
--              narrower than the Cents type in src/shared/money.ts.
--   dates      `date`. Calendar dates carry no timezone; see the header of shared/dates.ts.
--   audit      timestamptz, defaulting to now().
--   enums      text + a named CHECK rather than a Postgres ENUM type. `supabase gen types`
--              turns an ENUM into a TypeScript union, which would compete with the const
--              objects in *.types.ts for ownership of the values. The constraint names
--              (chk_leases_status, ...) are the lookup keys for error translation in
--              src/shared/db/errors.ts.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- landlords — one row per authenticated user
-- ---------------------------------------------------------------------------
-- id IS the auth.users id rather than a generated 'lord_' id, so policies read
-- `landlord_id = auth.uid()` directly. Rows are created by an upsert on first
-- authenticated request (src/shared/auth/landlords.ts), not by a trigger on
-- auth.users: a trigger that raises for any reason fails signup with an opaque
-- "Database error saving new user" in a place with no application logs.

create table public.landlords (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text        not null default '',
  display_name text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.landlords enable row level security;

revoke all on public.landlords from anon;
grant select, insert, update on public.landlords to authenticated;

create policy landlords_select on public.landlords
  for select to authenticated using (id = (select auth.uid()));

-- Lets the API create its own landlord row without ever holding the service_role key.
create policy landlords_insert on public.landlords
  for insert to authenticated with check (id = (select auth.uid()));

create policy landlords_update on public.landlords
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------

create table public.properties (
  id          text collate "C" primary key constraint chk_properties_id check (id like 'prop\_%'),
  landlord_id uuid not null references public.landlords (id) on delete cascade,
  name        text not null,
  type        text not null constraint chk_properties_type
                check (type in ('single_family', 'apartment', 'multi_unit',
                                'townhouse', 'commercial', 'other')),
  address     text not null,
  city        text not null,
  status      text not null default 'active' constraint chk_properties_status
                check (status in ('active', 'archived')),
  description text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Referenced by the composite FKs below, which make a child row pointing at
  -- another landlord's parent structurally impossible rather than merely
  -- prevented by the repository's WHERE clause.
  constraint properties_id_landlord_key unique (id, landlord_id)
);

create index properties_landlord_idx on public.properties (landlord_id);

alter table public.properties enable row level security;
revoke all on public.properties from anon;
grant select, insert, update, delete on public.properties to authenticated;

-- (select auth.uid()) rather than a bare call: the subquery is evaluated once as an
-- InitPlan instead of once per row. Supabase's documented RLS performance guidance.
create policy properties_rw on public.properties
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
-- Deliberately minimal personal data — contact details and an emergency contact only.
-- See the comment on the Tenant interface in tenants/tenant.types.ts.

create table public.tenants (
  id                      text collate "C" primary key constraint chk_tenants_id check (id like 'tnt\_%'),
  landlord_id             uuid not null references public.landlords (id) on delete cascade,
  full_name               text not null,
  phone                   text not null,
  email                   text not null default '',
  emergency_contact_name  text not null default '',
  emergency_contact_phone text not null default '',
  notes                   text not null default '',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint tenants_id_landlord_key unique (id, landlord_id)
);

create index tenants_landlord_idx on public.tenants (landlord_id);

alter table public.tenants enable row level security;
revoke all on public.tenants from anon;
grant select, insert, update, delete on public.tenants to authenticated;

create policy tenants_rw on public.tenants
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- units
-- ---------------------------------------------------------------------------

create table public.units (
  id          text collate "C" primary key constraint chk_units_id check (id like 'unit\_%'),
  landlord_id uuid not null references public.landlords (id) on delete cascade,
  property_id text collate "C" not null,
  label       text not null,
  bedrooms    integer not null constraint chk_units_bedrooms  check (bedrooms  between 0 and 50),
  bathrooms   integer not null constraint chk_units_bathrooms check (bathrooms between 0 and 50),
  -- Advertised rent; the lease's own monthly_rent governs billing.
  market_rent bigint  not null constraint chk_units_market_rent check (market_rent >= 0),
  status      text not null default 'vacant' constraint chk_units_status
                check (status in ('occupied', 'vacant', 'under_maintenance')),
  description text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint units_property_fk foreign key (property_id, landlord_id)
    references public.properties (id, landlord_id),

  -- Referenced by leases/expenses/maintenance to keep their denormalised
  -- property_id honest against the unit they name.
  constraint units_id_property_key unique (id, property_id),
  constraint units_id_landlord_key unique (id, landlord_id)
);

-- Mirrors sameLabel() in units/unit.service.ts: "Apt 1A" and "apt 1a " are the same
-- unit to a human.
--
-- 2026-08-11: not an exact match. JS .trim() strips all Unicode whitespace, SQL btrim()
-- with no second argument strips ASCII spaces only. They never diverge in practice
-- because unitCreateSchema already .trim()s the label before it reaches storage, so this
-- expression only ever sees JS-trimmed input. Accepted rather than reimplementing
-- Unicode trimming in SQL.
create unique index units_label_unique_per_property
  on public.units (property_id, lower(btrim(label)));

create index units_property_idx on public.units (property_id);
create index units_landlord_idx on public.units (landlord_id);

alter table public.units enable row level security;
revoke all on public.units from anon;
grant select, insert, update, delete on public.units to authenticated;

create policy units_rw on public.units
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- leases
-- ---------------------------------------------------------------------------

create table public.leases (
  id                 text collate "C" primary key constraint chk_leases_id check (id like 'lse\_%'),
  landlord_id        uuid not null references public.landlords (id) on delete cascade,
  tenant_id          text collate "C" not null,
  unit_id            text collate "C" not null,
  -- Denormalised from the unit for cheap property-level queries; the composite FK
  -- below guarantees it agrees with the unit rather than drifting.
  property_id        text collate "C" not null,
  -- Inclusive first and last day of the term.
  start_date         date not null,
  end_date           date not null,
  monthly_rent       bigint  not null constraint chk_leases_monthly_rent     check (monthly_rent > 0),
  security_deposit   bigint  not null constraint chk_leases_security_deposit check (security_deposit >= 0),
  -- 1-28 so the day exists in every month.
  rent_due_day       integer not null constraint chk_leases_rent_due_day check (rent_due_day between 1 and 28),
  status             text not null constraint chk_leases_status
                       check (status in ('upcoming', 'active', 'expired', 'terminated')),
  utilities_included boolean not null default false,
  notes              text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Matches leaseCreateSchema's termIsOrdered refinement: the term spans at least one day.
  constraint chk_leases_term check (end_date > start_date),

  constraint leases_tenant_fk foreign key (tenant_id, landlord_id)
    references public.tenants (id, landlord_id),
  constraint leases_unit_fk foreign key (unit_id, property_id)
    references public.units (id, property_id),
  constraint leases_property_fk foreign key (property_id, landlord_id)
    references public.properties (id, landlord_id),

  constraint leases_id_landlord_key unique (id, landlord_id)
);

-- The core invariant: one unit cannot be let twice over the same days.
--
-- '[]' inclusive bounds match datesOverlap() in shared/dates.ts, which uses
-- areIntervalsOverlapping({ inclusive: true }) — so a lease ending 31 May conflicts with
-- one starting 31 May. The partial WHERE matches OCCUPYING_STATUSES in lease.types.ts:
-- expired and terminated leases no longer hold the unit.
--
-- lease.service.ts also checks this before inserting, and that check produces the better
-- error message (it can name the conflicting lease). This constraint is what makes the
-- rule actually true: a read-check-write at READ COMMITTED does not prevent a concurrent
-- overlapping insert.
alter table public.leases add constraint leases_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('upcoming', 'active'));

create index leases_unit_idx     on public.leases (unit_id);
create index leases_tenant_idx   on public.leases (tenant_id);
create index leases_property_idx on public.leases (property_id);
create index leases_landlord_idx on public.leases (landlord_id);

alter table public.leases enable row level security;
revoke all on public.leases from anon;
grant select, insert, update, delete on public.leases to authenticated;

create policy leases_rw on public.leases
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id           text collate "C" primary key constraint chk_payments_id check (id like 'pay\_%'),
  landlord_id  uuid not null references public.landlords (id) on delete cascade,
  lease_id     text collate "C" not null,
  -- Denormalised from the lease so payment queries need no joins.
  tenant_id    text collate "C" not null,
  unit_id      text collate "C" not null,
  property_id  text collate "C" not null,
  -- Strictly positive: zero and negative "payments" are the classic way a rent ledger
  -- silently goes wrong. See the comment in payment.schemas.ts.
  amount       bigint not null constraint chk_payments_amount check (amount > 0),
  payment_date date not null,
  due_date     date not null,
  method       text not null constraint chk_payments_method
                 check (method in ('cash', 'bank_transfer', 'cheque', 'card', 'other')),
  status       text not null constraint chk_payments_status
                 check (status in ('paid', 'partial', 'pending', 'late')),
  reference    text not null default '',
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint payments_lease_fk foreign key (lease_id, landlord_id)
    references public.leases (id, landlord_id),
  constraint payments_tenant_fk foreign key (tenant_id, landlord_id)
    references public.tenants (id, landlord_id),
  constraint payments_unit_fk foreign key (unit_id, property_id)
    references public.units (id, property_id),
  constraint payments_property_fk foreign key (property_id, landlord_id)
    references public.properties (id, landlord_id)
);

create index payments_lease_idx    on public.payments (lease_id);
create index payments_tenant_idx   on public.payments (tenant_id);
create index payments_property_idx on public.payments (property_id);
create index payments_landlord_idx on public.payments (landlord_id);

alter table public.payments enable row level security;
revoke all on public.payments from anon;
grant select, insert, update, delete on public.payments to authenticated;

create policy payments_rw on public.payments
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------

create table public.expenses (
  id          text collate "C" primary key constraint chk_expenses_id check (id like 'exp\_%'),
  landlord_id uuid not null references public.landlords (id) on delete cascade,
  property_id text collate "C" not null,
  -- null when the cost belongs to the property as a whole rather than one unit.
  unit_id     text collate "C",
  category    text not null constraint chk_expenses_category
                check (category in ('maintenance', 'utilities', 'insurance', 'property_tax',
                                    'management', 'repairs', 'supplies', 'other')),
  description text not null,
  amount      bigint not null constraint chk_expenses_amount check (amount > 0),
  date        date not null,
  vendor      text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint expenses_property_fk foreign key (property_id, landlord_id)
    references public.properties (id, landlord_id),

  -- assertUnitBelongsToProperty() in expense.service.ts, as a constraint. MATCH SIMPLE
  -- (the default) skips the check entirely when unit_id is null, which is exactly that
  -- function's "if (unitId === null) return".
  constraint expenses_unit_matches_property foreign key (unit_id, property_id)
    references public.units (id, property_id)
);

create index expenses_property_idx on public.expenses (property_id);
create index expenses_unit_idx     on public.expenses (unit_id);
create index expenses_landlord_idx on public.expenses (landlord_id);

alter table public.expenses enable row level security;
revoke all on public.expenses from anon;
grant select, insert, update, delete on public.expenses to authenticated;

create policy expenses_rw on public.expenses
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- maintenance_requests
-- ---------------------------------------------------------------------------

create table public.maintenance_requests (
  id             text collate "C" primary key constraint chk_maintenance_id check (id like 'mnt\_%'),
  landlord_id    uuid not null references public.landlords (id) on delete cascade,
  property_id    text collate "C" not null,
  -- null when the issue affects common areas rather than one unit.
  unit_id        text collate "C",
  title          text not null,
  description    text not null,
  priority       text not null default 'medium' constraint chk_maintenance_priority
                   check (priority in ('low', 'medium', 'high', 'urgent')),
  -- Transitions between these are governed by ALLOWED_STATUS_TRANSITIONS in
  -- maintenance.types.ts; the service enforces which moves are legal.
  status         text not null default 'open' constraint chk_maintenance_status
                   check (status in ('open', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  contractor     text not null default '',
  estimated_cost bigint constraint chk_maintenance_estimated_cost check (estimated_cost >= 0),
  actual_cost    bigint constraint chk_maintenance_actual_cost    check (actual_cost >= 0),
  reported_date  date not null,
  scheduled_date date,
  completed_date date,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint maintenance_property_fk foreign key (property_id, landlord_id)
    references public.properties (id, landlord_id),
  constraint maintenance_unit_matches_property foreign key (unit_id, property_id)
    references public.units (id, property_id)
);

create index maintenance_property_idx on public.maintenance_requests (property_id);
create index maintenance_unit_idx     on public.maintenance_requests (unit_id);
create index maintenance_landlord_idx on public.maintenance_requests (landlord_id);

alter table public.maintenance_requests enable row level security;
revoke all on public.maintenance_requests from anon;
grant select, insert, update, delete on public.maintenance_requests to authenticated;

create policy maintenance_rw on public.maintenance_requests
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));
