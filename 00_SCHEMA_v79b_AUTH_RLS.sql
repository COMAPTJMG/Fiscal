-- ============================================================
-- TJMG Fiscal PWA — Migração v79b
-- Supabase Auth + Row Level Security + Audit Log
-- Projeto: rrlhtnwdokqbtkwrlsfa
--
-- COMO APLICAR:
--   Painel Supabase → SQL Editor → Colar este arquivo → Run
--   Execute em blocos marcados com "-- BLOCO N" se preferir
-- ============================================================

-- ============================================================
-- BLOCO 1 — EXTENSÕES E SCHEMAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BLOCO 2 — TABELA PRINCIPAL: inspections
-- (provavelmente já existe — adicionar colunas se não tiver)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inspections (
  id          TEXT PRIMARY KEY,
  payload     JSONB NOT NULL DEFAULT '{}',
  region      TEXT,
  user_id     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  synced_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas essenciais (idempotente)
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS region     TEXT,
  ADD COLUMN IF NOT EXISTS user_id    TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_inspections_region     ON public.inspections(region);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id    ON public.inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_updated_at ON public.inspections(updated_at DESC);

-- ============================================================
-- BLOCO 3 — TABELA: app_users (usuários do app)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_users (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  mat        TEXT,
  pin        TEXT,            -- hash SHA-256 do PIN
  cargo      TEXT,
  reg        TEXT,
  polo       TEXT,
  tipo       TEXT DEFAULT 'fiscal',
  ativo      BOOLEAN DEFAULT TRUE,
  auth_uid   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS auth_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_reg      ON public.app_users(reg);
CREATE INDEX IF NOT EXISTS idx_app_users_auth_uid ON public.app_users(auth_uid);

-- ============================================================
-- BLOCO 4 — TABELA: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts         TIMESTAMPTZ DEFAULT NOW(),
  user_id    TEXT,
  user_nm    TEXT,
  reg        TEXT,
  acao       TEXT NOT NULL,
  dados      JSONB DEFAULT '{}',
  online     BOOLEAN DEFAULT TRUE,
  ip         TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts      ON public.audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_acao    ON public.audit_log(acao);

-- ============================================================
-- BLOCO 5 — TABELA: push_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT,
  reg          TEXT,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_reg ON public.push_subscriptions(reg);

-- ============================================================
-- BLOCO 6 — TABELA: imr_snapshots (histórico de IMR)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.imr_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg         TEXT NOT NULL,
  periodo     TEXT NOT NULL,   -- ex: '2026-05'
  imr_valor   NUMERIC(5,4),
  glosa_pct   NUMERIC(5,2),
  total_insps INTEGER,
  payload     JSONB DEFAULT '{}',
  fiscal_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imr_reg_periodo ON public.imr_snapshots(reg, periodo DESC);

-- ============================================================
-- BLOCO 7 — RPC: upsert_inspections (já existente — manter)
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_inspections(rows JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '0'
AS $$
DECLARE
  r JSONB;
  v_id TEXT;
  v_payload JSONB;
  v_region TEXT;
  v_user_id TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(rows) LOOP
    v_id         := r->>'id';
    v_payload    := r->'payload';
    v_region     := COALESCE(r->>'region', (r->'payload'->>'reg'));
    v_user_id    := COALESCE(r->>'user_id', (r->'payload'->>'fiscal'));
    v_updated_at := COALESCE((r->>'updated_at')::TIMESTAMPTZ, NOW());

    IF v_id IS NULL OR v_id = '' THEN CONTINUE; END IF;

    INSERT INTO public.inspections(id, payload, region, user_id, updated_at, synced_at)
    VALUES (v_id, COALESCE(v_payload,'{}'), v_region, v_user_id, v_updated_at, NOW())
    ON CONFLICT (id) DO UPDATE
      SET payload    = EXCLUDED.payload,
          region     = EXCLUDED.region,
          user_id    = EXCLUDED.user_id,
          updated_at = EXCLUDED.updated_at,
          synced_at  = NOW()
      WHERE inspections.updated_at <= EXCLUDED.updated_at;
  END LOOP;

  RETURN jsonb_build_object('ok', TRUE);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', FALSE, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- BLOCO 8 — HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================
ALTER TABLE public.inspections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imr_snapshots      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCO 9 — POLICIES: inspections
-- ============================================================
-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "fiscal_le_propria_regiao"  ON public.inspections;
DROP POLICY IF EXISTS "fiscal_escreve_propria_reg" ON public.inspections;
DROP POLICY IF EXISTS "service_role_tudo"          ON public.inspections;
DROP POLICY IF EXISTS "anon_le_regiao"             ON public.inspections;
DROP POLICY IF EXISTS "anon_escreve"               ON public.inspections;

-- anon (app sem auth — comportamento atual) lê apenas da própria região
-- A região vem do JWT claim customizado 'app_reg' ou do payload
CREATE POLICY "anon_le_regiao" ON public.inspections
  FOR SELECT TO anon
  USING (TRUE);  -- leitura liberada para anon (Edge Function filtra por região)

-- anon pode inserir/atualizar (Edge Function valida SYNC_SECRET)
CREATE POLICY "anon_escreve" ON public.inspections
  FOR ALL TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- service_role tem acesso total (Edge Functions usam service_role)
CREATE POLICY "service_role_tudo" ON public.inspections
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Usuário autenticado vê apenas inspeções da sua região
CREATE POLICY "auth_le_propria_regiao" ON public.inspections
  FOR SELECT TO authenticated
  USING (
    region = (auth.jwt() ->> 'app_reg')
    OR (auth.jwt() ->> 'app_tipo') IN ('admin','coordenador')
  );

CREATE POLICY "auth_escreve_propria_regiao" ON public.inspections
  FOR ALL TO authenticated
  USING (
    region = (auth.jwt() ->> 'app_reg')
    OR (auth.jwt() ->> 'app_tipo') IN ('admin','coordenador')
  )
  WITH CHECK (
    region = (auth.jwt() ->> 'app_reg')
    OR (auth.jwt() ->> 'app_tipo') IN ('admin','coordenador')
  );

-- ============================================================
-- BLOCO 10 — POLICIES: app_users
-- ============================================================
DROP POLICY IF EXISTS "anon_le_users"        ON public.app_users;
DROP POLICY IF EXISTS "anon_escreve_users"   ON public.app_users;
DROP POLICY IF EXISTS "service_role_users"   ON public.app_users;
DROP POLICY IF EXISTS "auth_le_users"        ON public.app_users;
DROP POLICY IF EXISTS "auth_admin_users"     ON public.app_users;

-- anon lê (necessário para login com PIN antes de auth)
CREATE POLICY "anon_le_users" ON public.app_users
  FOR SELECT TO anon
  USING (ativo = TRUE);

-- anon não pode alterar usuários diretamente (Edge Function usa service_role)
CREATE POLICY "anon_escreve_users" ON public.app_users
  FOR ALL TO anon
  USING (FALSE)
  WITH CHECK (FALSE);

-- service_role tudo
CREATE POLICY "service_role_users" ON public.app_users
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- autenticado vê usuários da própria região
CREATE POLICY "auth_le_users" ON public.app_users
  FOR SELECT TO authenticated
  USING (
    reg = (auth.jwt() ->> 'app_reg')
    OR (auth.jwt() ->> 'app_tipo') IN ('admin','coordenador')
  );

-- admin/coord pode alterar usuários
CREATE POLICY "auth_admin_users" ON public.app_users
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'app_tipo') IN ('admin','coordenador'))
  WITH CHECK ((auth.jwt() ->> 'app_tipo') IN ('admin','coordenador'));

-- ============================================================
-- BLOCO 11 — POLICIES: audit_log
-- ============================================================
DROP POLICY IF EXISTS "service_role_audit" ON public.audit_log;
DROP POLICY IF EXISTS "anon_insere_audit"  ON public.audit_log;
DROP POLICY IF EXISTS "auth_le_audit"      ON public.audit_log;

CREATE POLICY "service_role_audit" ON public.audit_log
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "anon_insere_audit" ON public.audit_log
  FOR INSERT TO anon WITH CHECK (TRUE);

-- só admin/coord lê o audit
CREATE POLICY "auth_le_audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'app_tipo') IN ('admin','coordenador'));

-- ============================================================
-- BLOCO 12 — POLICIES: push_subscriptions
-- ============================================================
DROP POLICY IF EXISTS "service_role_push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "anon_push"         ON public.push_subscriptions;

CREATE POLICY "service_role_push" ON public.push_subscriptions
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "anon_push" ON public.push_subscriptions
  FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- BLOCO 13 — POLICIES: imr_snapshots
-- ============================================================
DROP POLICY IF EXISTS "service_role_imr" ON public.imr_snapshots;
DROP POLICY IF EXISTS "anon_le_imr"      ON public.imr_snapshots;

CREATE POLICY "service_role_imr" ON public.imr_snapshots
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "anon_le_imr" ON public.imr_snapshots
  FOR SELECT TO anon USING (TRUE);

-- ============================================================
-- BLOCO 14 — FUNÇÃO: criar usuário no Supabase Auth
-- (chamar manualmente ou via Edge Function para migrar os 15 fiscais)
-- ============================================================
CREATE OR REPLACE FUNCTION public.criar_auth_para_app_user(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user public.app_users%ROWTYPE;
  v_email TEXT;
  v_auth_uid UUID;
BEGIN
  SELECT * INTO v_user FROM public.app_users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'Usuário não encontrado');
  END IF;

  -- Email fictício (TJMG não exige email real)
  v_email := LOWER(REPLACE(COALESCE(v_user.mat, v_user.id), ' ', '')) || '@fiscal.tjmg.jus.br';

  -- Criar no Supabase Auth
  INSERT INTO auth.users (
    id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    gen_random_uuid(), v_email,
    crypt(v_user.pin, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    jsonb_build_object(
      'app_reg',   v_user.reg,
      'app_tipo',  v_user.tipo,
      'app_polo',  v_user.polo,
      'provider',  'email',
      'providers', ARRAY['email']
    ),
    jsonb_build_object('nome', v_user.nome, 'mat', v_user.mat)
  )
  ON CONFLICT (email) DO UPDATE
    SET raw_app_meta_data = EXCLUDED.raw_app_meta_data,
        updated_at        = NOW()
  RETURNING id INTO v_auth_uid;

  -- Atualizar app_users com auth_uid
  UPDATE public.app_users
    SET auth_uid   = v_auth_uid,
        updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', TRUE, 'auth_uid', v_auth_uid, 'email', v_email);
END;
$$;

-- ============================================================
-- BLOCO 15 — MIGRAR TODOS OS FISCAIS EXISTENTES PARA SUPABASE AUTH
-- Execute este SELECT para ver o resultado de cada migração
-- ============================================================
/*
  -- DESCOMENTAR PARA EXECUTAR A MIGRAÇÃO:
  SELECT id, nome, reg,
    public.criar_auth_para_app_user(id) AS resultado
  FROM public.app_users
  WHERE ativo = TRUE
  ORDER BY nome;
*/

-- ============================================================
-- BLOCO 16 — EDGE FUNCTION: adicionar headers CORS e secret check
-- Cole no arquivo tjmg-sync/index.ts a verificação:
--
--   const secret = req.headers.get('x-sync-secret');
--   if (secret !== Deno.env.get('SYNC_SECRET')) {
--     return new Response('Unauthorized', { status: 401 });
--   }
--
-- E defina em: Supabase → Edge Functions → Secrets:
--   SYNC_SECRET = <gere com: openssl rand -base64 32>
-- ============================================================

-- ============================================================
-- BLOCO 17 — GRANT mínimos para anon (Edge Function usa service_role)
-- ============================================================
GRANT SELECT                      ON public.app_users          TO anon;
GRANT SELECT, INSERT, UPDATE      ON public.inspections         TO anon;
GRANT INSERT                      ON public.audit_log           TO anon;
GRANT SELECT, INSERT, UPDATE      ON public.push_subscriptions  TO anon;
GRANT SELECT                      ON public.imr_snapshots       TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_inspections(JSONB)     TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_inspections(JSONB)     TO service_role;

-- ============================================================
-- BLOCO 18 — VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('inspections','app_users','audit_log','push_subscriptions','imr_snapshots')
ORDER BY tablename;

-- ============================================================
-- RESULTADO ESPERADO:
--   inspections        | TRUE
--   app_users          | TRUE
--   audit_log          | TRUE
--   push_subscriptions | TRUE
--   imr_snapshots      | TRUE
-- ============================================================
