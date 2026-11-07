-- AlterTable: Adiciona coluna aditiva para transição segura de imóveis históricos
ALTER TABLE "Property" ADD COLUMN "legacyExemptFromAuthorization" BOOLEAN NOT NULL DEFAULT false;

-- Marca exclusivamente os imóveis históricos pré-existentes identificados no banco DEV
UPDATE "Property"
SET "legacyExemptFromAuthorization" = true
WHERE id IN ('cmw2k0wew0005ep3k7eop2mjc', 'cmw3s8rpg0005eprstfygvkob');
