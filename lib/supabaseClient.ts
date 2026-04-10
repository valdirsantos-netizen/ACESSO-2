import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

-- 1. Cria a tabela de veículos (se não existir)
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  tag text unique,
  plate text,
  name text,
  status text default 'Liberado'
);

-- 2. Cria a tabela de logs (se não existir)
create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  tag text,
  plate text,
  name text,
  action text,
  result text,
  operator_name text,
  created_at timestamp with time zone default now()
);

-- 3. Habilita a segurança
alter table vehicles enable row level security;
alter table access_logs enable row level security;

-- 4. Libera geral para quem estiver logado (Policies)
drop policy if exists "Permitir leitura para autenticados" on vehicles;
create policy "Permitir leitura para autenticados" on vehicles for select to authenticated using (true);

drop policy if exists "Permitir inserção para autenticados" on access_logs;
create policy "Permitir inserção para autenticados" on access_logs for insert to authenticated with check (true);

drop policy if exists "Permitir leitura de logs" on access_logs;
create policy "Permitir leitura de logs" on access_logs for select to authenticated using (true);
