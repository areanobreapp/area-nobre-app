-- ==============================================================================
-- ÁREA NOBRE — MIGRAÇÃO VERSIONADA: CONSTRUTORAS, EMPREENDIMENTOS E CONTATOS (ETAPA 6A.1)
-- Identificador: 20261112120000_add_companies_and_development_base
-- Compatibilidade: PostgreSQL 15+ (Supabase DEV)
-- Módulo: Bloco 6 (Módulo Administrativo de Construtoras e Empreendimentos)
-- ==============================================================================

-- 1. CreateTable: Company (Construtoras e Incorporadoras)
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpj" TEXT,
    "stateRegistration" TEXT,
    "address" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Criciúma',
    "state" TEXT NOT NULL DEFAULT 'SC',
    "zipcode" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable: CompanyContact (Gerentes e Contatos com Visibilidade Granular)
CREATE TABLE IF NOT EXISTS "CompanyContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "internalNotes" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'BROKERS_ONLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyContact_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable: DevelopmentContact (Associação N:M entre Empreendimentos e Contatos)
CREATE TABLE IF NOT EXISTS "DevelopmentContact" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "customRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevelopmentContact_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable: DevelopmentBlock (Torres, Blocos e Quadras)
CREATE TABLE IF NOT EXISTS "DevelopmentBlock" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blockType" TEXT NOT NULL DEFAULT 'TOWER',
    "totalFloors" INTEGER,
    "unitsPerFloor" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevelopmentBlock_pkey" PRIMARY KEY ("id")
);

-- 5. AlterTable: Development (Evolução com Vínculo à Construtora e Prédio Físico)
ALTER TABLE "Development" 
    ADD COLUMN IF NOT EXISTS "companyId" TEXT,
    ADD COLUMN IF NOT EXISTS "buildingId" TEXT,
    ADD COLUMN IF NOT EXISTS "projectType" TEXT DEFAULT 'VERTICAL',
    ADD COLUMN IF NOT EXISTS "totalTowers" INTEGER,
    ADD COLUMN IF NOT EXISTS "totalUnits" INTEGER,
    ADD COLUMN IF NOT EXISTS "deliveryYear" INTEGER,
    ADD COLUMN IF NOT EXISTS "deliveryMonth" INTEGER,
    ADD COLUMN IF NOT EXISTS "indexCorrection" TEXT;

-- 6. Índices para Company
CREATE UNIQUE INDEX IF NOT EXISTS "Company_cnpj_key" ON "Company"("cnpj");
CREATE INDEX IF NOT EXISTS "Company_status_idx" ON "Company"("status");
CREATE INDEX IF NOT EXISTS "Company_city_state_idx" ON "Company"("city", "state");
CREATE INDEX IF NOT EXISTS "Company_tradeName_idx" ON "Company"("tradeName");
CREATE INDEX IF NOT EXISTS "Company_displayOrder_idx" ON "Company"("displayOrder");

-- 7. Índices para CompanyContact
CREATE INDEX IF NOT EXISTS "CompanyContact_companyId_status_idx" ON "CompanyContact"("companyId", "status");
CREATE INDEX IF NOT EXISTS "CompanyContact_visibility_idx" ON "CompanyContact"("visibility");
CREATE INDEX IF NOT EXISTS "CompanyContact_displayOrder_idx" ON "CompanyContact"("displayOrder");

-- 8. Índices para DevelopmentContact
CREATE INDEX IF NOT EXISTS "DevelopmentContact_developmentId_idx" ON "DevelopmentContact"("developmentId");
CREATE INDEX IF NOT EXISTS "DevelopmentContact_contactId_idx" ON "DevelopmentContact"("contactId");
CREATE UNIQUE INDEX IF NOT EXISTS "DevelopmentContact_developmentId_contactId_key" ON "DevelopmentContact"("developmentId", "contactId");

-- 9. Índices para DevelopmentBlock
CREATE INDEX IF NOT EXISTS "DevelopmentBlock_developmentId_idx" ON "DevelopmentBlock"("developmentId");
CREATE INDEX IF NOT EXISTS "DevelopmentBlock_displayOrder_idx" ON "DevelopmentBlock"("displayOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "DevelopmentBlock_developmentId_name_key" ON "DevelopmentBlock"("developmentId", "name");

-- 10. Índices para Development
CREATE INDEX IF NOT EXISTS "Development_companyId_idx" ON "Development"("companyId");
CREATE INDEX IF NOT EXISTS "Development_buildingId_idx" ON "Development"("buildingId");
CREATE INDEX IF NOT EXISTS "Development_status_idx" ON "Development"("status");
CREATE INDEX IF NOT EXISTS "Development_stage_idx" ON "Development"("stage");
CREATE INDEX IF NOT EXISTS "Development_projectType_idx" ON "Development"("projectType");

-- 11. Foreign Keys com verificação de duplicidade
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Company_createdById_fkey') THEN
        ALTER TABLE "Company" ADD CONSTRAINT "Company_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanyContact_companyId_fkey') THEN
        ALTER TABLE "CompanyContact" ADD CONSTRAINT "CompanyContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Development_companyId_fkey') THEN
        ALTER TABLE "Development" ADD CONSTRAINT "Development_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Development_buildingId_fkey') THEN
        ALTER TABLE "Development" ADD CONSTRAINT "Development_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DevelopmentContact_developmentId_fkey') THEN
        ALTER TABLE "DevelopmentContact" ADD CONSTRAINT "DevelopmentContact_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DevelopmentContact_contactId_fkey') THEN
        ALTER TABLE "DevelopmentContact" ADD CONSTRAINT "DevelopmentContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CompanyContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DevelopmentBlock_developmentId_fkey') THEN
        ALTER TABLE "DevelopmentBlock" ADD CONSTRAINT "DevelopmentBlock_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

