-- CreateTable
CREATE TABLE "tchequecadeau" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "montant_initial" DECIMAL(10,2) NOT NULL,
    "solde_actuel" DECIMAL(10,2) NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "client_id" INTEGER,

    CONSTRAINT "tchequecadeau_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tchequecadeau_code_key" ON "tchequecadeau"("code");

-- AddForeignKey
ALTER TABLE "tchequecadeau" ADD CONSTRAINT "tchequecadeau_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tclient"("id_client") ON DELETE SET NULL ON UPDATE CASCADE;
