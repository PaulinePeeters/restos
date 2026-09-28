import { z } from 'zod';

/**
 * Schema de validation pour le login d'un client.
 */
export const loginSchema = z.object({
    email_client: z.string().email("Format d'email invalide"),
    mot_de_passe: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères")
});

/**
 * Schema de validation pour le login d'un personnel.
 */
export const personnelLoginSchema = z.object({
    email_personnel: z.string().email("Format d'email invalide"),
    mot_de_passe: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères")
});

/**
 * Schema de validation pour l'inscription d'un client.
 */
export const registerClientSchema = z.object({
    nom_client: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email_client: z.string().email("Format d'email invalide"),
    tel_client: z.string().optional(),
    entreprise: z.string().optional(),
    tva: z.string().optional(),
    mot_de_passe: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    adresse: z.object({
        rue: z.string(),
        numero: z.string(),
        cp: z.string(),
        ville: z.string()
    })
});

/**
 * Schema de validation pour la mise à jour du profil client.
 */
export const updateProfileSchema = z.object({
    nom_client: z.string().min(2).optional(),
    tel_client: z.string().optional(),
    entreprise: z.string().optional(),
    tva: z.string().optional()
});

/**
 * Schema de validation pour la création d'un membre du personnel.
 */
export const createPersonnelSchema = z.object({
    nom_personnel: z.string().min(2),
    prenom_personnel: z.string().min(2),
    email_personnel: z.string().email(),
    mdp_personnel: z.string().min(6),
    role_personnel: z.enum(['super_admin', 'manager', 'serveur', 'cuisinier', 'livreur', 'barman']),
    actif: z.boolean().optional().default(true)
});

/**
 * Schema de validation pour la création d'une absence.
 */
export const createAbsenceSchema = z.object({
    personnel_id: z.coerce.number().positive("ID Personnel invalide"),
    date_debut: z.coerce.date(),
    date_fin: z.coerce.date(),
    motif_absence: z.string().optional(),
    type_conge_id: z.coerce.number().optional(),
    justificatif_url: z.string().optional()
});

/**
 * Schema de validation pour la mise à jour d'une absence.
 */
export const updateAbsenceSchema = z.object({
    statut: z.enum(['EN_ATTENTE', 'VALIDEE', 'REFUSEE']),
});

/**
 * Schema de validation pour la création d'un avis.
 */
export const createAvisSchema = z.object({
    commandeId: z.coerce.number().positive("ID Commande invalide"),
    note: z.coerce.number().min(1).max(5),
    commentaire: z.string().optional()
});

/**
 * Schema de validation pour la création d'une catégorie.
 */
export const createCategorySchema = z.object({
    nom_categorie: z.string().min(1, "Le nom de la catégorie est requis"),
    parent_id: z.coerce.number().optional().nullable()
});

export const updateCategorySchema = createCategorySchema.partial();

/**
 * Schema de validation pour la création d'un chèque cadeau.
 */
export const createChequeSchema = z.object({
    montant: z.coerce.number().min(1, "Le montant doit être valide et positif"),
    date_expiration: z.coerce.date(),
    client_id: z.coerce.number().optional().nullable()
});

/**
 * Schema de validation pour l'utilisation/validation d'un chèque.
 */
export const validateChequeSchema = z.object({
    code: z.string().min(5, "Code invalide")
});

export const useChequeSchema = z.object({
    code: z.string().min(5, "Code invalide"),
    montant: z.coerce.number().min(0.01, "Le montant à utiliser doit être positif")
});

/**
 * Schema pour la mise à jour de l'adresse d'un client.
 */
export const updateClientAddressSchema = z.object({
    rue: z.string().min(1, "La rue est requise"),
    numero: z.string().min(1, "Le numéro est requis"),
    cp: z.string().min(1, "Le code postal est requis"),
    ville: z.string().min(1, "La ville est requise")
});

/**
 * Schemas pour les Commandes
 */
export const createCommandeSchema = z.object({
    client_id: z.coerce.number().optional().nullable(),
    type_commande: z.enum(['SUR_PLACE', 'A_EMPORTER', 'LIVRAISON']).optional(),
    mode_paiement: z.enum(['SUR_PLACE', 'EN_LIGNE', 'ESPECES', 'CB', 'CHEQUE_CADEAU', 'TICKET_RESTO', 'BANCONTACT', 'PAYCONIQ', 'PAYPAL']).optional(),
    items: z.array(z.object({
        id: z.coerce.number(),
        quantite: z.coerce.number().min(1),
        commentaire: z.string().nullable().optional(),
        cuisson: z.string().nullable().optional(),
        format: z.string().nullable().optional(),
        restrictions_alimentaires: z.array(z.string()).nullable().optional()
    })).min(1, "La commande doit contenir au moins un article"),
    commentaire_global: z.string().optional(),
    table_id: z.coerce.number().optional().nullable(),
    session_table_id: z.coerce.number().optional().nullable(),
    date_heure_souhaitee: z.coerce.date().optional().nullable(),
    pourboire: z.coerce.number().min(0).optional(),
    adresse: z.object({
        rue: z.string(),
        ville: z.string(),
        codePostal: z.string()
    }).optional().nullable(),
    tel_livraison: z.string().optional().nullable()
});

