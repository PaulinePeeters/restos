-- CreateEnum
CREATE TYPE "TypeReduction" AS ENUM ('PERSONNEL', 'VIP', 'OFFERT', 'AUCUN');

-- AlterTable
ALTER TABLE "tcommande" ADD COLUMN     "email_recu" VARCHAR(100),
ADD COLUMN     "justification_annulation" VARCHAR(255),
ADD COLUMN     "type_reduction" "TypeReduction";

-- AlterTable
ALTER TABLE "tlignecommande" ADD COLUMN     "justification_annulation" VARCHAR(255),
ADD COLUMN     "type_reduction" "TypeReduction";
