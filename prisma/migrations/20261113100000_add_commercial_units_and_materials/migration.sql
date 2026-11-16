-- ==============================================================================
-- ÁREA NOBRE — MIGRAÇÃO VERSIONADA ADITIVA: UNIDADES COMERCIAIS, CONDIÇÕES E MATERIAIS (ETAPA 6B.1)
-- Identificador: 20261113100000_add_commercial_units_and_materials
-- Compatibilidade: PostgreSQL 15+ (Supabase DEV - jdoezhmtwicxcthhedtb)
-- Módulo: Bloco 6B (Gestão de Unidades Comerciais, Preços, Disponibilidade, Condições e Materiais)
-- Natureza: 100% Aditiva (Zero remoção ou transformação destrutiva de tabelas/colunas existentes)
-- ==============================================================================

-- 1. CreateTable: CommercialUnit (Unidade Comercial Oficial da Construtora)
CREATE TABLE IF NOT EXISTS "CommercialUnit" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "blockId" TEXT,
    "typologyId" TEXT,
    "blockKey" TEXT NOT NULL DEFAULT '',
    "unitCode" TEXT NOT NULL,
    "normalizedUnitCode" TEXT NOT NULL,
    "unitType" TEXT NOT NULL DEFAULT 'APARTAMENTO',
    "floor" INTEGER,
    "position" TEXT,
    "solarOrientation" TEXT,
    "lotNumber" TEXT,
    "quadraName" TEXT,
    "frontage" DOUBLE PRECISION,
    "backDimension" DOUBLE PRECISION,
    "leftDepth" DOUBLE PRECISION,
    "rightDepth" DOUBLE PRECISION,
    "topography" TEXT,
    "isCorner" BOOLEAN NOT NULL DEFAULT false,
    "houseFloors" INTEGER,
    "privateArea" DOUBLE PRECISION,
    "builtArea" DOUBLE PRECISION,
    "totalArea" DOUBLE PRECISION,
    "landArea" DOUBLE PRECISION,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "suites" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "lavabos" INTEGER NOT NULL DEFAULT 0,
    "parkingSpaces" INTEGER NOT NULL DEFAULT 0,
    "coveredParkingSpaces" INTEGER,
    "uncoveredParkingSpaces" INTEGER,
    "parkingBoxNumbers" TEXT,
    "storageNumber" TEXT,
    "hasBarbecue" BOOLEAN,
    "isPenthouse" BOOLEAN NOT NULL DEFAULT false,
    "commercialStatus" TEXT NOT NULL DEFAULT 'DISPONIVEL',
    "listPrice" DOUBLE PRECISION,
    "promotionalPrice" DOUBLE PRECISION,
    "acceptsFinancing" BOOLEAN NOT NULL DEFAULT true,
    "acceptsExchange" BOOLEAN NOT NULL DEFAULT false,
    "exchangeNotes" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "reservedByNote" TEXT,
    "soldAt" TIMESTAMP(3),
    "publicNotes" TEXT,
    "internalNotes" TEXT,
    "buildingUnitId" TEXT,
    "physicalPropertyId" TEXT,
    "landParcelId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialUnit_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable: CommercialUnitHistory (Histórico Auditável de Preço e Disponibilidade)
