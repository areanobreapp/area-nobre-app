-- ==============================================================================
-- ÁREA NOBRE — MIGRAÇÃO VERSIONADA: CADASTRO MESTRE, TERRENO COLETIVO E LOTES (ETAPA J.2.C.2)
-- Identificador: 20261111200000_add_building_boundary_and_facade
-- Compatibilidade: PostgreSQL 15+ (Supabase)
-- Suporte: Lotes Cadastrais Independentes (LandParcel), Vínculo N:M e Detecção por Pin
-- ==============================================================================

-- 1. CreateTable: LandParcel (Base Territorial Independente de Lotes Cadastrais)
CREATE TABLE IF NOT EXISTS "LandParcel" (
  "id" TEXT NOT NULL,
  "code" TEXT,                        -- Inscrição imobiliária / Código cadastral municipal
  "externalId" TEXT,                  -- ID na base de geoprocessamento da prefeitura (SIG / GeoCriciúma)
  "source" TEXT NOT NULL DEFAULT 'BROKER_DRAWN', -- MUNICIPAL_CADASTRE | BROKER_DRAWN | ADMIN_VALIDATED | GEO_IMPORT
  "originType" TEXT NOT NULL DEFAULT 'MANUAL_DRAW', -- MANUAL_DRAW | CADASTRE_IMPORT | SATELLITE_SURVEY | TOPOGRAPHIC

  -- Geometria Interoperável GeoJSON e Área
  "boundary" TEXT NOT NULL,           -- GeoJSON Polygon / MultiPolygon
  "boundaryArea" DOUBLE PRECISION NOT NULL, -- Área calculada em m²

  -- Coordenadas do Centróide e Caixa Delimitadora (Bounding Box) para Busca Espacial por Pin
  "centroidLat" DOUBLE PRECISION,
  "centroidLng" DOUBLE PRECISION,
  "bboxMinLat" DOUBLE PRECISION,
  "bboxMaxLat" DOUBLE PRECISION,
  "bboxMinLng" DOUBLE PRECISION,
  "bboxMaxLng" DOUBLE PRECISION,

  -- Endereço e Localização
  "address" TEXT,
  "number" TEXT,
  "neighborhood" TEXT,
  "city" TEXT NOT NULL DEFAULT 'Criciúma',
  "state" TEXT NOT NULL DEFAULT 'SC',
  "zipcode" TEXT,

  -- Governança, Confiança e Auditoria
  "validationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED', -- UNVERIFIED | SINGLE_BROKER_CONFIRMED | MULTI_BROKER_CONFIRMED | ADMIN_VALIDATED | OFFICIAL_CADASTRE | DIVERGENT
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "contributorsCount" INTEGER NOT NULL DEFAULT 0,
  "lastConfirmedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LandParcel_pkey" PRIMARY KEY ("id")
);

-- Índices espaciais e cadastrais para LandParcel
CREATE INDEX IF NOT EXISTS "LandParcel_city_neighborhood_idx" ON "LandParcel"("city", "neighborhood");
CREATE INDEX IF NOT EXISTS "LandParcel_code_idx" ON "LandParcel"("code");
CREATE INDEX IF NOT EXISTS "LandParcel_source_externalId_idx" ON "LandParcel"("source", "externalId");
CREATE INDEX IF NOT EXISTS "LandParcel_validationStatus_idx" ON "LandParcel"("validationStatus");
CREATE INDEX IF NOT EXISTS "LandParcel_bbox_idx" ON "LandParcel"("bboxMinLat", "bboxMaxLat", "bboxMinLng", "bboxMaxLng");

-- Chave estrangeira de autoria em LandParcel
ALTER TABLE "LandParcel" DROP CONSTRAINT IF EXISTS "LandParcel_createdById_fkey";
ALTER TABLE "LandParcel" ADD CONSTRAINT "LandParcel_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- 2. AlterTable: Adicionar delimitação de terreno coletivo, lote principal e auditoria de fachada no Building
ALTER TABLE "Building"
  ADD COLUMN IF NOT EXISTS "boundary" TEXT,
  ADD COLUMN IF NOT EXISTS "boundaryArea" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "boundaryValidationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "boundaryConfidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "boundaryContributorsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "boundaryLastConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "boundaryCreatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "boundarySource" TEXT NOT NULL DEFAULT 'BROKER_DRAWN',
  ADD COLUMN IF NOT EXISTS "landParcelId" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImageValidationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "coverImageUploadedById" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImageSource" TEXT NOT NULL DEFAULT 'BROKER_UPLOAD',
  ADD COLUMN IF NOT EXISTS "coverImageUpdatedAt" TIMESTAMP(3);

-- Integridade referencial em Building
ALTER TABLE "Building" DROP CONSTRAINT IF EXISTS "Building_landParcelId_fkey";
ALTER TABLE "Building" ADD CONSTRAINT "Building_landParcelId_fkey"
  FOREIGN KEY ("landParcelId") REFERENCES "LandParcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Building" DROP CONSTRAINT IF EXISTS "Building_boundaryCreatedById_fkey";