export const addPaiementSchema = z.object({
    montant: z.coerce.number().min(0.01, "Le montant doit être positif"),
    methode: z.string().min(1, "Méthode requise"),
    pourboire: z.coerce.number().min(0).optional()
});

export const annulerCommandeSchema = z.object({
    justification: z.string().min(1, "Justification requise")
});

export const reductionSchema = z.object({
    type: z.enum(['POURCENTAGE', 'MONTANT', 'OFFERT']),
    valeur: z.coerce.number().min(0, "La valeur doit être positive"),
    isPourcentage: z.boolean().optional()
});

export const updateStatutCmdSchema = z.object({
    statut: z.enum(['EN_ATTENTE', 'EN_PREPARATION', 'PRET', 'SERVIE', 'LIVREE', 'TERMINEE', 'ANNULEE'])
});

export const updateStatutLigneSchema = z.object({
    statut: z.enum(['EN_ATTENTE', 'EN_PREPARATION', 'PRET', 'SERVIE', 'ANNULEE']).optional(),
    est_offert: z.boolean().optional(),
    raison_offert: z.string().optional(),
    est_annule: z.boolean().optional(),
    raison_annulation: z.string().optional()
});

export const chequeCadeauPaymentSchema = z.object({
    code: z.string().min(5, "Code requis")
});

/**
 * Schemas pour la Configuration
 */
export const updateConfigSchema = z.object({
    cle: z.string().min(1, "Clé requise"),
    valeur: z.string()
});

export const updateConfigsSchema = z.array(z.object({
    cle: z.string().min(1, "Clé requise"),
    valeur: z.string()
})).min(1, "Au moins une configuration requise");

/**
 * Schemas pour les Événements
 */
export const createEventSchema = z.object({
    titre: z.string().min(1, "Titre requis"),
    description: z.string().optional(),
    date_debut: z.coerce.date(),
    date_fin: z.coerce.date(),
    type: z.enum(['EVENEMENT', 'OFFRE', 'MENU_SPECIAL']).optional(),
    actif: z.union([
        z.boolean(),
        z.string().transform(val => val === 'true')
    ]).optional().default(true),
    couleur_principale: z.string().optional(),
    couleur_secondaire: z.string().optional(),
    couleur_texte: z.string().optional(),
    motif: z.string().optional(),
    font: z.string().optional(),
    format: z.string().optional(),
    text_align: z.string().optional(),
    button_style: z.string().optional(),
    opacity: z.coerce.number().optional(),
    plats_ids: z.string().optional().transform((val) => {
        if (!val) return [];
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed.map(Number) : [];
        } catch {
            return [];
        }
    })
});

export const updateEventSchema = createEventSchema.partial();

/**
 * Schemas pour les Exports
 */
export const exportQuerySchema = z.object({
    date: z.string().optional().transform((val) => {
        if (!val) return new Date();
        const date = new Date(val);
        return isNaN(date.getTime()) ? new Date() : date;
    }).or(z.date().optional().default(() => new Date()))
});

/**
 * Schemas pour la Fidélité
 */
export const createOffreSchema = z.object({
    titre: z.string().min(1, "Titre requis"),
    description: z.string().optional(),
    date_debut: z.coerce.date(),
    date_fin: z.coerce.date(),
    pourcentage_reduction: z.coerce.number().min(0).max(100),
    type: z.literal('PROMOTION').default('PROMOTION'),
    actif: z.boolean().default(true)
});

/**
 * Schemas pour les Horaires
 */
export const createHoraireSchema = z.object({
    personnel_id: z.coerce.number().positive(),
    jour_horaire: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format invalide (YYYY-MM-DD)"),
    heure_debut: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)"),
    heure_fin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)")
});

export const updateHoraireSchema = createHoraireSchema.partial();

/**
 * Schemas pour les Ingrédients
 */
export const createIngredientSchema = z.object({
    nom_ingredient: z.string().min(1, "Nom requis"),
    unite_ingredient: z.string().min(1, "Unité requise"),
    cout_unitaire: z.coerce.number().min(0).default(0),
    stock_actuel: z.coerce.number().min(0).default(0),
    seuil_alerte: z.coerce.number().min(0).default(10)
});

export const updateIngredientSchema = createIngredientSchema.partial();

/**
 * Schemas pour les Notifications
 */
export const createNotificationSchema = z.object({
    type: z.string().optional().default('MESSAGE'),
    message: z.string().min(1, "Message requis"),
    role: z.enum(['manager', 'serveur', 'cuisinier', 'livreur', 'barman']),
    data: z.any().optional()
});

export const markNotificationReadSchema = z.object({
    role: z.enum(['manager', 'serveur', 'cuisinier', 'livreur', 'barman']).optional()
});

