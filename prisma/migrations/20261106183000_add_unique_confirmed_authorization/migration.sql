-- CreateIndex
-- Garante exclusivamente uma única autorização ativa (CONFIRMED) por par (propertyId, brokerId)
-- Preserva múltiplos registros históricos com status 'REVOKED'
CREATE UNIQUE INDEX "PropertyAuthorization_propertyId_brokerId_confirmed_key"
ON "PropertyAuthorization"("propertyId", "brokerId")
WHERE "status" = 'CONFIRMED';
