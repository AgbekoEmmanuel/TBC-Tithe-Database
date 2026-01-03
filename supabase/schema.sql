-- Enable UUID extension (still needed for auth)
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table (extends auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'OFFICER',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Members Table
create table members (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  phone text,
  fellowship text,
  status text default 'ACTIVE',
  ytd_total numeric default 0
);

-- 3. Create Batches Table
create table batches (
  id text primary key,
  date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'OPEN',
  total_system numeric default 0,
  total_cash numeric default 0,
  variance numeric default 0,
  finalized_by text
);

-- 4. Create Transactions Table
create table transactions (
  id text primary key,
  timestamp timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  batch_id text references batches(id),
  member_id text references members(id),
  amount numeric not null,
  method text not null,
  officer_id text,
  -- Denormalized fields for easier querying if needed, or join
  member_name text, 
  fellowship text
);

-- Enable RLS
alter table profiles enable row level security;
alter table members enable row level security;
alter table batches enable row level security;
alter table transactions enable row level security;

-- Create Policies (Allow all for authenticated users for now)
create policy "Allow all for authenticated users" on profiles for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on members for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on batches for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on transactions for all using (auth.role() = 'authenticated');
