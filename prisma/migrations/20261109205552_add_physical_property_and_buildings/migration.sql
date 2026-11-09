-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "buildingId" TEXT,
ADD COLUMN     "isPrimaryListing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "listingSlot" INTEGER,
ADD COLUMN     "physicalPropertyId" TEXT;

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "number" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Criciúma',
    "state" TEXT NOT NULL DEFAULT 'SC',
    "zipcode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "totalFloors" INTEGER,
    "unitsPerFloor" INTEGER,
    "towers" TEXT,
    "landRegistryNumber" TEXT,
    "landRegistryOffice" TEXT,
    "hasPool" BOOLEAN,
    "hasGym" BOOLEAN,
    "hasPartyHall" BOOLEAN,
    "hasElevator" BOOLEAN,
    "hasPetSpace" BOOLEAN,
    "hasBarbecue" BOOLEAN,
    "coverImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "verifiedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingUnit" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "normalizedUnit" TEXT NOT NULL,
    "tower" TEXT,
    "floor" INTEGER,
    "unitRegistryNumber" TEXT,
    "bedrooms" INTEGER,
    "suites" INTEGER,
    "bathrooms" INTEGER,
    "parkingSpaces" INTEGER,
    "privateArea" DOUBLE PRECISION,
    "totalArea" DOUBLE PRECISION,
    "physicalPropertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalProperty" (
    "id" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "buildingId" TEXT,
    "address" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Criciúma',
    "state" TEXT NOT NULL DEFAULT 'SC',
    "zipcode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "registryNumber" TEXT,
    "registryOffice" TEXT,
    "registryType" TEXT,
    "boundary" TEXT,
    "boundaryArea" DOUBLE PRECISION,
    "landArea" DOUBLE PRECISION,
    "builtArea" DOUBLE PRECISION,
    "privateArea" DOUBLE PRECISION,
    "totalArea" DOUBLE PRECISION,
    "activeListingsCount" INTEGER NOT NULL DEFAULT 0,
    "primaryListingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyWaitlist" (
    "id" TEXT NOT NULL,
    "physicalPropertyId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "draftPropertyId" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDispute" (
    "id" TEXT NOT NULL,
    "physicalPropertyId" TEXT NOT NULL,
    "claimantBrokerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "documentProofUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Building_city_neighborhood_idx" ON "Building"("city", "neighborhood");

-- CreateIndex
CREATE INDEX "Building_latitude_longitude_idx" ON "Building"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Building_normalizedName_idx" ON "Building"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingUnit_physicalPropertyId_key" ON "BuildingUnit"("physicalPropertyId");

-- CreateIndex
CREATE INDEX "BuildingUnit_buildingId_floor_idx" ON "BuildingUnit"("buildingId", "floor");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingUnit_buildingId_tower_normalizedUnit_key" ON "BuildingUnit"("buildingId", "tower", "normalizedUnit");

-- CreateIndex
CREATE INDEX "PhysicalProperty_city_neighborhood_idx" ON "PhysicalProperty"("city", "neighborhood");

-- CreateIndex
CREATE INDEX "PhysicalProperty_latitude_longitude_idx" ON "PhysicalProperty"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "PhysicalProperty_registryNumber_idx" ON "PhysicalProperty"("registryNumber");

-- CreateIndex
CREATE INDEX "PhysicalProperty_status_activeListingsCount_idx" ON "PhysicalProperty"("status", "activeListingsCount");

-- CreateIndex
CREATE INDEX "PropertyWaitlist_physicalPropertyId_status_position_idx" ON "PropertyWaitlist"("physicalPropertyId", "status", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyWaitlist_physicalPropertyId_brokerId_key" ON "PropertyWaitlist"("physicalPropertyId", "brokerId");

-- CreateIndex
CREATE INDEX "PropertyDispute_physicalPropertyId_status_idx" ON "PropertyDispute"("physicalPropertyId", "status");

-- CreateIndex
CREATE INDEX "PropertyDispute_claimantBrokerId_status_idx" ON "PropertyDispute"("claimantBrokerId", "status");

-- CreateIndex
CREATE INDEX "Property_physicalPropertyId_status_idx" ON "Property"("physicalPropertyId", "status");

-- CreateIndex
CREATE INDEX "Property_physicalPropertyId_userId_status_idx" ON "Property"("physicalPropertyId", "userId", "status");

-- CreateIndex
CREATE INDEX "Property_buildingId_status_idx" ON "Property"("buildingId", "status");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_physicalPropertyId_fkey" FOREIGN KEY ("physicalPropertyId") REFERENCES "PhysicalProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingUnit" ADD CONSTRAINT "BuildingUnit_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingUnit" ADD CONSTRAINT "BuildingUnit_physicalPropertyId_fkey" FOREIGN KEY ("physicalPropertyId") REFERENCES "PhysicalProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalProperty" ADD CONSTRAINT "PhysicalProperty_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyWaitlist" ADD CONSTRAINT "PropertyWaitlist_physicalPropertyId_fkey" FOREIGN KEY ("physicalPropertyId") REFERENCES "PhysicalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyWaitlist" ADD CONSTRAINT "PropertyWaitlist_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDispute" ADD CONSTRAINT "PropertyDispute_physicalPropertyId_fkey" FOREIGN KEY ("physicalPropertyId") REFERENCES "PhysicalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDispute" ADD CONSTRAINT "PropertyDispute_claimantBrokerId_fkey" FOREIGN KEY ("claimantBrokerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Regras adicionais PostgreSQL:
-- 1. Unicidade de anúncio ativo por corretor para a mesma unidade física (permite histórico de inativos/vendidos)
CREATE UNIQUE INDEX "Property_active_user_physical_idx" 
ON "Property"("physicalPropertyId", "userId") 
WHERE "status" = 'Disponível' AND "physicalPropertyId" IS NOT NULL;

-- 2. Limite estrito de no máximo 3 anúncios ativos por unidade física
ALTER TABLE "PhysicalProperty" 
ADD CONSTRAINT "check_max_active_listings" 
CHECK ("activeListingsCount" >= 0 AND "activeListingsCount" <= 3);
