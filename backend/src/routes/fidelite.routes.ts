import express from 'express';
import { getOffres, getFavoriteTable, createOffre, deleteOffre, getAllOffres, notifyClientsEvent, toggleVip } from '../controllers/fidelite.controller.js';
import { authMiddleware, authorize as requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createOffreSchema } from '../utils/schemas.js';

const router = express.Router();

// Routes publiques (ou client)
router.get('/offres', getOffres);

// Routes Staff/Manager
router.get('/offres/all', authMiddleware, requireRole(['manager', 'serveur']), getAllOffres);
router.post('/offres', authMiddleware, requireRole(['manager']), validate(createOffreSchema), createOffre);
router.delete('/offres/:id', authMiddleware, requireRole(['manager']), deleteOffre);
router.post('/offres/:id/broadcast', authMiddleware, requireRole(['manager']), notifyClientsEvent);

router.get('/favorite-table', authMiddleware, getFavoriteTable);

// Routes VIP
router.put('/clients/:id/vip', authMiddleware, requireRole(['manager']), toggleVip);

export default router;
