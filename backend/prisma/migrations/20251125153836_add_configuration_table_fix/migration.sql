-- CreateTable
CREATE TABLE "tconfiguration" (
    "id" SERIAL NOT NULL,
    "cle" VARCHAR(50) NOT NULL,
    "valeur" TEXT,
    "description" VARCHAR(255),

    CONSTRAINT "tconfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tconfiguration_cle_key" ON "tconfiguration"("cle");
