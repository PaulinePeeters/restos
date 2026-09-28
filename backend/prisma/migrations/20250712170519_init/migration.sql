-- CreateTable
CREATE TABLE "tabsencepersonnel" (
    "id" INTEGER NOT NULL,
    "personnel_id" INTEGER NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "motif_absence" VARCHAR(100),
    "valide" BOOLEAN DEFAULT false,

    CONSTRAINT "tabsencepersonnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tadresselivraison" (
    "id" INTEGER NOT NULL,
    "rue_adresse" VARCHAR(50) NOT NULL,
    "numero_adresse" VARCHAR(10) NOT NULL,
    "cp_adresse" VARCHAR(10) NOT NULL,
    "ville_adresse" VARCHAR(50) NOT NULL,
    "pays_adresse" VARCHAR(50) NOT NULL,
    "est_par_defaut" BOOLEAN,
    "client_id" INTEGER NOT NULL,

    CONSTRAINT "tadresselivraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tcategorieplat" (
    "id" INTEGER NOT NULL,
    "nom_categorie" VARCHAR(50) NOT NULL,

    CONSTRAINT "tcategorieplat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tclient" (
    "id_client" INTEGER NOT NULL,
    "nom_client" VARCHAR(50) NOT NULL,
    "email_client" VARCHAR(50) NOT NULL,
    "tel_client" VARCHAR(20),
    "date_creation_client" DATE NOT NULL,

    CONSTRAINT "tclient_pkey" PRIMARY KEY ("id_client")
);

-- CreateTable
CREATE TABLE "tcommande" (
    "id" INTEGER NOT NULL,
    "date_heure_commande" TIMESTAMP(6) NOT NULL,
    "type_commande" VARCHAR(50) NOT NULL,
    "statut_commande" VARCHAR(50) NOT NULL,
    "commentaire_global" TEXT,
    "total_estime_commande" DECIMAL(10,2) NOT NULL,
    "session_table_id" INTEGER,
    "client_id" INTEGER,

    CONSTRAINT "tcommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thoraire" (
    "id" INTEGER NOT NULL,
    "personnel_id" INTEGER NOT NULL,
    "jour_horaire" VARCHAR(20) NOT NULL,
    "heure_debut" TIME(6) NOT NULL,
    "heure_fin" TIME(6) NOT NULL,

    CONSTRAINT "thoraire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tingredient" (
    "id" INTEGER NOT NULL,
    "nom_ingredient" VARCHAR(50) NOT NULL,
    "unite_ingredient" VARCHAR(20) NOT NULL,

    CONSTRAINT "tingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tlignecommande" (
    "id" INTEGER NOT NULL,
    "commande_id" INTEGER NOT NULL,
    "plat_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "commentaire" TEXT,
    "categorie_service" VARCHAR(50),
    "ordre_service" INTEGER,
    "statut_service" VARCHAR(50),

    CONSTRAINT "tlignecommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tnotifcuisine" (
    "id" INTEGER NOT NULL,
    "ligne_commande_id" INTEGER NOT NULL,
    "date_heure_envoi" TIMESTAMP(6) NOT NULL,
    "statut" VARCHAR(50) NOT NULL,

    CONSTRAINT "tnotifcuisine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tpaiement" (
    "id" INTEGER NOT NULL,
    "commande_id" INTEGER NOT NULL,
    "montant_paiement" DECIMAL(10,2) NOT NULL,
    "date_paiement" TIMESTAMP(6) NOT NULL,
    "methode_paiement" VARCHAR(50),
    "etat_paiement" VARCHAR(50) NOT NULL,
    "transaction_id" VARCHAR(50),

    CONSTRAINT "tpaiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tpersonnel" (
    "id" INTEGER NOT NULL,
    "nom_personnel" VARCHAR(50) NOT NULL,
    "prenom_personnel" VARCHAR(50) NOT NULL,
    "email_personnel" VARCHAR(50) NOT NULL,
    "mdp_personnel" VARCHAR(100) NOT NULL,
    "role_personnel" VARCHAR(50) NOT NULL,
    "actif" BOOLEAN NOT NULL,

    CONSTRAINT "tpersonnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tplat" (
    "id" SERIAL NOT NULL,
    "nom_plat" VARCHAR(50) NOT NULL,
    "description_plat" TEXT,
    "prix_plat" DECIMAL(10,2) NOT NULL,
    "disponible" BOOLEAN NOT NULL,
    "categorie_id" INTEGER NOT NULL,

    CONSTRAINT "tplat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tplat_allergene" (
    "id" SERIAL NOT NULL,
    "plat_id" INTEGER NOT NULL,
    "allergene" VARCHAR(50) NOT NULL,

    CONSTRAINT "tplat_allergene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tplat_ingredient" (
    "id" SERIAL NOT NULL,
    "plat_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "qt_utilisee" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "tplat_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treservation" (
    "id" INTEGER NOT NULL,
    "date_reservation" DATE NOT NULL,
    "heure_reservation" TIME(6) NOT NULL,
    "nb_personnes" INTEGER NOT NULL,
    "commentaire_reservation" TEXT,
    "statut_reservation" VARCHAR(50) NOT NULL,
    "client_id" INTEGER NOT NULL,
    "table_id" INTEGER NOT NULL,

    CONSTRAINT "treservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tsessiontable" (
    "id" INTEGER NOT NULL,
    "date_heure_debut" TIMESTAMP(6) NOT NULL,
    "date_heure_fin" TIMESTAMP(6) NOT NULL,
    "statut_session" VARCHAR(50) NOT NULL,
    "table_id" INTEGER NOT NULL,
    "serveur_id" INTEGER,

    CONSTRAINT "tsessiontable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tstock" (
    "id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "qt_dispo" DECIMAL(10,2) NOT NULL,
    "seuil_alerte" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "tstock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ttableresto" (
    "id" INTEGER NOT NULL,
    "numero_table" VARCHAR(10) NOT NULL,
    "capacite_table" INTEGER NOT NULL,
    "est_fusionnee" BOOLEAN DEFAULT false,
    "tables_fusionnees" VARCHAR(50),

    CONSTRAINT "ttableresto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tabsencepersonnel" ADD CONSTRAINT "tabsencepersonnel_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "tpersonnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tadresselivraison" ADD CONSTRAINT "tadresselivraison_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tclient"("id_client") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tcommande" ADD CONSTRAINT "tcommande_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tclient"("id_client") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tcommande" ADD CONSTRAINT "tcommande_session_table_id_fkey" FOREIGN KEY ("session_table_id") REFERENCES "tsessiontable"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "thoraire" ADD CONSTRAINT "thoraire_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "tpersonnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tlignecommande" ADD CONSTRAINT "tlignecommande_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "tcommande"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tlignecommande" ADD CONSTRAINT "tlignecommande_plat_id_fkey" FOREIGN KEY ("plat_id") REFERENCES "tplat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tnotifcuisine" ADD CONSTRAINT "tnotifcuisine_ligne_commande_id_fkey" FOREIGN KEY ("ligne_commande_id") REFERENCES "tlignecommande"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tpaiement" ADD CONSTRAINT "tpaiement_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "tcommande"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat" ADD CONSTRAINT "tplat_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "tcategorieplat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat_allergene" ADD CONSTRAINT "tplat_allergene_plat_id_fkey" FOREIGN KEY ("plat_id") REFERENCES "tplat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat_ingredient" ADD CONSTRAINT "tplat_ingredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "tingredient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tplat_ingredient" ADD CONSTRAINT "tplat_ingredient_plat_id_fkey" FOREIGN KEY ("plat_id") REFERENCES "tplat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treservation" ADD CONSTRAINT "treservation_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tclient"("id_client") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treservation" ADD CONSTRAINT "treservation_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "ttableresto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tsessiontable" ADD CONSTRAINT "tsessiontable_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "ttableresto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tstock" ADD CONSTRAINT "tstock_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "tingredient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
