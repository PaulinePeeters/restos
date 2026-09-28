import express from 'express';
import {
    creerCommande,
    getCommandesCuisine,
    getCommandesActives,
    addPaiement,
    annulerCommande,
    appliquerReduction,
    validerPaiementEnLigne,
    refuserPaiementEnLigne,
    payerParChequeCadeau,
    updateLigneStatut,
    updateCommandeStatut,
    getLivraisons,
    modifyCommandeLines
} from '../controllers/commandes.controller.js';
import { authMiddleware, optionalAuthMiddleware, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
    createCommandeSchema,
    addPaiementSchema,
    annulerCommandeSchema,
    reductionSchema,
    updateStatutCmdSchema,
    updateStatutLigneSchema,
    chequeCadeauPaymentSchema
} from '../utils/schemas.js';

const router = express.Router();

router.post('/', optionalAuthMiddleware, validate(createCommandeSchema), creerCommande);

// Réservé au personnel
router.get('/cuisine', authMiddleware, authorize(['cuisinier', 'serveur', 'manager']), getCommandesCuisine);

// Commandes actives pour manager/serveur (Caisse et CommandesEnCours)
router.get('/actives', authMiddleware, authorize(['serveur', 'manager']), getCommandesActives);

// Réservé aux livreurs et managers
router.get('/livraisons', authMiddleware, authorize(['livreur', 'manager']), getLivraisons);

// Réservées au personnel
router.post('/:id/paiement', authMiddleware, authorize(['serveur', 'manager']), validate(addPaiementSchema), addPaiement);
router.post('/:id/annuler', authMiddleware, authorize(['manager']), validate(annulerCommandeSchema), annulerCommande);
router.post('/:id/reduction', authMiddleware, authorize(['manager']), validate(reductionSchema), appliquerReduction);

router.post('/:id/valider-paiement', authMiddleware, authorize(['serveur', 'manager']), validerPaiementEnLigne);
router.post('/:id/refuser-paiement', authMiddleware, authorize(['serveur', 'manager']), refuserPaiementEnLigne);

// Paiement par chèque cadeau
router.post('/:id/paiement-cheque', authMiddleware, authorize(['serveur', 'manager']), validate(chequeCadeauPaymentSchema), payerParChequeCadeau);

// Mise à jour statut ligne 
router.post('/ligne/:id/statut', authMiddleware, authorize(['cuisinier', 'barman', 'manager', 'serveur']), validate(updateStatutLigneSchema), updateLigneStatut);

// Mise à jour statut global commande 
router.put('/:id/statut', authMiddleware, authorize(['manager', 'livreur']), validate(updateStatutCmdSchema), updateCommandeStatut);

// Modification des lignes d'une commande
router.put('/:id/lignes', authMiddleware, authorize(['manager', 'serveur']), modifyCommandeLines);

export default router;
