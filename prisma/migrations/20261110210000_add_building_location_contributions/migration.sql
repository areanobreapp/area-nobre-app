-- ==============================================================================
-- ÁREA NOBRE — MIGRAÇÃO VERSIONADA: VALIDAÇÃO COLABORATIVA DE LOCALIZAÇÃO (ETAPA H)
-- Identificador: 20261110210000_add_building_location_contributions
-- Compatibilidade: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- 1. AlterTable: Adicionar contadores e auditoria de geolocalização no Building
ALTER TABLE "Building" 
  ADD COLUMN IF NOT EXISTS "geoContributorsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "geoLastConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "geoAdminDecidedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "geoAdminDecidedById" TEXT;

-- 2. Integridade referencial para geoAdminDecidedById (administrador que validou)
ALTER TABLE "Building" DROP CONSTRAINT IF EXISTS "Building_geoAdminDecidedById_fkey";
ALTER TABLE "Building" ADD CONSTRAINT "Building_geoAdminDecidedById_fkey" 
  FOREIGN KEY ("geoAdminDecidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. CreateTable: BuildingLocationContribution
CREATE TABLE IF NOT EXISTS "BuildingLocationContribution" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "contributionType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "source" TEXT NOT NULL DEFAULT 'BROKER_MAP_PIN',
  "distanceFromCurrent" DOUBLE PRECISION,
  "decisionNotes" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "pointsEligible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BuildingLocationContribution_pkey" PRIMARY KEY ("id")
);

-- 4. Chaves estrangeiras com cascata de integridade
ALTER TABLE "BuildingLocationContribution" DROP CONSTRAINT IF EXISTS "BuildingLocationContribution_buildingId_fkey";
ALTER TABLE "BuildingLocationContribution" ADD CONSTRAINT "BuildingLocationContribution_buildingId_fkey" 
  FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildingLocationContribution" DROP CONSTRAINT IF EXISTS "BuildingLocationContribution_brokerId_fkey";
ALTER TABLE "BuildingLocationContribution" ADD CONSTRAINT "BuildingLocationContribution_brokerId_fkey" 
  FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildingLocationContribution" DROP CONSTRAINT IF EXISTS "BuildingLocationContribution_decidedById_fkey";
ALTER TABLE "BuildingLocationContribution" ADD CONSTRAINT "BuildingLocationContribution_decidedById_fkey" 
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Índices para performance e consultas analíticas
CREATE INDEX IF NOT EXISTS "BuildingLocationContribution_buildingId_status_idx" 
  ON "BuildingLocationContribution"("buildingId", "status");

CREATE INDEX IF NOT EXISTS "BuildingLocationContribution_brokerId_createdAt_idx" 
  ON "BuildingLocationContribution"("brokerId", "createdAt");

CREATE INDEX IF NOT EXISTS "BuildingLocationContribution_status_idx" 
  ON "BuildingLocationContribution"("status");

