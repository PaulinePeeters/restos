-- AlterTable
ALTER TABLE "tlignecommande" ADD COLUMN     "format" VARCHAR(50);

-- CreateTable
CREATE TABLE "tplat_format" (
    "id" SERIAL NOT NULL,
    "plat_id" INTEGER NOT NULL,
    "nom_format" VARCHAR(50) NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "tplat_format_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tplat_format" ADD CONSTRAINT "tplat_format_plat_id_fkey" FOREIGN KEY ("plat_id") REFERENCES "tplat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
