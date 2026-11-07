-- CreateTable
CREATE TABLE "PropertyShare" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "clientId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyShare_publicId_key" ON "PropertyShare"("publicId");

-- CreateIndex
CREATE INDEX "PropertyShare_propertyId_idx" ON "PropertyShare"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyShare_brokerId_idx" ON "PropertyShare"("brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyShare_propertyId_brokerId_key" ON "PropertyShare"("propertyId", "brokerId");

-- AddForeignKey
ALTER TABLE "PropertyShare" ADD CONSTRAINT "PropertyShare_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyShare" ADD CONSTRAINT "PropertyShare_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyShare" ADD CONSTRAINT "PropertyShare_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
