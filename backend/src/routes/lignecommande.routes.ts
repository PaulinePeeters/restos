import express from 'express';
import { updateLigneCommandeController } from '../controllers/lignecommande.controller.js';
import { authMiddleware, authorize as requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { updateStatutLigneSchema } from '../utils/schemas.js';

const router = express.Router();

router.put('/:id', authMiddleware, requireRole(['manager', 'serveur', 'cuisinier', 'barman']), validate(updateStatutLigneSchema), updateLigneCommandeController);

export default router;
