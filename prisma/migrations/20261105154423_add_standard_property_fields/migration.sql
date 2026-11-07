-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "builtArea" DOUBLE PRECISION,
ADD COLUMN     "coveredParkingSpaces" INTEGER,
ADD COLUMN     "lavabos" INTEGER,
ADD COLUMN     "socialBathrooms" INTEGER,
ADD COLUMN     "uncoveredParkingSpaces" INTEGER;

-- AlterTable
ALTER TABLE "Search" ADD COLUMN     "minBuiltArea" DOUBLE PRECISION,
ADD COLUMN     "minCoveredParkingSpaces" INTEGER,
ADD COLUMN     "minLavabos" INTEGER,
ADD COLUMN     "minSocialBathrooms" INTEGER,
ADD COLUMN     "minUncoveredParkingSpaces" INTEGER;

-- AlterTable
ALTER TABLE "Typology" ADD COLUMN     "builtArea" DOUBLE PRECISION,
ADD COLUMN     "coveredParkingSpaces" INTEGER,
ADD COLUMN     "lavabos" INTEGER,
ADD COLUMN     "socialBathrooms" INTEGER,
ADD COLUMN     "uncoveredParkingSpaces" INTEGER;
