-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BROKER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commercialName" TEXT,
    "phone" TEXT,
    "creci" TEXT,
    "tagline" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "avatarUrl" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responsibleBrokerId" TEXT,
    "title" TEXT NOT NULL,
    "internalCode" TEXT,
    "propertyType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Disponível',
    "price" DOUBLE PRECISION NOT NULL,
    "privateArea" DOUBLE PRECISION,
    "totalArea" DOUBLE PRECISION,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "suites" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "parkingSpaces" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "internalNotes" TEXT,
    "address" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipcode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "boundary" TEXT,
    "boundaryArea" DOUBLE PRECISION,
    "otherBedrooms" INTEGER,
    "otherBathrooms" INTEGER,
    "landArea" DOUBLE PRECISION,
    "acceptsExchange" BOOLEAN,
    "exchangeNotes" TEXT,
    "isRegistered" BOOLEAN,
    "hasPool" BOOLEAN,
    "hasGym" BOOLEAN,
    "furniture" TEXT,
    "hasBarbecue" BOOLEAN,
    "registryNumber" TEXT,
    "hasPartyHall" BOOLEAN,
    "hasElevator" BOOLEAN,
    "isPenthouse" BOOLEAN,
    "hasPetSpace" BOOLEAN,
    "floor" INTEGER,
    "isCorner" BOOLEAN,
    "inGatedCommunity" BOOLEAN,
    "inAllotment" BOOLEAN,
    "streetPaving" TEXT,
    "commercialType" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publicLocationPrecision" TEXT NOT NULL DEFAULT 'APPROXIMATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responsibleBrokerId" TEXT,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "propertyTypes" TEXT NOT NULL,
    "cities" TEXT NOT NULL,
    "neighborhoods" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "minBedrooms" INTEGER NOT NULL DEFAULT 0,
    "minSuites" INTEGER NOT NULL DEFAULT 0,
    "minParkingSpaces" INTEGER NOT NULL DEFAULT 0,
    "minArea" DOUBLE PRECISION,
    "referenceAddress" TEXT,
    "referenceLatitude" DOUBLE PRECISION,
    "referenceLongitude" DOUBLE PRECISION,
    "maxRadiusKm" DOUBLE PRECISION,
    "locationStrategy" TEXT DEFAULT 'NEIGHBORHOODS',
    "searchLatitude" DOUBLE PRECISION,
    "searchLongitude" DOUBLE PRECISION,
    "searchRadiusMeters" DOUBLE PRECISION,
    "maxTravelTimeMinutes" INTEGER,
    "travelMode" TEXT DEFAULT 'DRIVING',
    "minOtherBedrooms" INTEGER,
    "minOtherBathrooms" INTEGER,
    "minLandArea" DOUBLE PRECISION,
    "acceptsExchangePref" TEXT DEFAULT 'INDIFERENTE',
    "isRegisteredPref" TEXT DEFAULT 'INDIFERENTE',
    "poolPref" TEXT DEFAULT 'INDIFERENTE',
    "gymPref" TEXT DEFAULT 'INDIFERENTE',
    "barbecuePref" TEXT DEFAULT 'INDIFERENTE',
    "partyHallPref" TEXT DEFAULT 'INDIFERENTE',
    "elevatorPref" TEXT DEFAULT 'INDIFERENTE',
    "petSpacePref" TEXT DEFAULT 'INDIFERENTE',
    "penthousePref" TEXT DEFAULT 'INDIFERENTE',
    "cornerPref" TEXT DEFAULT 'INDIFERENTE',
    "gatedCommunityPref" TEXT DEFAULT 'INDIFERENTE',
    "allotmentPref" TEXT DEFAULT 'INDIFERENTE',
    "furniturePref" TEXT DEFAULT 'INDIFERENTE',
    "streetPavingPref" TEXT DEFAULT 'INDIFERENTE',
    "commercialTypePref" TEXT DEFAULT 'INDIFERENTE',
    "customPreferences" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "offerType" TEXT NOT NULL DEFAULT 'PROPERTY',
    "propertyId" TEXT,
    "typologyId" TEXT,
    "score" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Development" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responsibleBrokerId" TEXT,
    "name" TEXT NOT NULL,
    "developer" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "deliveryDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "description" TEXT,
    "internalNotes" TEXT,
    "address" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipcode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "hasPool" BOOLEAN,
    "hasGym" BOOLEAN,
    "hasPartyHall" BOOLEAN,
    "hasPetSpace" BOOLEAN,
    "hasElevator" BOOLEAN,
    "hasDirectInstallments" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Development_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentImage" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevelopmentImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Typology" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL DEFAULT 'Apartamento',
    "price" DOUBLE PRECISION NOT NULL,
    "privateArea" DOUBLE PRECISION,
    "totalArea" DOUBLE PRECISION,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "suites" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "parkingSpaces" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Disponível',
    "notes" TEXT,
    "otherBedrooms" INTEGER,
    "otherBathrooms" INTEGER,
    "acceptsExchange" BOOLEAN,
    "exchangeNotes" TEXT,
    "hasBarbecue" BOOLEAN,
    "hasElevator" BOOLEAN,
    "isPenthouse" BOOLEAN,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publicLocationPrecision" TEXT NOT NULL DEFAULT 'APPROXIMATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Typology_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerProfile_userId_key" ON "BrokerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_publicId_key" ON "Property"("publicId");

-- CreateIndex
CREATE INDEX "Match_searchId_idx" ON "Match"("searchId");

-- CreateIndex
CREATE INDEX "Match_propertyId_idx" ON "Match"("propertyId");

-- CreateIndex
CREATE INDEX "Match_typologyId_idx" ON "Match"("typologyId");

-- CreateIndex
CREATE UNIQUE INDEX "Typology_publicId_key" ON "Typology"("publicId");

-- AddForeignKey
ALTER TABLE "BrokerProfile" ADD CONSTRAINT "BrokerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_responsibleBrokerId_fkey" FOREIGN KEY ("responsibleBrokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_responsibleBrokerId_fkey" FOREIGN KEY ("responsibleBrokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_typologyId_fkey" FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_responsibleBrokerId_fkey" FOREIGN KEY ("responsibleBrokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentImage" ADD CONSTRAINT "DevelopmentImage_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Typology" ADD CONSTRAINT "Typology_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;

