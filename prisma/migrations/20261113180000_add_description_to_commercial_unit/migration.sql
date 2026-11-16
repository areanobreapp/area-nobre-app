-- ==============================================================================
-- ÁREA NOBRE — BLOCO 6B — ETAPA 6B.3.2
-- Migração exclusivamente aditiva: descrição geral da unidade comercial
-- ==============================================================================
-- Garantias:
-- 1. Nenhuma instrução DROP, TRUNCATE, DELETE ou UPDATE.
-- 2. Coluna opcional (NULL) — registros existentes permanecem inalterados.
-- 3. Independente de "publicNotes" e "internalNotes".
-- 4. Limite de 500 caracteres validado na aplicação (serviço e formulário).

ALTER TABLE "CommercialUnit" ADD COLUMN IF NOT EXISTS "description" TEXT;

