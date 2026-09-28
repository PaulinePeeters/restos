-- AlterTable
ALTER TABLE "tingredient" ADD COLUMN     "cout_unitaire" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tlignecommande" ADD COLUMN     "date_envoi_cuisine" TIMESTAMP(6);