ALTER TABLE "Building" ADD CONSTRAINT "Building_boundaryCreatedById_fkey"
  FOREIGN KEY ("boundaryCreatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Building" DROP CONSTRAINT IF EXISTS "Building_coverImageUploadedById_fkey";
ALTER TABLE "Building" ADD CONSTRAINT "Building_coverImageUploadedById_fkey"
  FOREIGN KEY ("coverImageUploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Building_landParcelId_idx" ON "Building"("landParcelId");


-- 3. CreateTable: BuildingLandParcel (Associação N:M entre Edifícios e Lotes)
-- Permite que 1 edifício ocupe múltiplos lotes ou que 1 lote comporte múltiplos edifícios sem duplicação
CREATE TABLE IF NOT EXISTS "BuildingLandParcel" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "landParcelId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BuildingLandParcel_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BuildingLandParcel" DROP CONSTRAINT IF EXISTS "BuildingLandParcel_buildingId_fkey";
ALTER TABLE "BuildingLandParcel" ADD CONSTRAINT "BuildingLandParcel_buildingId_fkey"
  FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildingLandParcel" DROP CONSTRAINT IF EXISTS "BuildingLandParcel_landParcelId_fkey";
ALTER TABLE "BuildingLandParcel" ADD CONSTRAINT "BuildingLandParcel_landParcelId_fkey"
  FOREIGN KEY ("landParcelId") REFERENCES "LandParcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "BuildingLandParcel_buildingId_landParcelId_key" ON "BuildingLandParcel"("buildingId", "landParcelId");
CREATE INDEX IF NOT EXISTS "BuildingLandParcel_buildingId_idx" ON "BuildingLandParcel"("buildingId");
CREATE INDEX IF NOT EXISTS "BuildingLandParcel_landParcelId_idx" ON "BuildingLandParcel"("landParcelId");


-- 4. CreateTable: BuildingBoundaryContribution (Histórico e Propostas de Delimitação de Terreno)
CREATE TABLE IF NOT EXISTS "BuildingBoundaryContribution" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "landParcelId" TEXT,
  "boundary" TEXT NOT NULL,
  "boundaryArea" DOUBLE PRECISION,
  "contributionType" TEXT NOT NULL, -- INITIAL_DELIMITATION | CONFIRMED_EXISTING | PROPOSED_REVISION
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | SUPERSEDED | REJECTED | FLAGGED_DIVERGENT
  "source" TEXT NOT NULL DEFAULT 'BROKER_DRAWN',
  "justification" TEXT,
  "decisionNotes" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BuildingBoundaryContribution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BuildingBoundaryContribution" DROP CONSTRAINT IF EXISTS "BuildingBoundaryContribution_buildingId_fkey";
ALTER TABLE "BuildingBoundaryContribution" ADD CONSTRAINT "BuildingBoundaryContribution_buildingId_fkey"
  FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildingBoundaryContribution" DROP CONSTRAINT IF EXISTS "BuildingBoundaryContribution_brokerId_fkey";
ALTER TABLE "BuildingBoundaryContribution" ADD CONSTRAINT "BuildingBoundaryContribution_brokerId_fkey"
  FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildingBoundaryContribution" DROP CONSTRAINT IF EXISTS "BuildingBoundaryContribution_landParcelId_fkey";
ALTER TABLE "BuildingBoundaryContribution" ADD CONSTRAINT "BuildingBoundaryContribution_landParcelId_fkey"
  FOREIGN KEY ("landParcelId") REFERENCES "LandParcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BuildingBoundaryContribution" DROP CONSTRAINT IF EXISTS "BuildingBoundaryContribution_decidedById_fkey";
ALTER TABLE "BuildingBoundaryContribution" ADD CONSTRAINT "BuildingBoundaryContribution_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "BuildingBoundaryContribution_buildingId_status_idx" ON "BuildingBoundaryContribution"("buildingId", "status");
CREATE INDEX IF NOT EXISTS "BuildingBoundaryContribution_brokerId_createdAt_idx" ON "BuildingBoundaryContribution"("brokerId", "createdAt");
CREATE INDEX IF NOT EXISTS "BuildingBoundaryContribution_landParcelId_idx" ON "BuildingBoundaryContribution"("landParcelId");
CREATE INDEX IF NOT EXISTS "BuildingBoundaryContribution_status_idx" ON "BuildingBoundaryContribution"("status");


-- 5. CreateTable: BuildingImageContribution (Histórico e Propostas de Fachada do Edifício)
CREATE TABLE IF NOT EXISTS "BuildingImageContribution" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "contributionType" TEXT NOT NULL, -- INITIAL_COVER | PROPOSED_SUBSTITUTION
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | SUPERSEDED | REJECTED
  "source" TEXT NOT NULL DEFAULT 'BROKER_UPLOAD',
  "justification" TEXT,
  "decisionNotes" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BuildingImageContribution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BuildingImageContribution" DROP CONSTRAINT IF EXISTS "BuildingImageContribution_buildingId_fkey";
ALTER TABLE "BuildingImageContribution" ADD CONSTRAINT "BuildingImageContribution_buildingId_fkey"
  FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildingImageContribution" DROP CONSTRAINT IF EXISTS "BuildingImageContribution_brokerId_fkey";
ALTER TABLE "BuildingImageContribution" ADD CONSTRAINT "BuildingImageContribution_brokerId_fkey"
  FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildingImageContribution" DROP CONSTRAINT IF EXISTS "BuildingImageContribution_decidedById_fkey";
ALTER TABLE "BuildingImageContribution" ADD CONSTRAINT "BuildingImageContribution_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "BuildingImageContribution_buildingId_status_idx" ON "BuildingImageContribution"("buildingId", "status");