CREATE TABLE IF NOT EXISTS "CommercialUnitHistory" (
    "id" TEXT NOT NULL,
    "commercialUnitId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "previousListPrice" DOUBLE PRECISION,
    "newListPrice" DOUBLE PRECISION,
    "previousPromotionalPrice" DOUBLE PRECISION,
    "newPromotionalPrice" DOUBLE PRECISION,
    "changedById" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_ADMIN',
    "importBatchId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialUnitHistory_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable: CommercialPaymentCondition (Condições Comerciais de Pagamento)
CREATE TABLE IF NOT EXISTS "CommercialPaymentCondition" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "blockId" TEXT,
    "typologyId" TEXT,
    "commercialUnitId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "downPaymentPercent" DOUBLE PRECISION,
    "downPaymentAmount" DOUBLE PRECISION,
    "downPaymentInstallments" INTEGER NOT NULL DEFAULT 1,
    "monthlyCount" INTEGER,
    "monthlyPercentTotal" DOUBLE PRECISION,
    "monthlyInstallmentAmount" DOUBLE PRECISION,
    "reinforcementCount" INTEGER,
    "reinforcementFrequencyMonths" INTEGER,
    "reinforcementPercentTotal" DOUBLE PRECISION,
    "reinforcementInstallmentAmount" DOUBLE PRECISION,
    "keysPercent" DOUBLE PRECISION,
    "keysAmount" DOUBLE PRECISION,
    "financingPercent" DOUBLE PRECISION,
    "financingAmount" DOUBLE PRECISION,
    "directInstallmentsPostKeys" INTEGER,
    "correctionIndexPreKeys" TEXT,
    "correctionIndexPostKeys" TEXT,
    "acceptsExchange" BOOLEAN NOT NULL DEFAULT false,
    "maxExchangePercent" DOUBLE PRECISION,
    "exchangeNotes" TEXT,
    "validUntil" TIMESTAMP(3),
    "publicNotes" TEXT,
    "internalNotes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialPaymentCondition_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable: CommercialMaterial (Biblioteca de Materiais Comerciais)
CREATE TABLE IF NOT EXISTS "CommercialMaterial" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "developmentId" TEXT,
    "blockId" TEXT,
    "typologyId" TEXT,
    "commercialUnitId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OUTRO',
    "fileUrl" TEXT NOT NULL,
    "storagePath" TEXT,
    "fileType" TEXT,
    "fileExtension" TEXT,
    "fileSizeBytes" INTEGER,
    "versionLabel" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'BROKERS_ONLY',
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "allowBrokerShare" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialMaterial_pkey" PRIMARY KEY ("id")
);

-- 5. CreateTable: CommercialTableImportBatch (Lote de Importação Assistida de Tabela)
CREATE TABLE IF NOT EXISTS "CommercialTableImportBatch" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "sourceMaterialId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'XLSX',
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "rawExtractionJson" JSONB,
    "summaryStats" JSONB,
    "adminReviewNotes" TEXT,
    "createdById" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialTableImportBatch_pkey" PRIMARY KEY ("id")
);

-- 6. CreateTable: CommercialTableImportItem (Item de Staging da Importação de Tabela)
CREATE TABLE IF NOT EXISTS "CommercialTableImportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "matchedUnitId" TEXT,
    "actionType" TEXT NOT NULL DEFAULT 'CREATE',
    "extractedData" JSONB NOT NULL,
    "diffData" JSONB,
    "validationWarnings" JSONB,
    "isSelectedToApply" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialTableImportItem_pkey" PRIMARY KEY ("id")
);

-- 7. Índices e Restrições de Unicidade: CommercialUnit
CREATE UNIQUE INDEX IF NOT EXISTS "CommercialUnit_developmentId_blockKey_normalizedUnitCode_key"
    ON "CommercialUnit"("developmentId", "blockKey", "normalizedUnitCode");
CREATE INDEX IF NOT EXISTS "CommercialUnit_developmentId_commercialStatus_idx"
    ON "CommercialUnit"("developmentId", "commercialStatus");
CREATE INDEX IF NOT EXISTS "CommercialUnit_developmentId_blockId_idx"
    ON "CommercialUnit"("developmentId", "blockId");
CREATE INDEX IF NOT EXISTS "CommercialUnit_developmentId_typologyId_idx"
    ON "CommercialUnit"("developmentId", "typologyId");
CREATE INDEX IF NOT EXISTS "CommercialUnit_buildingUnitId_idx"
    ON "CommercialUnit"("buildingUnitId");
CREATE INDEX IF NOT EXISTS "CommercialUnit_physicalPropertyId_idx"
    ON "CommercialUnit"("physicalPropertyId");
CREATE INDEX IF NOT EXISTS "CommercialUnit_landParcelId_idx"
    ON "CommercialUnit"("landParcelId");
CREATE INDEX IF NOT EXISTS "CommercialUnit_listPrice_idx"
    ON "CommercialUnit"("listPrice");

