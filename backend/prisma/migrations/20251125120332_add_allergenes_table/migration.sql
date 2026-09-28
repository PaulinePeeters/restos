/*
  Warnings:

  - You are about to drop the column `pays_adresse` on the `tadresselivraison` table. All the data in the column will be lost.
  - The `statut_service` column on the `tlignecommande` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `methode_paiement` column on the `tpaiement` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `allergene` on the `tplat_allergene` table. All the data in the column will be lost.
  - Made the column `motif_absence` on table `tabsencepersonnel` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `mdp_client` to the `tclient` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type_commande` on the `tcommande` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `statut_commande` on the `tcommande` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `etat_paiement` on the `tpaiement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role_personnel` on the `tpersonnel` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `allergene_id` to the `tplat_allergene` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `statut_reservation` on the `treservation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `statut_session` on the `tsessiontable` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EtatPaiement" AS ENUM ('EN_ATTENTE', 'PAYE', 'ECHEC', 'ANNULE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('EN_LIGNE', 'SUR_PLACE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('manager', 'serveur', 'cuisinier', 'livreur');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE', 'EN_PREPARATION', 'SERVIE', 'LIVREE', 'ANNULEE', 'TERMINEE');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'ANNULEE', 'TERMINEE');

-- CreateEnum
CREATE TYPE "StatutService" AS ENUM ('EN_ATTENTE', 'EN_CUISINE', 'PRET', 'SERVI');

-- CreateEnum
CREATE TYPE "StatutSession" AS ENUM ('ACTIVE', 'TERMINEE', 'EN_ATTENTE_PAIEMENT');

-- CreateEnum
CREATE TYPE "TypeCommande" AS ENUM ('SUR PLACE', 'A_EMPORTER', 'LIVRAISON');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('manager', 'serveur', 'cuisinier', 'livreur');

-- AlterTable
CREATE SEQUENCE tabsencepersonnel_id_seq;
ALTER TABLE "tabsencepersonnel" ALTER COLUMN "id" SET DEFAULT nextval('tabsencepersonnel_id_seq'),
ALTER COLUMN "motif_absence" SET NOT NULL,
ALTER COLUMN "valide" DROP DEFAULT;
ALTER SEQUENCE tabsencepersonnel_id_seq OWNED BY "tabsencepersonnel"."id";

-- AlterTable
CREATE SEQUENCE tadresselivraison_id_seq;
ALTER TABLE "tadresselivraison" DROP COLUMN "pays_adresse",
ALTER COLUMN "id" SET DEFAULT nextval('tadresselivraison_id_seq');
ALTER SEQUENCE tadresselivraison_id_seq OWNED BY "tadresselivraison"."id";

-- AlterTable
CREATE SEQUENCE tclient_id_client_seq;
ALTER TABLE "tclient" ADD COLUMN     "mdp_client" VARCHAR(100) NOT NULL,
ALTER COLUMN "id_client" SET DEFAULT nextval('tclient_id_client_seq');
ALTER SEQUENCE tclient_id_client_seq OWNED BY "tclient"."id_client";

-- AlterTable
CREATE SEQUENCE tcommande_id_seq;
ALTER TABLE "tcommande" ALTER COLUMN "id" SET DEFAULT nextval('tcommande_id_seq'),
DROP COLUMN "type_commande",
ADD COLUMN     "type_commande" "TypeCommande" NOT NULL,
DROP COLUMN "statut_commande",
ADD COLUMN     "statut_commande" "StatutCommande" NOT NULL;
ALTER SEQUENCE tcommande_id_seq OWNED BY "tcommande"."id";

-- AlterTable
CREATE SEQUENCE thoraire_id_seq;
ALTER TABLE "thoraire" ALTER COLUMN "id" SET DEFAULT nextval('thoraire_id_seq');
ALTER SEQUENCE thoraire_id_seq OWNED BY "thoraire"."id";

-- AlterTable
CREATE SEQUENCE tingredient_id_seq;
ALTER TABLE "tingredient" ALTER COLUMN "id" SET DEFAULT nextval('tingredient_id_seq');
ALTER SEQUENCE tingredient_id_seq OWNED BY "tingredient"."id";

-- AlterTable
CREATE SEQUENCE tlignecommande_id_seq;
ALTER TABLE "tlignecommande" ALTER COLUMN "id" SET DEFAULT nextval('tlignecommande_id_seq'),
DROP COLUMN "statut_service",
ADD COLUMN     "statut_service" "StatutService";
ALTER SEQUENCE tlignecommande_id_seq OWNED BY "tlignecommande"."id";

-- AlterTable
CREATE SEQUENCE tnotifcuisine_id_seq;
ALTER TABLE "tnotifcuisine" ALTER COLUMN "id" SET DEFAULT nextval('tnotifcuisine_id_seq');
ALTER SEQUENCE tnotifcuisine_id_seq OWNED BY "tnotifcuisine"."id";

-- AlterTable
CREATE SEQUENCE tpaiement_id_seq;
ALTER TABLE "tpaiement" ALTER COLUMN "id" SET DEFAULT nextval('tpaiement_id_seq'),
DROP COLUMN "methode_paiement",
ADD COLUMN     "methode_paiement" "MethodePaiement",
DROP COLUMN "etat_paiement",
ADD COLUMN     "etat_paiement" "EtatPaiement" NOT NULL;
ALTER SEQUENCE tpaiement_id_seq OWNED BY "tpaiement"."id";

-- AlterTable
CREATE SEQUENCE tpersonnel_id_seq;
ALTER TABLE "tpersonnel" ALTER COLUMN "id" SET DEFAULT nextval('tpersonnel_id_seq'),
DROP COLUMN "role_personnel",
ADD COLUMN     "role_personnel" "Role" NOT NULL;
ALTER SEQUENCE tpersonnel_id_seq OWNED BY "tpersonnel"."id";

-- AlterTable
ALTER TABLE "tplat" ALTER COLUMN "nom_plat" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "tplat_allergene" DROP COLUMN "allergene",
ADD COLUMN     "allergene_id" INTEGER NOT NULL;

-- AlterTable
CREATE SEQUENCE treservation_id_seq;
ALTER TABLE "treservation" ADD COLUMN     "email_client" VARCHAR,
ADD COLUMN     "nom_client" VARCHAR,
ADD COLUMN     "telephone_client" VARCHAR,
ALTER COLUMN "id" SET DEFAULT nextval('treservation_id_seq'),
DROP COLUMN "statut_reservation",
ADD COLUMN     "statut_reservation" "StatutReservation" NOT NULL,
ALTER COLUMN "client_id" DROP NOT NULL;
ALTER SEQUENCE treservation_id_seq OWNED BY "treservation"."id";

-- AlterTable
CREATE SEQUENCE tsessiontable_id_seq;
ALTER TABLE "tsessiontable" ALTER COLUMN "id" SET DEFAULT nextval('tsessiontable_id_seq'),
ALTER COLUMN "date_heure_fin" DROP NOT NULL,
DROP COLUMN "statut_session",
ADD COLUMN     "statut_session" "StatutSession" NOT NULL;
ALTER SEQUENCE tsessiontable_id_seq OWNED BY "tsessiontable"."id";

-- AlterTable
CREATE SEQUENCE tstock_id_seq;
ALTER TABLE "tstock" ALTER COLUMN "id" SET DEFAULT nextval('tstock_id_seq');
ALTER SEQUENCE tstock_id_seq OWNED BY "tstock"."id";

-- AlterTable
CREATE SEQUENCE ttableresto_id_seq;
ALTER TABLE "ttableresto" ADD COLUMN     "est_occupee_par_fusion" BOOLEAN DEFAULT false,
ADD COLUMN     "hauteur" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "largeur" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "orientation" VARCHAR(10),
ADD COLUMN     "pos_x" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pos_y" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" SET DEFAULT nextval('ttableresto_id_seq');
ALTER SEQUENCE ttableresto_id_seq OWNED BY "ttableresto"."id";

-- CreateTable
CREATE TABLE "tallergene" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(50),

    CONSTRAINT "tallergene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tallergene_nom_key" ON "tallergene"("nom");

-- AddForeignKey
ALTER TABLE "tplat_allergene" ADD CONSTRAINT "tplat_allergene_allergene_id_fkey" FOREIGN KEY ("allergene_id") REFERENCES "tallergene"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