/**
 * Schemas pour les Plats (Gestion FormData)
 */
const jsonTransform = (val: unknown) => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch {
            return [];
        }
    }
    return val;
};

const basePlatSchema = z.object({
    nom: z.string().min(1, "Nom requis"),
    nom_plat_en: z.string().optional(),
    nom_plat_nl: z.string().optional(),
    description: z.string().optional(),
    description_plat_en: z.string().optional(),
    description_plat_nl: z.string().optional(),
    prix: z.coerce.number().min(0),
    categorie: z.coerce.number().positive().optional(),
    categorie_id: z.coerce.number().positive().optional(),
    disponible: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional().default(true),
    vegan: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional().default(false),
    vegetarien: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional().default(false),
    cuisson_possible: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional().default(false),
    peut_choisir_cuisson: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional().default(false),
    ingredients: z.preprocess(jsonTransform, z.array(z.object({
        ingredient_id: z.coerce.number(),
        qt_utilisee: z.coerce.number()
    })).optional().default([])),
    allergenes: z.preprocess(jsonTransform, z.array(z.coerce.number()).optional().default([])),
    formats: z.preprocess(jsonTransform, z.array(z.object({
        nom: z.string(),
        prix: z.coerce.number()
    })).optional().default([]))
});

export const createPlatSchema = basePlatSchema.refine(data => data.categorie || data.categorie_id, {
    message: "La catégorie est requise",
    path: ["categorie"]
});

export const updatePlatSchema = basePlatSchema.partial();

export const splitBillSchema = z.object({
    type: z.enum(['EQUAL', 'ITEM']),
    nbPersonnes: z.coerce.number().min(1).optional(),
    itemsSelected: z.array(z.coerce.number().or(z.string())).optional()
});

/**
 * Schemas pour le Pointage
 */
export const createPointageSchema = z.object({
    personnel_id: z.coerce.number().positive("ID Personnel invalide"),
    date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.date()),
    heure_debut: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{2}:\d{2}$/)).or(z.date())
});

export const updatePointageSchema = z.object({
    heure_fin: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{2}:\d{2}$/)).or(z.date()).optional(),
    pause_minutes: z.coerce.number().min(0).optional(),
    statut: z.enum(['EN_ATTENTE', 'VALIDEE', 'REFUSEE']).optional()
});

export const validatePointageSchema = z.object({
    validated: z.boolean()
});

/**
 * Schemas pour les Réservations
 */
export const createReservationSchema = z.object({
    client_id: z.coerce.number().optional().nullable(),
    nom_client: z.string().optional(),
    email_client: z.string().email().optional().or(z.literal('')),
    telephone_client: z.string().optional(),
    date_reservation: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format date invalide (YYYY-MM-DD)"),
    heure_reservation: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format heure invalide (HH:MM)"),
    nb_personnes: z.coerce.number().min(1, "Au moins 1 personne"),
    table_id: z.coerce.number().positive("ID Table invalide"),
    commentaire_reservation: z.string().optional()
});

export const updateReservationSchema = createReservationSchema.partial().extend({
    statut_reservation: z.enum(['EN_ATTENTE', 'CONFIRMEE', 'ARRIVEE', 'REFUSEE', 'ANNULEE', 'TERMINEE', 'NON_PRESENT']).optional()
});

/**
 * Schemas pour les Sessions
 */
export const createSessionSchema = z.object({
    table_id: z.coerce.number().positive("ID Table invalide")
});

export const closeSessionSchema = z.object({
    session_id: z.coerce.number().positive("ID Session invalide")
});

/**
 * Schema pour initialiser le stock d'un ingrédient.
 * Correspond au controller stock.controller.ts (createStock).
 */
export const createStockSchema = z.object({
    ingredient_id: z.coerce.number().positive("ID Ingrédient invalide"),
    qt_dispo: z.coerce.number().min(0, "La quantité ne peut pas être négative"),
    seuil_alerte: z.coerce.number().min(0, "Le seuil ne peut pas être négatif")
});

/**
 * Schema pour la mise à jour de la quantité en stock.
 */
export const updateStockSchema = z.object({
    stock_actuel: z.coerce.number().min(0).optional(),
    qt_dispo: z.coerce.number().min(0).optional()
});

/**
 * Schemas pour les Tables
 */
export const fusionnerTablesSchema = z.object({
    mainTableId: z.coerce.number().positive("ID table principale invalide"),
    tablesToMergeIds: z.array(z.coerce.number().positive()).min(1, "Au moins une table à fusionner")
});

export const defusionnerTablesSchema = z.object({
    mainTableId: z.coerce.number().positive("ID table principale invalide")
});

/**
 * Schema pour la traduction de texte.
 */
export const translateSchema = z.object({
    text: z.string().min(1, "Le texte à traduire est requis").max(5000, "Le texte ne peut pas dépasser 5000 caractères"),
    source: z.string().length(2).toLowerCase().optional().default('fr'),
    target: z.string().length(2).toLowerCase().optional().default('en')
});
