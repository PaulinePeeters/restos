import express from 'express';
import {
    getAllHoraires,
    getHorairesByPersonnel,
    createHoraire,
    updateHoraire,
    deleteHoraire
} from '../controllers/horaires.controller.js';
import { authMiddleware, authorize as requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createHoraireSchema, updateHoraireSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', authMiddleware, requireRole(['manager', 'serveur', 'cuisinier']), getAllHoraires);
router.get('/:id', authMiddleware, requireRole(['manager', 'serveur', 'cuisinier']), getHorairesByPersonnel);
router.post('/', authMiddleware, requireRole(['manager']), validate(createHoraireSchema), createHoraire);
router.put('/:id', authMiddleware, requireRole(['manager']), validate(updateHoraireSchema), updateHoraire);
router.delete('/:id', authMiddleware, requireRole(['manager']), deleteHoraire);

export default router;
