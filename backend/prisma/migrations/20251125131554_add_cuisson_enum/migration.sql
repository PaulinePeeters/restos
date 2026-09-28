-- CreateEnum
CREATE TYPE "Cuisson" AS ENUM ('BLEU', 'SAIGNANT', 'A_POINT', 'BIEN_CUIT');

-- AlterTable
ALTER TABLE "tlignecommande" ADD COLUMN     "cuisson" "Cuisson";

-- AlterTable
ALTER TABLE "tplat" ADD COLUMN     "peut_choisir_cuisson" BOOLEAN NOT NULL DEFAULT false;
