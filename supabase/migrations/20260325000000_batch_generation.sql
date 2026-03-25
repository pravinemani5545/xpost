-- Writing styles: one per user, stores their writing style description
create table writing_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  style text not null,
  updated_at timestamptz default now() not null,
  constraint writing_styles_user_id_unique unique (user_id)
);

alter table writing_styles enable row level security;

create policy "Users can manage their own writing style"
  on writing_styles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Content hashes: track generated content to prevent duplicates
create table content_hashes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  hash text not null,
  created_at timestamptz default now() not null,
  constraint content_hashes_user_hash_unique unique (user_id, hash)
);

alter table content_hashes enable row level security;

create policy "Users can manage their own content hashes"
  on content_hashes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_content_hashes_user on content_hashes(user_id);
