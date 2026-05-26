-- ============================================================
-- TJMG Fiscal v81 — Criar tabela comunicados
-- Supabase → SQL Editor → colar e executar
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comunicados (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     TEXT NOT NULL,
  texto      TEXT NOT NULL,
  reg        TEXT DEFAULT 'todos',
  autor      TEXT,
  ativo      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comunicados_reg    ON public.comunicados(reg);
CREATE INDEX IF NOT EXISTS idx_comunicados_ativo  ON public.comunicados(ativo);
CREATE INDEX IF NOT EXISTS idx_comunicados_expira ON public.comunicados(expires_at);

ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_le_comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "service_role_comun"  ON public.comunicados;
DROP POLICY IF EXISTS "auth_coord_insere"   ON public.comunicados;

-- Todos leem comunicados ativos e não expirados
CREATE POLICY "anon_le_comunicados" ON public.comunicados
  FOR SELECT TO anon
  USING (ativo = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- service_role acesso total
CREATE POLICY "service_role_comun" ON public.comunicados
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Coord/admin podem publicar e editar
CREATE POLICY "auth_coord_insere" ON public.comunicados
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'app_tipo') IN ('admin','coordenador'))
  WITH CHECK ((auth.jwt() ->> 'app_tipo') IN ('admin','coordenador'));

GRANT SELECT        ON public.comunicados TO anon;
GRANT INSERT,UPDATE ON public.comunicados TO authenticated;
GRANT ALL           ON public.comunicados TO service_role;

-- Exemplos iniciais
INSERT INTO public.comunicados (titulo, texto, reg, autor) VALUES
  ('Bem-vindo ao v81',
   'Sistema atualizado: modo escuro, GPS automático, Realtime, cronômetro e muito mais. Veja as novidades em 🆕 no perfil.',
   'todos', 'Administrador'),
  ('Exemplo — Comunicado Regional',
   'Este comunicado aparece só para a região NORTE. Edite ou delete no painel Supabase → Table Editor → comunicados.',
   'NORTE', 'Administrador')
ON CONFLICT DO NOTHING;

-- Confirmar criação
SELECT 'Tabela criada com ' || COUNT(*) || ' registros de exemplo' AS resultado
FROM public.comunicados;
