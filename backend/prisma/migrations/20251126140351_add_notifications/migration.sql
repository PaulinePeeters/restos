-- CreateEnum
CREATE TYPE "TypeEvenement" AS ENUM ('PROMOTION', 'EVENEMENT', 'MENU_SPECIAL');

-- AlterTable
ALTER TABLE "tplat" ADD COLUMN     "vegan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vegetarien" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tevenement" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(255),
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "type" "TypeEvenement" NOT NULL DEFAULT 'EVENEMENT',
    "couleur_principale" VARCHAR(20),
    "couleur_secondaire" VARCHAR(20),
    "couleur_texte" VARCHAR(20),
    "motif" VARCHAR(50),
    "font" VARCHAR(50),
    "format" VARCHAR(20) NOT NULL DEFAULT 'CARTE',
    "text_align" VARCHAR(10) NOT NULL DEFAULT 'center',
    "button_style" VARCHAR(20) NOT NULL DEFAULT 'filled',
    "opacity" DECIMAL(3,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "tevenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tevenement_plat" (
    "id" SERIAL NOT NULL,
    "evenement_id" INTEGER NOT NULL,
    "plat_id" INTEGER NOT NULL,

    CONSTRAINT "tevenement_plat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tavis" (
    "id" SERIAL NOT NULL,
    "commande_id" INTEGER NOT NULL,
    "note" INTEGER NOT NULL DEFAULT 5,
    "commentaire" TEXT,
    "date_avis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tavis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tnotification" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "role_destinataire" VARCHAR(20) NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tnotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tavis_commande_id_key" ON "tavis"("commande_id");

-- AddForeignKey
ALTER TABLE "tevenement_plat" ADD CONSTRAINT "tevenement_plat_evenement_id_fkey" FOREIGN KEY ("evenement_id") REFERENCES "tevenement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tevenement_plat" ADD CONSTRAINT "tevenement_plat_plat_id_fkey" FOREIGN KEY ("plat_id") REFERENCES "tplat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tavis" ADD CONSTRAINT "tavis_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "tcommande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
