-- CreateEnum
CREATE TYPE "TypeRecompense" AS ENUM ('REDUCTION_MONTANT', 'POURCENTAGE', 'PRODUIT_OFFERT');

-- AlterTable
ALTER TABLE "tclient" ADD COLUMN     "points_fidelite" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "tclient_preference_table" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "table_id" INTEGER NOT NULL,
    "nombre_reservations" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tclient_preference_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trecompense" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "cout_points" INTEGER NOT NULL,
    "type" "TypeRecompense" NOT NULL,
    "valeur" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "trecompense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tclient_recompense" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "recompense_id" INTEGER NOT NULL,
    "date_obtention" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_utilisation" TIMESTAMP(3),

    CONSTRAINT "tclient_recompense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toffre_speciale" (
    "id" SERIAL NOT NULL,
    "nom_event" VARCHAR(100) NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "pourcentage_reduction" DECIMAL(5,2) NOT NULL,
    "description" TEXT,

    CONSTRAINT "toffre_speciale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tclient_preference_table_client_id_table_id_key" ON "tclient_preference_table"("client_id", "table_id");

-- AddForeignKey
ALTER TABLE "tclient_preference_table" ADD CONSTRAINT "tclient_preference_table_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tclient"("id_client") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tclient_preference_table" ADD CONSTRAINT "tclient_preference_table_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "ttableresto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tclient_recompense" ADD CONSTRAINT "tclient_recompense_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tclient"("id_client") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tclient_recompense" ADD CONSTRAINT "tclient_recompense_recompense_id_fkey" FOREIGN KEY ("recompense_id") REFERENCES "trecompense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
