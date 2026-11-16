-- ==============================================================================
-- ÁREA NOBRE — BLOCO 6B — ETAPA 6B.3.1
-- Migração Exclusivamente Aditiva: Inclusão de usableArea (Área útil) em CommercialUnit
-- ==============================================================================
-- Garantias de Segurança:
-- 1. Nenhuma instrução DROP, TRUNCATE ou DELETE.
-- 2. Nenhum preenchimento automático de usableArea a partir de privateArea.
-- 3. Preservação integral de todos os registros existentes.

ALTER TABLE "CommercialUnit" ADD COLUMN IF NOT EXISTS "usableArea" DOUBLE PRECISION;