-- 8. Índices: CommercialUnitHistory
CREATE INDEX IF NOT EXISTS "CommercialUnitHistory_commercialUnitId_createdAt_idx"
    ON "CommercialUnitHistory"("commercialUnitId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommercialUnitHistory_developmentId_createdAt_idx"
    ON "CommercialUnitHistory"("developmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommercialUnitHistory_changedById_idx"
    ON "CommercialUnitHistory"("changedById");
CREATE INDEX IF NOT EXISTS "CommercialUnitHistory_importBatchId_idx"
    ON "CommercialUnitHistory"("importBatchId");

-- 9. Índices: CommercialPaymentCondition
CREATE INDEX IF NOT EXISTS "CommercialPaymentCondition_developmentId_isActive_idx"
    ON "CommercialPaymentCondition"("developmentId", "isActive");
CREATE INDEX IF NOT EXISTS "CommercialPaymentCondition_blockId_idx"
    ON "CommercialPaymentCondition"("blockId");
CREATE INDEX IF NOT EXISTS "CommercialPaymentCondition_typologyId_idx"
    ON "CommercialPaymentCondition"("typologyId");
CREATE INDEX IF NOT EXISTS "CommercialPaymentCondition_commercialUnitId_idx"
    ON "CommercialPaymentCondition"("commercialUnitId");

-- 10. Índices: CommercialMaterial
CREATE INDEX IF NOT EXISTS "CommercialMaterial_developmentId_category_isActive_idx"
    ON "CommercialMaterial"("developmentId", "category", "isActive");
CREATE INDEX IF NOT EXISTS "CommercialMaterial_companyId_isActive_idx"
    ON "CommercialMaterial"("companyId", "isActive");
CREATE INDEX IF NOT EXISTS "CommercialMaterial_typologyId_idx"
    ON "CommercialMaterial"("typologyId");
CREATE INDEX IF NOT EXISTS "CommercialMaterial_commercialUnitId_idx"
    ON "CommercialMaterial"("commercialUnitId");
CREATE INDEX IF NOT EXISTS "CommercialMaterial_visibility_idx"
    ON "CommercialMaterial"("visibility");

-- 11. Índices: CommercialTableImportBatch e CommercialTableImportItem
CREATE INDEX IF NOT EXISTS "CommercialTableImportBatch_developmentId_status_idx"
    ON "CommercialTableImportBatch"("developmentId", "status");
CREATE INDEX IF NOT EXISTS "CommercialTableImportBatch_createdById_idx"
    ON "CommercialTableImportBatch"("createdById");
CREATE INDEX IF NOT EXISTS "CommercialTableImportItem_batchId_rowIndex_idx"
    ON "CommercialTableImportItem"("batchId", "rowIndex");
CREATE INDEX IF NOT EXISTS "CommercialTableImportItem_matchedUnitId_idx"
    ON "CommercialTableImportItem"("matchedUnitId");

-- 12. Foreign Keys com Verificação de Duplicidade (Idempotentes)
DO $$ BEGIN
    -- CommercialUnit FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_developmentId_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_developmentId_fkey"
            FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_blockId_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_blockId_fkey"
            FOREIGN KEY ("blockId") REFERENCES "DevelopmentBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_typologyId_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_typologyId_fkey"
            FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_buildingUnitId_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_buildingUnitId_fkey"
            FOREIGN KEY ("buildingUnitId") REFERENCES "BuildingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_physicalPropertyId_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_physicalPropertyId_fkey"
            FOREIGN KEY ("physicalPropertyId") REFERENCES "PhysicalProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_landParcelId_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_landParcelId_fkey"
            FOREIGN KEY ("landParcelId") REFERENCES "LandParcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_createdById_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnit_updatedById_fkey') THEN
        ALTER TABLE "CommercialUnit" ADD CONSTRAINT "CommercialUnit_updatedById_fkey"
            FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- CommercialUnitHistory FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnitHistory_commercialUnitId_fkey') THEN
        ALTER TABLE "CommercialUnitHistory" ADD CONSTRAINT "CommercialUnitHistory_commercialUnitId_fkey"
            FOREIGN KEY ("commercialUnitId") REFERENCES "CommercialUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnitHistory_developmentId_fkey') THEN
        ALTER TABLE "CommercialUnitHistory" ADD CONSTRAINT "CommercialUnitHistory_developmentId_fkey"
            FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnitHistory_changedById_fkey') THEN
        ALTER TABLE "CommercialUnitHistory" ADD CONSTRAINT "CommercialUnitHistory_changedById_fkey"
            FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialUnitHistory_importBatchId_fkey') THEN
        ALTER TABLE "CommercialUnitHistory" ADD CONSTRAINT "CommercialUnitHistory_importBatchId_fkey"
            FOREIGN KEY ("importBatchId") REFERENCES "CommercialTableImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- CommercialPaymentCondition FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialPaymentCondition_developmentId_fkey') THEN
        ALTER TABLE "CommercialPaymentCondition" ADD CONSTRAINT "CommercialPaymentCondition_developmentId_fkey"
            FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialPaymentCondition_blockId_fkey') THEN
        ALTER TABLE "CommercialPaymentCondition" ADD CONSTRAINT "CommercialPaymentCondition_blockId_fkey"
            FOREIGN KEY ("blockId") REFERENCES "DevelopmentBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialPaymentCondition_typologyId_fkey') THEN
        ALTER TABLE "CommercialPaymentCondition" ADD CONSTRAINT "CommercialPaymentCondition_typologyId_fkey"
            FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialPaymentCondition_commercialUnitId_fkey') THEN
        ALTER TABLE "CommercialPaymentCondition" ADD CONSTRAINT "CommercialPaymentCondition_commercialUnitId_fkey"
            FOREIGN KEY ("commercialUnitId") REFERENCES "CommercialUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialPaymentCondition_createdById_fkey') THEN
        ALTER TABLE "CommercialPaymentCondition" ADD CONSTRAINT "CommercialPaymentCondition_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- CommercialMaterial FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialMaterial_companyId_fkey') THEN
        ALTER TABLE "CommercialMaterial" ADD CONSTRAINT "CommercialMaterial_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialMaterial_developmentId_fkey') THEN
        ALTER TABLE "CommercialMaterial" ADD CONSTRAINT "CommercialMaterial_developmentId_fkey"
            FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialMaterial_blockId_fkey') THEN
        ALTER TABLE "CommercialMaterial" ADD CONSTRAINT "CommercialMaterial_blockId_fkey"
            FOREIGN KEY ("blockId") REFERENCES "DevelopmentBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialMaterial_typologyId_fkey') THEN
        ALTER TABLE "CommercialMaterial" ADD CONSTRAINT "CommercialMaterial_typologyId_fkey"
            FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialMaterial_commercialUnitId_fkey') THEN
        ALTER TABLE "CommercialMaterial" ADD CONSTRAINT "CommercialMaterial_commercialUnitId_fkey"
            FOREIGN KEY ("commercialUnitId") REFERENCES "CommercialUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialMaterial_uploadedById_fkey') THEN
        ALTER TABLE "CommercialMaterial" ADD CONSTRAINT "CommercialMaterial_uploadedById_fkey"
            FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- CommercialTableImportBatch & CommercialTableImportItem FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialTableImportBatch_developmentId_fkey') THEN
        ALTER TABLE "CommercialTableImportBatch" ADD CONSTRAINT "CommercialTableImportBatch_developmentId_fkey"
            FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialTableImportBatch_sourceMaterialId_fkey') THEN
        ALTER TABLE "CommercialTableImportBatch" ADD CONSTRAINT "CommercialTableImportBatch_sourceMaterialId_fkey"
            FOREIGN KEY ("sourceMaterialId") REFERENCES "CommercialMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialTableImportBatch_createdById_fkey') THEN
        ALTER TABLE "CommercialTableImportBatch" ADD CONSTRAINT "CommercialTableImportBatch_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialTableImportItem_batchId_fkey') THEN
        ALTER TABLE "CommercialTableImportItem" ADD CONSTRAINT "CommercialTableImportItem_batchId_fkey"
            FOREIGN KEY ("batchId") REFERENCES "CommercialTableImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommercialTableImportItem_matchedUnitId_fkey') THEN
        ALTER TABLE "CommercialTableImportItem" ADD CONSTRAINT "CommercialTableImportItem_matchedUnitId_fkey"
            FOREIGN KEY ("matchedUnitId") REFERENCES "CommercialUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

