-- AlterTable
ALTER TABLE "PhysicalProperty" ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "priceUpdatedById" TEXT,
ADD COLUMN     "sharedPrice" DECIMAL(15,2);

-- CreateTable
CREATE TABLE "PhysicalPropertyPriceHistory" (
    "id" TEXT NOT NULL,
    "physicalPropertyId" TEXT NOT NULL,
    "oldPrice" DECIMAL(15,2),
    "newPrice" DECIMAL(15,2) NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PRIMARY_BROKER',
    "revisionRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalPropertyPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRevisionRequest" (
    "id" TEXT NOT NULL,
    "physicalPropertyId" TEXT NOT NULL,
    "requestingBrokerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "currentPrice" DECIMAL(15,2) NOT NULL,
    "suggestedPrice" DECIMAL(15,2) NOT NULL,
    "justification" TEXT NOT NULL,
    "documentProofUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "disputeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRevisionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhysicalPropertyPriceHistory_physicalPropertyId_createdAt_idx" ON "PhysicalPropertyPriceHistory"("physicalPropertyId", "createdAt");

-- CreateIndex
CREATE INDEX "PhysicalPropertyPriceHistory_changedById_idx" ON "PhysicalPropertyPriceHistory"("changedById");

-- CreateIndex
CREATE INDEX "PriceRevisionRequest_physicalPropertyId_status_idx" ON "PriceRevisionRequest"("physicalPropertyId", "status");

-- CreateIndex
CREATE INDEX "PriceRevisionRequest_requestingBrokerId_status_idx" ON "PriceRevisionRequest"("requestingBrokerId", "status");

-- CreateIndex
CREATE INDEX "PriceRevisionRequest_decidedById_status_idx" ON "PriceRevisionRequest"("decidedById", "status");

-- CreateIndex
CREATE INDEX "PriceRevisionRequest_propertyId_idx" ON "PriceRevisionRequest"("propertyId");

-- CreateIndex
CREATE INDEX "PriceRevisionRequest_disputeId_idx" ON "PriceRevisionRequest"("disputeId");

-- CreateIndex
CREATE INDEX "PhysicalProperty_sharedPrice_idx" ON "PhysicalProperty"("sharedPrice");

-- AddForeignKey
ALTER TABLE "PhysicalProperty" ADD CONSTRAINT "PhysicalProperty_priceUpdatedById_fkey" FOREIGN KEY ("priceUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalPropertyPriceHistory" ADD CONSTRAINT "PhysicalPropertyPriceHistory_physicalPropertyId_fkey" FOREIGN KEY ("physicalPropertyId") REFERENCES "PhysicalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalPropertyPriceHistory" ADD CONSTRAINT "PhysicalPropertyPriceHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRevisionRequest" ADD CONSTRAINT "PriceRevisionRequest_physicalPropertyId_fkey" FOREIGN KEY ("physicalPropertyId") REFERENCES "PhysicalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRevisionRequest" ADD CONSTRAINT "PriceRevisionRequest_requestingBrokerId_fkey" FOREIGN KEY ("requestingBrokerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRevisionRequest" ADD CONSTRAINT "PriceRevisionRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRevisionRequest" ADD CONSTRAINT "PriceRevisionRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRevisionRequest" ADD CONSTRAINT "PriceRevisionRequest_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "PropertyDispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Check Constraints for positive prices (F2.B05.3B)
ALTER TABLE "PhysicalProperty" ADD CONSTRAINT "check_shared_price_positive" CHECK ("sharedPrice" IS NULL OR "sharedPrice" > 0);
ALTER TABLE "PhysicalPropertyPriceHistory" ADD CONSTRAINT "check_history_new_price_positive" CHECK ("newPrice" > 0);
ALTER TABLE "PriceRevisionRequest" ADD CONSTRAINT "check_revision_prices_positive" CHECK ("currentPrice" > 0 AND "suggestedPrice" > 0);

