-- DropForeignKey
ALTER TABLE "tabsencepersonnel" DROP CONSTRAINT "tabsencepersonnel_personnel_id_fkey";

-- DropForeignKey
ALTER TABLE "thoraire" DROP CONSTRAINT "thoraire_personnel_id_fkey";

-- DropForeignKey
ALTER TABLE "tnotifcuisine" DROP CONSTRAINT "tnotifcuisine_ligne_commande_id_fkey";

-- DropForeignKey
ALTER TABLE "tplat_allergene" DROP CONSTRAINT "tplat_allergene_allergene_id_fkey";

-- DropForeignKey
ALTER TABLE "tplat_allergene" DROP CONSTRAINT "tplat_allergene_plat_id_fkey";

-- DropForeignKey
ALTER TABLE "tplat_ingredient" DROP CONSTRAINT "tplat_ingredient_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "tplat_ingredient" DROP CONSTRAINT "tplat_ingredient_plat_id_fkey";

-- DropForeignKey
ALTER TABLE "tpointage" DROP CONSTRAINT "tpointage_personnel_id_fkey";

-- AlterTable
ALTER TABLE "tcategorieplat" ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tclient" ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ttableresto" ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "tabsencepersonnel" ADD CONSTRAINT "tabsencepersonnel_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "tpersonnel"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "thoraire" ADD CONSTRAINT "thoraire_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "tpersonnel"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tnotifcuisine" ADD CONSTRAINT "tnotifcuisine_ligne_commande_id_fkey" FOREIGN KEY ("ligne_commande_id") REFERENCES "tlignecommande"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tpointage" ADD CONSTRAINT "tpointage_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "tpersonnel"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat_allergene" ADD CONSTRAINT "tplat_allergene_allergene_id_fkey" FOREIGN KEY ("allergene_id") REFERENCES "tallergene"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat_allergene" ADD CONSTRAINT "tplat_allergene_plat_id_fkey" FOREIGN KEY ("plat_id") REFERENCES "tplat"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat_ingredient" ADD CONSTRAINT "tplat_ingredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "tingredient"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat_ingredient" ADD CONSTRAINT "tplat_ingredient_plat_id_fkey" FOREIGN KEY ("plat_id") REFERENCES "tplat"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
