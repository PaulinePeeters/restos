/*
  Warnings:

  - You are about to drop the column `valide` on the `tabsencepersonnel` table. All the data in the column will be lost.
  - You are about to drop the `toffre_speciale` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tstock` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email_client]` on the table `tclient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email_personnel]` on the table `tpersonnel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatutAbsence" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutPointage" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MethodePaiement" ADD VALUE 'BANCONTACT';
ALTER TYPE "MethodePaiement" ADD VALUE 'PAYCONIQ';
ALTER TYPE "MethodePaiement" ADD VALUE 'PAYPAL';

-- AlterEnum
ALTER TYPE "StatutSession" ADD VALUE 'A_DEBARRASSER';

-- DropForeignKey
ALTER TABLE "tstock" DROP CONSTRAINT "tstock_ingredient_id_fkey";

-- AlterTable
ALTER TABLE "tabsencepersonnel" DROP COLUMN "valide",
ADD COLUMN     "justificatif_url" VARCHAR(255),
ADD COLUMN     "statut" "StatutAbsence" NOT NULL DEFAULT 'EN_ATTENTE',
ADD COLUMN     "transmis_sec_sociale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type_conge_id" INTEGER,
ALTER COLUMN "motif_absence" DROP NOT NULL;

-- AlterTable
CREATE SEQUENCE tcategorieplat_id_seq;
ALTER TABLE "tcategorieplat" ALTER COLUMN "id" SET DEFAULT nextval('tcategorieplat_id_seq');
ALTER SEQUENCE tcategorieplat_id_seq OWNED BY "tcategorieplat"."id";

-- AlterTable
ALTER TABLE "tcommande" ADD COLUMN     "adresse_livraison" VARCHAR(255),
ADD COLUMN     "date_heure_souhaitee" TIMESTAMP(6),
ADD COLUMN     "tel_livraison" VARCHAR(20),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tevenement" ADD COLUMN     "pourcentage_reduction" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "tingredient" ADD COLUMN     "seuil_alerte" DECIMAL(10,2) NOT NULL DEFAULT 10,
ADD COLUMN     "stock_actuel" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tlignecommande" ADD COLUMN     "prix_unitaire" DECIMAL(10,2),
ADD COLUMN     "restrictions_alimentaires" VARCHAR(255);

-- AlterTable
ALTER TABLE "tpersonnel" ADD COLUMN     "solde_conges" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
ADD COLUMN     "solde_recuperation" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "tplat" ADD COLUMN     "description_plat_en" TEXT,
ADD COLUMN     "description_plat_nl" TEXT,
ADD COLUMN     "nom_plat_en" VARCHAR(200),
ADD COLUMN     "nom_plat_nl" VARCHAR(200);

-- DropTable
DROP TABLE "toffre_speciale";

-- DropTable
DROP TABLE "tstock";

-- DropEnum
DROP TYPE "role";

-- CreateTable
CREATE TABLE "tpointage" (
    "id" SERIAL NOT NULL,
    "personnel_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "heure_debut" TIME(6) NOT NULL,
    "heure_fin" TIME(6),
    "pause_minutes" INTEGER NOT NULL DEFAULT 0,
    "heures_prestees" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "heures_supp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "statut" "StatutPointage" NOT NULL DEFAULT 'EN_ATTENTE',
    "commentaire" VARCHAR(255),

    CONSTRAINT "tpointage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ttypeconge" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(50) NOT NULL,
    "deduit_solde_conges" BOOLEAN NOT NULL DEFAULT false,
    "est_recuperation" BOOLEAN NOT NULL DEFAULT false,
    "requiert_justificatif" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ttypeconge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tclient_email_client_key" ON "tclient"("email_client");

-- CreateIndex
CREATE UNIQUE INDEX "tpersonnel_email_personnel_key" ON "tpersonnel"("email_personnel");

-- AddForeignKey
ALTER TABLE "tabsencepersonnel" ADD CONSTRAINT "tabsencepersonnel_type_conge_id_fkey" FOREIGN KEY ("type_conge_id") REFERENCES "ttypeconge"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tpointage" ADD CONSTRAINT "tpointage_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "tpersonnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
