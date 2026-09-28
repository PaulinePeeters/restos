-- AlterTable
ALTER TABLE "ttableresto" ADD COLUMN     "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "salle" VARCHAR(50) NOT NULL DEFAULT 'Principale',
ADD COLUMN     "type_element" VARCHAR(20) NOT NULL DEFAULT 'table';
