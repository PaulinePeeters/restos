-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'barman';

-- AlterEnum
ALTER TYPE "StatutReservation" ADD VALUE 'NON_PRESENT';

-- AlterTable
ALTER TABLE "treservation" ADD COLUMN     "empreinte_bancaire" VARCHAR(100);
