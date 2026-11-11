-- ==============================================================================
-- ÁREA NOBRE — MIGRAÇÃO VERSIONADA: CADASTRO MESTRE DE EDIFÍCIOS E CONDOMÍNIOS
-- Identificador: 20261110200000_add_master_building_catalog
-- Compatibilidade: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- 1. AlterTable: Adicionar campos de autoridade municipal, tipo predial e auditoria
ALTER TABLE "Building" 
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "sourceBatch" TEXT,
  ADD COLUMN IF NOT EXISTS "condoType" TEXT DEFAULT 'VERTICAL',
  ADD COLUMN IF NOT EXISTS "alternativeNames" TEXT,
  ADD COLUMN IF NOT EXISTS "blockOrTower" TEXT,
  ADD COLUMN IF NOT EXISTS "isMultiTowerMember" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "geoValidationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "geoConfidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dataValidationStatus" TEXT NOT NULL DEFAULT 'VALIDATED';

-- 2. Flexibilização de obrigatoriedades para dados institucionais importados
ALTER TABLE "Building" ALTER COLUMN "neighborhood" DROP NOT NULL;
ALTER TABLE "Building" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "Building" ALTER COLUMN "longitude" DROP NOT NULL;
ALTER TABLE "Building" ALTER COLUMN "createdById" DROP NOT NULL;

-- 3. Atualização de integridade referencial: createdById com ON DELETE SET NULL
ALTER TABLE "Building" DROP CONSTRAINT IF EXISTS "Building_createdById_fkey";
ALTER TABLE "Building" ADD CONSTRAINT "Building_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Índice Único para Identificação Municipal:
-- No PostgreSQL, UNIQUE(city, source, externalId) garante unicidade estrita para registros
-- municipais (onde externalId não é nulo) e nativamente permite múltiplos registros manuais
-- criados por corretores (onde externalId é nulo, pois NULL != NULL no padrão SQL).
-- Esta definição coincide 100% com o @@unique([city, source, externalId]) do Prisma,
-- garantindo zero drift em futuras migrações.
CREATE UNIQUE INDEX IF NOT EXISTS "Building_city_source_externalId_key" 
  ON "Building"("city", "source", "externalId");

-- 5. Índices de suporte para busca administrativa e gestão de lotes
CREATE INDEX IF NOT EXISTS "Building_source_dataValidationStatus_idx" 
  ON "Building"("source", "dataValidationStatus");

CREATE INDEX IF NOT EXISTS "Building_sourceBatch_idx" 
  ON "Building"("sourceBatch");

